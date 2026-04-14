from rest_framework import viewsets, filters, status
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import UserRateThrottle
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db import transaction
from django.db.models import Sum
import logging, csv, io
from .models import Order, OrderItem, DeliveryDriver
from .serializers import OrderSerializer, OrderItemSerializer, OrderCreateSerializer
from apps.inventory.models import Stock
from apps.customers.models import Customer
from apps.products.models import Product

logger = logging.getLogger(__name__)


class OrderRateThrottle(UserRateThrottle):
    scope = 'order'


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.select_related('customer').prefetch_related('items__product').all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['customer', 'payment_status', 'delivery_status']
    search_fields = ['customer__shop_name', 'customer__owner_name']
    ordering_fields = ['order_date', 'total_amount']

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return Order.objects.select_related('customer').prefetch_related('items__product').all()
        try:
            customer = user.customer_profile
            return Order.objects.filter(customer=customer).select_related('customer').prefetch_related('items__product')
        except Customer.DoesNotExist:
            return Order.objects.none()

    def get_serializer_class(self):
        if self.action == 'create':
            return OrderCreateSerializer
        return OrderSerializer

    def perform_create(self, serializer):
        with transaction.atomic():
            order = serializer.save()
            for item in order.items.all():
                stock = (
                    Stock.objects
                    .filter(product=item.product)
                    .order_by('-total_crates', '-total_bottles')
                    .select_for_update()
                    .first()
                )
                if stock:
                    stock.update_stock(
                        crates=-item.quantity_crates,
                        bottles=-item.quantity_bottles
                    )

    @action(detail=True, methods=['post'])
    def update_payment_status(self, request, pk=None):
        order = self.get_object()
        payment_status = request.data.get('payment_status')
        if payment_status in dict(Order.PAYMENT_STATUS_CHOICES):
            order.payment_status = payment_status
            order.save()
            return Response({'status': 'Payment status updated'})
        return Response({'error': 'Invalid payment status'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def update_delivery_status(self, request, pk=None):
        order = self.get_object()
        delivery_status = request.data.get('delivery_status')
        delivery_vehicle = request.data.get('delivery_vehicle')
        delivery_driver = request.data.get('delivery_driver')
        delivery_notes = request.data.get('delivery_notes')

        if delivery_status in dict(Order.DELIVERY_STATUS_CHOICES):
            order.delivery_status = delivery_status
            if delivery_vehicle:
                order.delivery_vehicle = delivery_vehicle
            if delivery_driver:
                order.delivery_driver = delivery_driver
            if delivery_notes:
                order.delivery_notes = delivery_notes
            if delivery_status == 'Delivered':
                order.actual_delivery = timezone.now()
            order.save()
            # Push in-app notification to customer
            _notify_customer_status_change(order, delivery_status)
            return Response({'status': 'Delivery status updated'})
        return Response({'error': 'Invalid delivery status'}, status=status.HTTP_400_BAD_REQUEST)


class OrderItemViewSet(viewsets.ModelViewSet):
    queryset = OrderItem.objects.select_related('order', 'product').all()
    serializer_class = OrderItemSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['order', 'product']


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_create_order(request):
    """
    POST /api/orders/admin/create/
    Admin creates an order for any customer.
    """
    if not (request.user.is_staff or request.user.is_superuser):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    customer_id = request.data.get('customer_id')
    items_data  = request.data.get('items', [])
    pay_status  = request.data.get('payment_status', 'Pending')

    if not customer_id:
        return Response({'error': 'customer_id is required'}, status=status.HTTP_400_BAD_REQUEST)
    if not items_data:
        return Response({'error': 'No items provided'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        customer = Customer.objects.get(id=customer_id)
    except Customer.DoesNotExist:
        return Response({'error': 'Customer not found'}, status=status.HTTP_404_NOT_FOUND)

    try:
        with transaction.atomic():
            order = Order.objects.create(
                customer=customer,
                delivery_status='Order Placed',
                payment_status=pay_status,
            )
            total_amount = 0
            for item_data in items_data:
                product_id = item_data.get('product_id')
                quantity   = int(item_data.get('quantity', 0))
                if not product_id or quantity <= 0:
                    continue
                product = Product.objects.get(id=product_id)
                crate_size = product.crate_size
                quantity_crates  = quantity // crate_size
                quantity_bottles = quantity % crate_size
                OrderItem.objects.create(
                    order=order, product=product,
                    quantity_crates=quantity_crates,
                    quantity_bottles=quantity_bottles,
                    price=product.rate_per_bottle,
                )
                try:
                    stock = Stock.objects.select_for_update().get(product=product)
                    stock.update_stock(crates=-quantity_crates, bottles=-quantity_bottles)
                except Stock.DoesNotExist:
                    pass
                total_amount += quantity * float(product.rate_per_bottle)
            order.total_amount = total_amount
            order.save()
    except Product.DoesNotExist as e:
        return Response({'error': f'Product not found: {e}'}, status=status.HTTP_404_NOT_FOUND)

    try:
        from apps.audit.utils import log_action
        log_action(request, 'CREATE', f'Admin created Order #{order.id} for {customer.shop_name}, total ₹{total_amount:.0f}', 'Order', order.id)
    except Exception:
        pass

    serializer = OrderSerializer(order)
    return Response({'message': 'Order created!', 'order': serializer.data}, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([OrderRateThrottle])
def create_customer_order(request):
    """
    POST /api/orders/customer/create/
    Customer places an order. Sends order notification (WA/SMS/email) to customer & admin.
    """
    user = request.user

    try:
        customer = user.customer_profile
    except Customer.DoesNotExist:
        phone = getattr(user, 'phone', None) or f"9{user.id:09d}"
        customer, _ = Customer.objects.get_or_create(
            user=user,
            defaults=dict(
                shop_name=f"{user.get_full_name() or user.username}'s Shop",
                owner_name=user.get_full_name() or user.username,
                phone=phone,
                address='Address not set',
                village='',
                credit_limit=50000,
            )
        )

    items_data = request.data.get('items', [])
    if not items_data:
        return Response({'error': 'No items in cart'}, status=status.HTTP_400_BAD_REQUEST)

    # Pre-calculate order total for credit check
    order_total = 0
    for item_data in items_data:
        try:
            prod = Product.objects.get(id=item_data.get('product_id'))
            order_total += int(item_data.get('quantity', 0)) * float(prod.rate_per_bottle)
        except Product.DoesNotExist:
            pass

    try:
        with transaction.atomic():
            customer = Customer.objects.select_for_update().get(pk=customer.pk)

            outstanding = Order.objects.filter(
                customer=customer
            ).exclude(payment_status='Paid').aggregate(total=Sum('total_amount'))['total'] or 0

            credit_limit    = float(customer.credit_limit or 0)
            available_credit = credit_limit - float(outstanding)

            if credit_limit > 0 and order_total > available_credit:
                return Response({
                    'error': (
                        f'Order amount ₹{order_total:.0f} exceeds your available credit of ₹{available_credit:.0f}. '
                        f'Please clear outstanding dues of ₹{float(outstanding):.0f} first.'
                    ),
                    'credit_limit':    credit_limit,
                    'outstanding':     float(outstanding),
                    'available_credit': available_credit,
                    'order_total':     order_total,
                }, status=status.HTTP_400_BAD_REQUEST)

            order = Order.objects.create(customer=customer, delivery_status='Order Placed')
            total_amount = 0

            for item_data in items_data:
                product_id = item_data.get('product_id')
                quantity   = item_data.get('quantity', 0)
                product    = Product.objects.get(id=product_id)

                if product.expiry_date and product.expiry_date < timezone.now().date():
                    raise ValueError(f'{product.product_name} is expired and cannot be ordered.')

                crate_size       = product.crate_size
                quantity_crates  = quantity // crate_size
                quantity_bottles = quantity % crate_size

                OrderItem.objects.create(
                    order=order, product=product,
                    quantity_crates=quantity_crates,
                    quantity_bottles=quantity_bottles,
                    price=product.rate_per_bottle,
                )

                try:
                    stock = Stock.objects.select_for_update().get(product=product)
                    stock.update_stock(crates=-quantity_crates, bottles=-quantity_bottles)
                except Stock.DoesNotExist:
                    pass

                total_amount += quantity * float(product.rate_per_bottle)

            order.total_amount = total_amount
            order.save()

    except Product.DoesNotExist as e:
        return Response({'error': f'Product not found: {e}'}, status=status.HTTP_404_NOT_FOUND)
    except ValueError as ve:
        return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)

    # ── Notifications (outside atomic — non-critical) ──────────────────────
    # Order placed → customer (WA/SMS/email) + admin (WA/SMS/email)
    try:
        from apps.billing.notifications import send_order_notification
        send_order_notification(order, customer)
    except Exception as e:
        logger.error(f"Order notification failed: {e}")

    try:
        from apps.loyalty.views import award_order_points
        award_order_points(order, customer)
    except Exception:
        pass

    serializer = OrderSerializer(order)
    return Response({'message': 'Order placed successfully!', 'order': serializer.data}, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_order(request, order_id):
    """
    POST /api/orders/customer/cancel/<order_id>/
    Customer cancels their own order (only if Order Placed / Order Confirmed).
    """
    user = request.user
    try:
        customer = user.customer_profile
    except Customer.DoesNotExist:
        return Response({'error': 'Customer profile not found'}, status=status.HTTP_404_NOT_FOUND)

    try:
        order = Order.objects.prefetch_related('items__product').get(id=order_id, customer=customer)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

    cancellable_statuses = ['Order Placed', 'Order Confirmed']
    if order.delivery_status not in cancellable_statuses:
        return Response({
            'error': f'Cannot cancel order in "{order.delivery_status}" status.'
        }, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        for item in order.items.all():
            try:
                stock = Stock.objects.select_for_update().filter(product=item.product).first()
                if stock:
                    stock.update_stock(crates=item.quantity_crates, bottles=item.quantity_bottles)
            except Exception:
                pass
        order.delivery_status = 'Cancelled'
        order.save()

    try:
        from apps.audit.utils import log_action
        log_action(request, 'UPDATE', f'Customer cancelled Order #{order.id}', 'Order', order.id)
    except Exception:
        pass

    # Notify admin about cancellation
    try:
        from apps.billing.notifications import _send_email, _send_whatsapp, _send_sms, _twilio_client, ADMIN_EMAIL, ADMIN_PHONE
        client = _twilio_client()
        admin_msg = (
            f"❌ *Order Cancelled — ColdSync Pro*\n\n"
            f"*{customer.shop_name}* ({customer.owner_name})\n"
            f"Order *#{order.id}* has been cancelled by customer.\n"
            f"Amount: ₹{order.total_amount}\n"
            f"Phone: {customer.phone or 'N/A'}"
        )
        _send_email(ADMIN_EMAIL, f"❌ Order #{order.id} Cancelled — {customer.shop_name}", admin_msg.replace('*', ''))
        if not _send_whatsapp(client, ADMIN_PHONE, admin_msg):
            _send_sms(client, ADMIN_PHONE, admin_msg)
    except Exception as e:
        logger.error(f"Cancel order admin notification failed: {e}")

    return Response({'message': f'Order #{order.id} cancelled successfully.', 'order_id': order.id})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reorder(request, order_id):
    """
    POST /api/orders/customer/reorder/<order_id>/
    Creates a new order with the same items as the given order.
    """
    user = request.user
    try:
        customer = user.customer_profile
    except Customer.DoesNotExist:
        return Response({'error': 'Customer profile not found'}, status=status.HTTP_404_NOT_FOUND)

    try:
        original = Order.objects.prefetch_related('items__product').get(id=order_id, customer=customer)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

    if not original.items.exists():
        return Response({'error': 'Original order has no items'}, status=status.HTTP_400_BAD_REQUEST)

    reorder_total = sum(
        item.get_total_bottles() * float(item.product.rate_per_bottle)
        for item in original.items.all()
    )
    outstanding = Order.objects.filter(
        customer=customer
    ).exclude(payment_status='Paid').aggregate(total=Sum('total_amount'))['total'] or 0

    credit_limit    = float(customer.credit_limit or 0)
    available_credit = credit_limit - float(outstanding)

    if credit_limit > 0 and reorder_total > available_credit:
        return Response({
            'error': (
                f'Reorder amount ₹{reorder_total:.0f} exceeds your available credit of ₹{available_credit:.0f}. '
                f'Please clear outstanding dues of ₹{float(outstanding):.0f} first.'
            ),
            'credit_limit':    credit_limit,
            'outstanding':     float(outstanding),
            'available_credit': available_credit,
        }, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        new_order = Order.objects.create(
            customer=customer,
            delivery_status='Order Placed',
            payment_status='Pending',
        )
        total_amount = 0
        for item in original.items.all():
            OrderItem.objects.create(
                order=new_order,
                product=item.product,
                quantity_crates=item.quantity_crates,
                quantity_bottles=item.quantity_bottles,
                price=item.product.rate_per_bottle,
            )
            try:
                stock = Stock.objects.select_for_update().get(product=item.product)
                stock.update_stock(crates=-item.quantity_crates, bottles=-item.quantity_bottles)
            except Stock.DoesNotExist:
                pass
            total_amount += item.get_total_bottles() * float(item.product.rate_per_bottle)

        new_order.total_amount = total_amount
        new_order.save()

    try:
        from apps.billing.notifications import send_order_notification
        send_order_notification(new_order, customer)
    except Exception:
        pass

    serializer = OrderSerializer(new_order)
    return Response({
        'message': f'Reorder placed successfully! New Order #{new_order.id}',
        'order': serializer.data,
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_customer_orders(request):
    user = request.user
    try:
        customer = user.customer_profile
    except Customer.DoesNotExist:
        customer, _ = Customer.objects.get_or_create(
            user=user,
            defaults=dict(
                shop_name=f"{user.get_full_name() or user.username}'s Shop",
                owner_name=user.get_full_name() or user.username,
                phone=f"9{user.id:09d}"[:10],
                address='Address not set',
                village='',
                credit_limit=50000,
            )
        )
    orders = Order.objects.filter(customer=customer).select_related('customer').prefetch_related('items__product').order_by('-order_date')
    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_payment_history(request):
    user = request.user
    try:
        customer = user.customer_profile
    except Customer.DoesNotExist:
        return Response([])

    orders = Order.objects.filter(customer=customer).select_related('customer').prefetch_related('items__product').order_by('-order_date')
    payment_history = []
    for order in orders:
        payment_history.append({
            'order_id':       order.id,
            'order_date':     order.order_date,
            'total_amount':   float(order.total_amount),
            'payment_status': order.payment_status,
            'delivery_status': order.delivery_status,
            'items': [
                {
                    'product_name': item.product.product_name,
                    'brand':        item.product.brand,
                    'quantity':     item.get_total_bottles(),
                    'price':        float(item.price),
                    'total':        float(item.get_item_total()),
                }
                for item in order.items.all()
            ]
        })
    return Response(payment_history)


# ── Delivery Management ───────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def delivery_list(request):
    """GET /api/orders/delivery/ — orders with delivery fields."""
    qs = Order.objects.select_related('customer').all()

    status_filter = request.query_params.get('status', '')
    search        = request.query_params.get('search', '')

    if status_filter:
        qs = qs.filter(delivery_status=status_filter)
    if search:
        qs = (
            qs.filter(customer__shop_name__icontains=search) |
            qs.filter(customer__owner_name__icontains=search) |
            qs.filter(delivery_driver__icontains=search) |
            qs.filter(delivery_vehicle__icontains=search)
        )

    total_count = qs.count()
    page      = max(int(request.query_params.get('page', 1)), 1)
    page_size = min(int(request.query_params.get('page_size', 50)), 200)
    offset    = (page - 1) * page_size
    qs        = qs[offset: offset + page_size]

    data = [{
        'id':               o.id,
        'shop_name':        o.customer.shop_name,
        'owner_name':       o.customer.owner_name,
        'phone':            o.customer.phone,
        'village':          o.customer.village,
        'address':          o.customer.address,
        'order_date':       o.order_date.isoformat(),
        'total_amount':     float(o.total_amount),
        'payment_status':   o.payment_status,
        'delivery_status':  o.delivery_status,
        'delivery_driver':  o.delivery_driver or '',
        'delivery_driver_phone': o.delivery_driver_phone or '',
        'delivery_driver_email': o.delivery_driver_email or '',
        'delivery_vehicle': o.delivery_vehicle or '',
        'delivery_notes':   o.delivery_notes or '',
        'assigned_driver_id': o.assigned_driver_id,
        'estimated_delivery': o.estimated_delivery.isoformat() if o.estimated_delivery else None,
        'actual_delivery':    o.actual_delivery.isoformat() if o.actual_delivery else None,
    } for o in qs]

    return Response({
        'count':       total_count,
        'page':        page,
        'page_size':   page_size,
        'total_pages': (total_count + page_size - 1) // page_size,
        'orders':      data,
    })


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def assign_driver(request, pk):
    """PATCH /api/orders/delivery/<pk>/assign/"""
    try:
        order = Order.objects.select_related('customer__user').get(pk=pk)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

    driver_id    = request.data.get('driver_id')
    driver_name  = request.data.get('driver_name')
    driver_phone = request.data.get('driver_phone')
    driver_email = request.data.get('driver_email')
    vehicle      = request.data.get('vehicle_number')
    notes        = request.data.get('delivery_notes')
    d_status     = request.data.get('delivery_status')
    est_del      = request.data.get('estimated_delivery')

    if driver_id:
        try:
            saved_driver = DeliveryDriver.objects.get(pk=driver_id)
            order.assigned_driver       = saved_driver
            order.delivery_driver       = saved_driver.name
            order.delivery_driver_phone = saved_driver.phone
            order.delivery_driver_email = saved_driver.email or ''
            order.delivery_vehicle      = saved_driver.vehicle_number or vehicle or ''
        except DeliveryDriver.DoesNotExist:
            pass
    else:
        if driver_name  is not None: order.delivery_driver       = driver_name
        if driver_phone is not None: order.delivery_driver_phone = driver_phone
        if driver_email is not None: order.delivery_driver_email = driver_email
        if vehicle      is not None: order.delivery_vehicle      = vehicle

    if notes is not None: order.delivery_notes = notes
    if d_status and d_status in dict(Order.DELIVERY_STATUS_CHOICES):
        order.delivery_status = d_status
        if d_status == 'Delivered':
            order.actual_delivery = timezone.now()
    if est_del:
        from django.utils.dateparse import parse_datetime
        parsed = parse_datetime(est_del)
        if parsed:
            order.estimated_delivery = parsed

    order.save()

    try:
        from apps.audit.utils import log_action
        log_action(request, 'UPDATE', f'Assigned driver "{order.delivery_driver}" to Order #{order.id}, status → {order.delivery_status}', 'Order', order.id)
    except Exception:
        pass

    if driver_id and order.assigned_driver:
        try:
            from apps.billing.notifications import send_driver_assignment_notification
            send_driver_assignment_notification(order, order.assigned_driver)
        except Exception as e:
            logger.error(f"Driver assignment notification failed: {e}")

    if d_status == 'Out for Delivery':
        _notify_customer_out_for_delivery(order)
    elif d_status and d_status != 'Out for Delivery':
        _notify_customer_status_change(order, d_status)

    return Response({
        'id':                    order.id,
        'delivery_driver':       order.delivery_driver or '',
        'delivery_driver_phone': order.delivery_driver_phone or '',
        'delivery_driver_email': order.delivery_driver_email or '',
        'delivery_vehicle':      order.delivery_vehicle or '',
        'delivery_status':       order.delivery_status,
        'delivery_notes':        order.delivery_notes or '',
        'assigned_driver_id':    order.assigned_driver_id,
        'estimated_delivery':    order.estimated_delivery.isoformat() if order.estimated_delivery else None,
        'actual_delivery':       order.actual_delivery.isoformat() if order.actual_delivery else None,
    })


def _notify_customer_status_change(order, new_status):
    """
    Push in-app notification to customer when admin changes delivery status.
    Also sends WhatsApp/SMS for key status changes.
    """
    customer = order.customer
    if not customer.user:
        return

    STATUS_MESSAGES = {
        'Order Confirmed':  ('✅ Order Confirmed!',    f'Your Order #{order.id} has been confirmed by the agency.'),
        'Processing':       ('⚙️ Order Processing',    f'Order #{order.id} is being packed and prepared for delivery.'),
        'Out for Delivery': ('🚚 Out for Delivery!',   f'Order #{order.id} is on the way! Driver: {order.delivery_driver or "Assigned"}.'),
        'Delivered':        ('🎉 Order Delivered!',    f'Order #{order.id} has been delivered successfully. Thank you!'),
        'Cancelled':        ('❌ Order Cancelled',     f'Order #{order.id} has been cancelled. Contact us for queries.'),
    }

    if new_status not in STATUS_MESSAGES:
        return

    title, message = STATUS_MESSAGES[new_status]

    # Create in-app notification
    try:
        from apps.notifications.models import Notification
        Notification.objects.create(
            user=customer.user,
            type='order_' + new_status.lower().replace(' ', '_'),
            title=title,
            message=message,
            order_id=order.id,
        )
    except Exception as e:
        logger.error(f"In-app notification failed for Order #{order.id}: {e}")

    # WhatsApp/SMS for key status changes
    if new_status in ('Out for Delivery', 'Delivered', 'Order Confirmed'):
        try:
            from apps.billing.notifications import _send_whatsapp, _send_sms, _twilio_client
            client = _twilio_client()
            wa_msg = (
                f"{'🚚' if new_status == 'Out for Delivery' else '🎉' if new_status == 'Delivered' else '✅'} "
                f"*{title}*\n\n"
                f"Dear *{customer.owner_name}*,\n"
                f"{message}\n\n"
                f"Order Amount: ₹{order.total_amount}\n"
                f"— Shree Ganesh Agency 🙏"
            )
            phone = customer.phone or ''
            if phone:
                if not _send_whatsapp(client, phone, wa_msg):
                    _send_sms(client, phone, wa_msg)
        except Exception as e:
            logger.error(f"WhatsApp notification failed for Order #{order.id}: {e}")


def _notify_customer_out_for_delivery(order):
    """Send email + WhatsApp/SMS to customer when order is Out for Delivery."""
    import urllib.parse
    customer       = order.customer
    customer_email = getattr(customer.user, 'email', None) if customer.user else None
    customer_phone = customer.phone or ''

    driver_name  = order.delivery_driver or 'N/A'
    driver_phone = order.delivery_driver_phone or ''
    vehicle      = order.delivery_vehicle or 'N/A'
    est          = order.estimated_delivery.strftime('%d %b %Y, %I:%M %p') if order.estimated_delivery else 'Today'

    email_body = f"""Dear {customer.owner_name},

Your order is on the way! 🚚

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  DELIVERY DETAILS — Order #{order.id}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Driver Name  : {driver_name}
  Driver Phone : {driver_phone or 'N/A'}
  Vehicle No.  : {vehicle}
  Amount       : ₹{order.total_amount}
  ETA          : {est}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

— Shree Ganesh Agency
"""

    wa_msg = (
        f"🚚 *Your Order is Out for Delivery!*\n\n"
        f"Dear *{customer.owner_name}*,\n"
        f"Order *#{order.id}* is on the way!\n\n"
        f"👤 *Driver:* {driver_name}\n"
        f"📱 *Phone:* {driver_phone or 'N/A'}\n"
        f"🚗 *Vehicle:* {vehicle}\n"
        f"⏰ *ETA:* {est}\n"
        f"💰 *Amount:* ₹{order.total_amount}\n\n"
        f"— Shree Ganesh Agency 🙏"
    )

    from apps.billing.notifications import _send_email, _send_whatsapp, _send_sms, _twilio_client
    client = _twilio_client()

    if customer_email:
        _send_email(customer_email, f"🚚 Order #{order.id} Out for Delivery — {driver_name}", email_body)

    if customer_phone:
        if not _send_whatsapp(client, customer_phone, wa_msg):
            _send_sms(client, customer_phone, wa_msg)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_import_orders(request):
    """
    POST /api/orders/bulk-import/
    CSV columns: customer_phone, product_id, quantity_crates, quantity_bottles, price, payment_status
    """
    file = request.FILES.get('file')
    if not file:
        return Response({'error': 'No file uploaded'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        decoded = file.read().decode('utf-8')
    except Exception:
        return Response({'error': 'Could not decode file — use UTF-8 CSV'}, status=status.HTTP_400_BAD_REQUEST)

    reader   = csv.DictReader(io.StringIO(decoded))
    required = {'customer_phone', 'product_id', 'quantity_crates', 'quantity_bottles', 'price'}
    if not required.issubset(set(reader.fieldnames or [])):
        return Response({'error': f'CSV must have columns: {required}'}, status=status.HTTP_400_BAD_REQUEST)

    created = 0
    errors  = []

    for i, row in enumerate(reader, start=2):
        try:
            with transaction.atomic():
                customer = Customer.objects.get(phone=row['customer_phone'].strip())
                product  = Product.objects.get(id=int(row['product_id']))
                order    = Order.objects.create(
                    customer=customer,
                    delivery_status='Order Placed',
                    payment_status=row.get('payment_status', 'Pending').strip(),
                    total_amount=float(row['price']) * (int(row['quantity_crates']) * product.crate_size + int(row['quantity_bottles'])),
                )
                OrderItem.objects.create(
                    order=order,
                    product=product,
                    quantity_crates=int(row['quantity_crates']),
                    quantity_bottles=int(row['quantity_bottles']),
                    price=float(row['price']),
                )
            created += 1
        except Exception as e:
            errors.append({'row': i, 'error': str(e)})

    return Response({'created': created, 'errors': errors})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def delivery_drivers(request):
    """GET list / POST create delivery driver."""
    if request.method == 'GET':
        drivers = DeliveryDriver.objects.filter(is_active=True).values(
            'id', 'name', 'phone', 'email', 'vehicle_number', 'vehicle_type'
        )
        return Response(list(drivers))

    if not (request.user.is_staff or request.user.is_superuser):
        return Response({'error': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)

    data = request.data
    driver = DeliveryDriver.objects.create(
        name=data.get('name', ''),
        phone=data.get('phone', ''),
        email=data.get('email', ''),
        vehicle_number=data.get('vehicle_number', ''),
        vehicle_type=data.get('vehicle_type', ''),
    )
    return Response({'id': driver.id, 'name': driver.name}, status=status.HTTP_201_CREATED)


# ── Driver App Endpoints ──────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def drivers_list(request):
    """GET /api/orders/drivers/ — list active delivery drivers."""
    drivers = DeliveryDriver.objects.filter(is_active=True).values(
        'id', 'name', 'phone', 'email', 'vehicle_number', 'vehicle_type'
    )
    return Response(list(drivers))


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def driver_detail(request, pk):
    """GET/PATCH/DELETE a single delivery driver (admin only for PATCH/DELETE)."""
    try:
        driver = DeliveryDriver.objects.get(pk=pk)
    except DeliveryDriver.DoesNotExist:
        return Response({'error': 'Driver not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response({
            'id': driver.id, 'name': driver.name, 'phone': driver.phone,
            'email': driver.email, 'vehicle_number': driver.vehicle_number,
            'vehicle_type': driver.vehicle_type, 'is_active': driver.is_active,
        })

    if not (request.user.is_staff or request.user.is_superuser):
        return Response({'error': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'PATCH':
        for field in ('name', 'phone', 'email', 'vehicle_number', 'vehicle_type', 'is_active'):
            if field in request.data:
                setattr(driver, field, request.data[field])
        driver.save()
        return Response({'success': True})

    # DELETE
    driver.is_active = False
    driver.save()
    return Response({'success': True})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def driver_orders(request):
    """GET /api/orders/driver/orders/ — orders assigned to the logged-in driver."""
    phone = request.query_params.get('phone', '')
    qs = Order.objects.select_related('customer').prefetch_related('items__product')
    if phone:
        qs = qs.filter(delivery_driver_phone=phone)
    else:
        qs = qs.filter(delivery_driver_phone=request.user.username)

    data = [{
        'id':              o.id,
        'shop_name':       o.customer.shop_name,
        'owner_name':      o.customer.owner_name,
        'phone':           o.customer.phone,
        'address':         o.customer.address,
        'village':         o.customer.village,
        'total_amount':    float(o.total_amount),
        'payment_status':  o.payment_status,
        'delivery_status': o.delivery_status,
        'estimated_delivery': o.estimated_delivery.isoformat() if o.estimated_delivery else None,
    } for o in qs]
    return Response(data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def driver_update_status(request, pk):
    """PATCH /api/orders/driver/orders/<pk>/status/ — driver updates delivery status."""
    try:
        order = Order.objects.get(pk=pk)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

    new_status = request.data.get('delivery_status')
    if new_status and new_status in dict(Order.DELIVERY_STATUS_CHOICES):
        order.delivery_status = new_status
        if new_status == 'Delivered':
            order.actual_delivery = timezone.now()
        order.save()
        return Response({'success': True, 'delivery_status': order.delivery_status})
    return Response({'error': 'Invalid delivery_status'}, status=status.HTTP_400_BAD_REQUEST)
