from rest_framework import viewsets, filters, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from .models import ReturnRequest
from .serializers import ReturnRequestSerializer


class ReturnRequestViewSet(viewsets.ModelViewSet):
    serializer_class = ReturnRequestSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'return_type', 'reason', 'customer']
    search_fields = ['customer__shop_name', 'order__id']
    ordering_fields = ['created_at', 'refund_amount']

    def get_queryset(self):
        user = self.request.user
        qs = ReturnRequest.objects.select_related('customer', 'order', 'order_item__product').all()
        if user.is_staff or user.is_superuser:
            return qs
        try:
            return qs.filter(customer=user.customer_profile)
        except Exception:
            return ReturnRequest.objects.none()

    def perform_create(self, serializer):
        """Auto-set customer from logged-in user if not provided."""
        user = self.request.user
        if not serializer.validated_data.get('customer'):
            try:
                customer = user.customer_profile
            except Exception:
                from apps.customers.models import Customer
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
            serializer.save(customer=customer)
        else:
            serializer.save()

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        ret = self.get_object()
        if ret.status != 'Pending':
            return Response({'error': 'Only pending returns can be approved'}, status=status.HTTP_400_BAD_REQUEST)
        ret.status = 'Approved'
        ret.admin_notes = request.data.get('admin_notes', '')
        ret.save()

        # If credit type, adjust customer credit limit as a refund
        if ret.return_type == 'Credit' and ret.refund_amount > 0:
            try:
                customer = ret.customer
                customer.credit_limit = (customer.credit_limit or 0) + ret.refund_amount
                customer.save(update_fields=['credit_limit'])
            except Exception:
                pass

        # If stock return type, re-add stock immediately on approval
        if ret.return_type == 'Stock' and (ret.quantity_crates > 0 or ret.quantity_bottles > 0):
            try:
                from apps.inventory.models import Stock
                product = None
                if ret.order_item and ret.order_item.product:
                    product = ret.order_item.product
                elif ret.order:
                    first_item = ret.order.items.select_related('product').first()
                    if first_item:
                        product = first_item.product
                if product:
                    stock, _ = Stock.objects.get_or_create(
                        product=product,
                        warehouse_name='Main Warehouse',
                        defaults={'total_crates': 0, 'total_bottles': 0}
                    )
                    stock.total_crates += ret.quantity_crates
                    stock.total_bottles += ret.quantity_bottles
                    stock.save()
            except Exception:
                pass

        # Notify customer
        try:
            _notify_return_status(ret, 'Approved')
        except Exception:
            pass

        return Response({'status': 'Approved'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        ret = self.get_object()
        ret.status = 'Rejected'
        ret.admin_notes = request.data.get('admin_notes', '')
        ret.save()

        # Notify customer
        try:
            _notify_return_status(ret, 'Rejected')
        except Exception:
            pass

        return Response({'status': 'Rejected'})

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark return as completed and re-add stock to Main Warehouse."""
        ret = self.get_object()
        if ret.status != 'Approved':
            return Response({'error': 'Only approved returns can be completed'}, status=status.HTTP_400_BAD_REQUEST)

        # Re-add stock back to Main Warehouse
        if ret.quantity_crates > 0 or ret.quantity_bottles > 0:
            try:
                from apps.inventory.models import Stock
                product = None
                if ret.order_item and ret.order_item.product:
                    product = ret.order_item.product
                elif ret.order:
                    # fallback: use first item of the order
                    first_item = ret.order.items.select_related('product').first()
                    if first_item:
                        product = first_item.product

                if product:
                    stock, _ = Stock.objects.get_or_create(
                        product=product,
                        warehouse_name='Main Warehouse',
                        defaults={'total_crates': 0, 'total_bottles': 0}
                    )
                    stock.total_crates += ret.quantity_crates
                    stock.total_bottles += ret.quantity_bottles
                    stock.save()
            except Exception:
                pass  # don't block completion if stock update fails

        ret.status = 'Completed'
        ret.admin_notes = request.data.get('admin_notes', ret.admin_notes or '')
        ret.save()

        # Notify customer
        try:
            _notify_return_status(ret, 'Completed')
        except Exception:
            pass

        return Response({'status': 'Completed'})


def _notify_return_status(ret, new_status):
    """Send email + WhatsApp/SMS to customer when return status changes."""
    from apps.billing.notifications import _send_email, _send_whatsapp, _send_sms, _twilio_client
    customer = ret.customer
    if not customer:
        return
    customer_email = getattr(customer.user, 'email', None) if customer.user else None
    customer_phone = customer.phone or ''
    client = _twilio_client()

    STATUS_INFO = {
        'Approved':  ('✅', 'Return Approved', 'Your return request has been approved.'),
        'Rejected':  ('❌', 'Return Rejected', 'Your return request has been rejected. Contact us for help.'),
        'Completed': ('🎉', 'Return Completed', 'Your return has been completed successfully.'),
    }
    emoji, title, detail = STATUS_INFO.get(new_status, ('📋', f'Return {new_status}', ''))

    order_ref = f"Order #{ret.order.id}" if ret.order else "your return"
    refund_line = f"\nRefund Amount: ₹{ret.refund_amount}" if ret.refund_amount else ""

    subject = f"{emoji} {title} — {order_ref} | Shree Ganesh Agency"
    body = (
        f"Dear {customer.owner_name},\n\n"
        f"{detail}\n\n"
        f"Return ID: #{ret.id}\n"
        f"For: {order_ref}"
        f"{refund_line}\n\n"
        f"— Shree Ganesh Agency"
    )
    wa_msg = (
        f"{emoji} *{title}*\n\n"
        f"Dear *{customer.owner_name}*,\n"
        f"{detail}\n\n"
        f"Return ID: #{ret.id}\n"
        f"For: {order_ref}"
        f"{refund_line}\n\n"
        f"— Shree Ganesh Agency 🙏"
    )

    if customer_email:
        _send_email(customer_email, subject, body)
    if customer_phone:
        if not _send_whatsapp(client, customer_phone, wa_msg):
            _send_sms(client, customer_phone, wa_msg)
