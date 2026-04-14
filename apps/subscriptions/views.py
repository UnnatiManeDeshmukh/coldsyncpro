from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import timedelta, date
from .models import RecurringOrder, RecurringOrderItem
from .serializers import RecurringOrderSerializer, RecurringOrderCreateSerializer
from apps.customers.models import Customer


class RecurringOrderViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = RecurringOrder.objects.select_related('customer').prefetch_related('items__product').all()
        if user.is_staff or user.is_superuser:
            return qs
        try:
            return qs.filter(customer=user.customer_profile)
        except Exception:
            return RecurringOrder.objects.none()

    def get_serializer_class(self):
        if self.action == 'create':
            return RecurringOrderCreateSerializer
        return RecurringOrderSerializer

    def perform_create(self, serializer):
        user = self.request.user
        if not serializer.validated_data.get('customer'):
            try:
                customer = user.customer_profile
            except Exception:
                customer = Customer.objects.filter(user=user).first()
            serializer.save(customer=customer)
        else:
            serializer.save()

    @action(detail=True, methods=['post'])
    def pause(self, request, pk=None):
        obj = self.get_object()
        obj.status = 'paused'
        obj.save()
        return Response({'status': 'paused'})

    @action(detail=True, methods=['post'])
    def resume(self, request, pk=None):
        obj = self.get_object()
        obj.status = 'active'
        obj.save()
        return Response({'status': 'active'})

    @action(detail=True, methods=['post'])
    def trigger_now(self, request, pk=None):
        """Manually trigger a recurring order now."""
        obj = self.get_object()
        if obj.status != 'active':
            return Response({'error': 'Subscription is not active'}, status=status.HTTP_400_BAD_REQUEST)
        order = _create_order_from_recurring(obj)
        if order:
            _advance_next_date(obj)
            return Response({'status': 'Order created', 'order_id': order.id})
        return Response({'error': 'No items in subscription'}, status=status.HTTP_400_BAD_REQUEST)


def _create_order_from_recurring(recurring):
    from apps.orders.models import Order, OrderItem
    from apps.inventory.models import Stock
    from django.db import transaction
    if not recurring.items.exists():
        return None
    with transaction.atomic():
        order = Order.objects.create(
            customer=recurring.customer,
            delivery_status='Order Placed',
            payment_status='Pending',
        )
        total = 0
        for item in recurring.items.select_related('product').all():
            OrderItem.objects.create(
                order=order,
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
            bottles = item.quantity_crates * item.product.crate_size + item.quantity_bottles
            total += bottles * float(item.product.rate_per_bottle)
        order.total_amount = total
        order.save()
    return order


def _advance_next_date(recurring):
    freq = recurring.frequency
    delta = timedelta(days=7) if freq == 'weekly' else timedelta(days=14) if freq == 'biweekly' else timedelta(days=30)
    recurring.next_order_date = date.today() + delta
    recurring.save(update_fields=['next_order_date'])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def process_due_subscriptions(request):
    """Admin endpoint to trigger all due subscriptions."""
    if not (request.user.is_staff or request.user.is_superuser):
        return Response({'error': 'Admin only'}, status=403)
    today = date.today()
    due = RecurringOrder.objects.filter(status='active', next_order_date__lte=today)
    created = 0
    for rec in due:
        order = _create_order_from_recurring(rec)
        if order:
            _advance_next_date(rec)
            created += 1
    return Response({'processed': due.count(), 'orders_created': created})
