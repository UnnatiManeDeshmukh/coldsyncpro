from rest_framework import viewsets, filters, status
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import UserRateThrottle
from django_filters.rest_framework import DjangoFilterBackend
from django.http import HttpResponse
from django.conf import settings
from django.db.models import Sum, Count, Q
from .models import Payment, Invoice, UpiConfig
from .serializers import PaymentSerializer, InvoiceSerializer, InvoiceCreateSerializer
from .utils import generate_invoice_pdf
from .notifications import send_payment_notifications, send_payment_email, send_payment_whatsapp
from apps.customers.models import Customer
from apps.orders.models import Order


class PaymentRateThrottle(UserRateThrottle):
    scope = 'payment'


class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['customer', 'order', 'payment_method']
    search_fields = ['customer__shop_name', 'reference_number']
    ordering_fields = ['payment_date', 'amount']

    def get_queryset(self):
        user = self.request.user
        qs = Payment.objects.select_related('customer', 'order').all()
        if user.is_staff or user.is_superuser:
            return qs
        try:
            return qs.filter(customer=user.customer_profile)
        except Exception:
            return Payment.objects.none()

    def perform_create(self, serializer):
        """Auto-update order payment status after recording a payment."""
        from django.db.models import Sum as _Sum
        payment = serializer.save()
        order = payment.order
        if order:
            total_paid = Payment.objects.filter(order=order).aggregate(
                total=_Sum('amount')
            )['total'] or 0
            if float(total_paid) >= float(order.total_amount):
                order.payment_status = 'Paid'
            elif float(total_paid) > 0:
                order.payment_status = 'Partial'
            else:
                order.payment_status = 'Pending'
            order.save(update_fields=['payment_status'])

        # Send SMS/WhatsApp notification to customer
        try:
            from apps.billing.notifications import send_payment_notifications
            customer = payment.customer
            send_payment_notifications(payment, customer, order)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Payment notification failed: {e}")


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.select_related('customer', 'order').all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['customer', 'payment_method']
    search_fields = ['invoice_number', 'customer__shop_name']
    ordering_fields = ['created_at', 'total_amount']

    def get_serializer_class(self):
        if self.action == 'create':
            return InvoiceCreateSerializer
        return InvoiceSerializer

    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        """Generate and download invoice PDF"""
        invoice = self.get_object()
        pdf_buffer = generate_invoice_pdf(invoice)
        response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="invoice_{invoice.invoice_number}.pdf"'
        return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def billing_summary(request):
    """
    Billing overview with payment tracking.
    Returns invoices enriched with payment_status derived from linked order,
    plus summary counts and totals.

    Query params:
      status  = Paid | Pending | Partial   (filter by order payment status)
      from    = YYYY-MM-DD
      to      = YYYY-MM-DD
    """
    status_filter = request.query_params.get('status', '')
    date_from     = request.query_params.get('from', '')
    date_to       = request.query_params.get('to', '')

    qs = Invoice.objects.select_related('customer', 'order').order_by('-created_at')

    # Date filters
    if date_from:
        qs = qs.filter(created_at__date__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__date__lte=date_to)

    # Payment status filter (derived from linked order)
    if status_filter in ('Paid', 'Pending', 'Partial'):
        qs = qs.filter(order__payment_status=status_filter)

    invoices_data = []
    for inv in qs:
        payment_status = inv.order.payment_status if inv.order else 'Pending'
        invoices_data.append({
            'id':             inv.id,
            'invoice_number': inv.invoice_number,
            'customer_name':  inv.customer.shop_name if inv.customer else '—',
            'owner_name':     inv.customer.owner_name if inv.customer else '—',
            'amount':         float(inv.total_amount),
            'subtotal':       float(inv.subtotal),
            'gst_amount':     float(inv.gst_amount),
            'gst_percentage': float(inv.gst_percentage),
            'payment_method': inv.payment_method,
            'payment_status': payment_status,
            'date':           inv.created_at.strftime('%Y-%m-%d'),
            'order_id':       inv.order_id,
        })

    # Summary totals (unfiltered by status for card accuracy)
    all_invoices = Invoice.objects.select_related('order').all()
    if date_from:
        all_invoices = all_invoices.filter(created_at__date__gte=date_from)
    if date_to:
        all_invoices = all_invoices.filter(created_at__date__lte=date_to)

    total_revenue = all_invoices.aggregate(t=Sum('total_amount'))['t'] or 0
    paid_total    = all_invoices.filter(order__isnull=False, order__payment_status='Paid').aggregate(t=Sum('total_amount'))['t'] or 0
    pending_total = all_invoices.filter(order__isnull=False, order__payment_status__in=['Pending', 'Partial']).aggregate(t=Sum('total_amount'))['t'] or 0

    return Response({
        'summary': {
            'total_invoices':  all_invoices.count(),
            'paid_count':      all_invoices.filter(order__payment_status='Paid').count(),
            'pending_count':   all_invoices.filter(order__payment_status__in=['Pending', 'Partial']).count(),
            'total_revenue':   float(total_revenue),
            'paid_total':      float(paid_total),
            'pending_total':   float(pending_total),
        },
        'invoices': invoices_data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([PaymentRateThrottle])
def pay_now(request):
    """
    Customer submits UPI payment.
    Body: { amount, reference_number, order_id (optional), notes (optional) }
    On success: records payment, sends email + WhatsApp.
    """
    user = request.user
    try:
        customer = user.customer_profile
    except Customer.DoesNotExist:
        customer = Customer.objects.create(
            user=user,
            shop_name=f"{user.get_full_name() or user.username}'s Shop",
            owner_name=user.get_full_name() or user.username,
            phone=f"9{user.id:09d}"[:10],  # valid 10-digit fallback
            address='Address not set',
            village='',
            credit_limit=50000,
        )

    amount = request.data.get('amount')
    reference = request.data.get('reference_number', '').strip()
    order_id = request.data.get('order_id')
    notes = request.data.get('notes', '')

    try:
        amount = float(amount)
        if amount <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)

    if not reference:
        return Response({'error': 'UPI reference / UTR number is required'}, status=status.HTTP_400_BAD_REQUEST)

    # Prevent duplicate reference
    if Payment.objects.filter(reference_number=reference).exists():
        return Response({'error': 'This reference number has already been used'}, status=status.HTTP_400_BAD_REQUEST)

    order = None
    if order_id:
        try:
            order = Order.objects.get(id=order_id, customer=customer)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

    # Record payment
    payment = Payment.objects.create(
        customer=customer,
        order=order,
        amount=amount,
        payment_method='UPI',
        reference_number=reference,
        notes=notes,
    )

    # Order status update NAKO — admin verify karaycha aadhi
    # verify_payment endpoint madhe verified payments var update hoto

    # Audit log
    try:
        from apps.audit.utils import log_action
        log_action(request, 'CREATE', f'Payment ₹{amount} recorded (ref: {reference}) for {customer.shop_name}' + (f', Order #{order.id}' if order else ''), 'Payment', payment.id)
    except Exception:
        pass

    # Send notifications (email + WhatsApp + SMS) to customer & admin
    notif = send_payment_notifications(payment, customer, order)

    return Response({
        'success': True,
        'message': 'Payment recorded successfully! Pending admin verification.',
        'payment_id': payment.id,
        'verification_status': payment.verification_status,
        'email_sent':            notif['email_sent'],
        'whatsapp_sent':         notif['whatsapp_sent'],
        'sms_sent':              notif['sms_sent'],
        'whatsapp_fallback_url': notif['whatsapp_fallback_url'],
        'admin_notified':        notif['admin_email_sent'] or notif['admin_wa_sent'],
        'admin_wa_link':         notif.get('admin_wa_link', ''),
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_payment(request, payment_id):
    """
    POST /api/billing/payments/<id>/verify/
    Admin verifies or rejects a UPI payment.
    Body: { action: 'verify' | 'reject', notes: '' }
    """
    if not (request.user.is_staff or request.user.is_superuser):
        return Response({'error': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)

    try:
        payment = Payment.objects.select_related('customer', 'order').get(id=payment_id)
    except Payment.DoesNotExist:
        return Response({'error': 'Payment not found'}, status=status.HTTP_404_NOT_FOUND)

    action_type = request.data.get('action', '').strip()
    if action_type not in ('verify', 'reject'):
        return Response({'error': 'action must be "verify" or "reject"'}, status=status.HTTP_400_BAD_REQUEST)

    from django.utils import timezone as _tz
    if action_type == 'verify':
        payment.verification_status = 'verified'
        # Auto-update order payment status on verification
        if payment.order:
            total_paid = Payment.objects.filter(
                order=payment.order, verification_status='verified'
            ).aggregate(total=Sum('amount'))['total'] or 0
            if float(total_paid) >= float(payment.order.total_amount):
                payment.order.payment_status = 'Paid'
            elif float(total_paid) > 0:
                payment.order.payment_status = 'Partial'
            payment.order.save(update_fields=['payment_status'])
    else:
        payment.verification_status = 'rejected'
        # Rejected payment var order status recalculate karo — fakt verified payments count karo
        if payment.order:
            total_verified = Payment.objects.filter(
                order=payment.order, verification_status='verified'
            ).exclude(id=payment.id).aggregate(total=Sum('amount'))['total'] or 0
            if float(total_verified) >= float(payment.order.total_amount):
                payment.order.payment_status = 'Paid'
            elif float(total_verified) > 0:
                payment.order.payment_status = 'Partial'
            else:
                payment.order.payment_status = 'Pending'
            payment.order.save(update_fields=['payment_status'])

    payment.verified_by = request.user
    payment.verified_at = _tz.now()
    if request.data.get('notes'):
        payment.notes = request.data['notes']
    payment.save()

    try:
        from apps.audit.utils import log_action
        log_action(request, 'UPDATE', f'Payment #{payment_id} {action_type}d by admin', 'Payment', payment_id)
    except Exception:
        pass

    # Notify customer about payment verification result
    try:
        from apps.billing.notifications import _send_email, _send_whatsapp, _send_sms, _twilio_client
        customer = payment.customer
        customer_email = getattr(customer.user, 'email', None) if customer.user else None
        customer_phone = customer.phone or ''
        client = _twilio_client()
        if action_type == 'verify':
            subject = f"✅ Payment Verified — ₹{payment.amount} | Shree Ganesh Agency"
            body = (
                f"Dear {customer.owner_name},\n\n"
                f"Your payment of ₹{payment.amount} (Ref: {payment.reference_number or 'N/A'}) "
                f"has been verified by admin. ✅\n\n"
                f"— Shree Ganesh Agency"
            )
            wa_msg = (
                f"✅ *Payment Verified!*\n\n"
                f"Dear *{customer.owner_name}*,\n"
                f"Your payment of *₹{payment.amount}* has been verified! 🎉\n"
                f"Ref: {payment.reference_number or 'N/A'}\n\n"
                f"— Shree Ganesh Agency 🙏"
            )
        else:
            subject = f"❌ Payment Rejected — ₹{payment.amount} | Shree Ganesh Agency"
            body = (
                f"Dear {customer.owner_name},\n\n"
                f"Your payment of ₹{payment.amount} (Ref: {payment.reference_number or 'N/A'}) "
                f"has been rejected. Please contact us for assistance.\n\n"
                f"— Shree Ganesh Agency"
            )
            wa_msg = (
                f"❌ *Payment Rejected*\n\n"
                f"Dear *{customer.owner_name}*,\n"
                f"Your payment of *₹{payment.amount}* was rejected.\n"
                f"Ref: {payment.reference_number or 'N/A'}\n"
                f"Please contact us for help.\n\n"
                f"— Shree Ganesh Agency 🙏"
            )
        if customer_email:
            _send_email(customer_email, subject, body)
        if customer_phone:
            if not _send_whatsapp(client, customer_phone, wa_msg):
                _send_sms(client, customer_phone, wa_msg)
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Payment verification notification failed: {e}")

    return Response({
        'success': True,
        'payment_id': payment_id,
        'verification_status': payment.verification_status,
        'verified_at': payment.verified_at.isoformat(),
    })


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def upi_config(request):
    """GET — return active UPI config. PATCH — update UPI config (admin only)."""
    cfg = UpiConfig.get_active()

    if request.method == 'PATCH':
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({'error': 'Admin only'}, status=403)
        if request.data.get('upi_id'):
            cfg.upi_id = request.data['upi_id']
        if request.data.get('upi_name'):
            cfg.upi_name = request.data['upi_name']
        if 'bank_name' in request.data:
            cfg.bank_name = request.data['bank_name']
        if 'is_active' in request.data:
            cfg.is_active = request.data['is_active']
        if 'qr_image' in request.FILES:
            img = request.FILES['qr_image']
            # Validate size (3MB max)
            if img.size > 3 * 1024 * 1024:
                return Response({'error': 'QR image too large. Max 3MB.'}, status=400)
            allowed_types = {'image/jpeg', 'image/png', 'image/webp'}
            if img.content_type not in allowed_types:
                return Response({'error': 'Invalid image type. Use JPEG, PNG, or WebP.'}, status=400)
            cfg.qr_image = img
        cfg.save()

    qr_url = ''
    if cfg.qr_image:
        qr_url = request.build_absolute_uri(cfg.qr_image.url)
    return Response({
        'id':           cfg.id,
        'upi_id':       cfg.upi_id,
        'upi_name':     cfg.upi_name,
        'bank_name':    cfg.bank_name,
        'qr_image_url': qr_url,
        'is_active':    cfg.is_active,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def customer_invoice_download(request, invoice_id):
    """
    GET /api/billing/invoices/<id>/download/
    Customer can download their own invoice as PDF.
    Admin can download any invoice.
    """
    try:
        invoice = Invoice.objects.select_related(
            'customer', 'order'
        ).prefetch_related('order__items__product').get(id=invoice_id)
    except Invoice.DoesNotExist:
        return Response({'error': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)

    user = request.user
    # Permission check: customer can only download their own invoices
    if not (user.is_staff or user.is_superuser):
        try:
            if invoice.customer != user.customer_profile:
                return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        except Exception:
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    pdf_buffer = generate_invoice_pdf(invoice)
    response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="invoice_{invoice.invoice_number}.pdf"'
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def invoice_by_order_download(request, order_id):
    """GET /api/billing/invoices/by-order/<order_id>/download/ — download invoice for a specific order."""
    try:
        invoice = Invoice.objects.select_related('customer', 'order').prefetch_related(
            'order__items__product'
        ).get(order_id=order_id)
    except Invoice.DoesNotExist:
        return Response({'error': 'Invoice not found for this order'}, status=404)

    user = request.user
    if not (user.is_staff or user.is_superuser):
        try:
            if invoice.customer != user.customer_profile:
                return Response({'error': 'Not authorized'}, status=403)
        except Exception:
            return Response({'error': 'Not authorized'}, status=403)

    pdf_buffer = generate_invoice_pdf(invoice)
    response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="invoice_{invoice.invoice_number}.pdf"'
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def customer_invoices_list(request):
    """GET /api/billing/my-invoices/ — list all invoices for logged-in customer."""
    user = request.user
    try:
        customer = user.customer_profile
    except Exception:
        return Response([])

    invoices = Invoice.objects.filter(customer=customer).select_related('order').order_by('-created_at')
    data = [{
        'id':             inv.id,
        'invoice_number': inv.invoice_number,
        'total_amount':   float(inv.total_amount),
        'payment_method': inv.payment_method,
        'date':           inv.created_at.strftime('%d %b %Y'),
        'order_id':       inv.order_id,
        'payment_status': inv.order.payment_status if inv.order else 'Pending',
        'download_url':   f'/api/billing/invoices/{inv.id}/download/',
    } for inv in invoices]
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def invoice_share(request, invoice_id):
    """
    GET /api/billing/invoices/<id>/share/
    Returns invoice data + PDF download URL + WhatsApp share link.
    """
    try:
        invoice = Invoice.objects.select_related('customer', 'order').prefetch_related('order__items__product').get(id=invoice_id)
    except Invoice.DoesNotExist:
        return Response({'error': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)

    user = request.user
    if not (user.is_staff or user.is_superuser):
        try:
            if invoice.customer != user.customer_profile:
                return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        except Exception:
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    pdf_url = request.build_absolute_uri(f'/api/billing/invoices/{invoice_id}/download/')

    items_text = '\n'.join([
        f"  • {item.product.product_name} x{item.get_total_bottles()} bottles = ₹{item.get_item_total()}"
        for item in invoice.order.items.all()
    ])
    wa_message = (
        f"🧾 *Invoice {invoice.invoice_number}*\n"
        f"Shop: {invoice.customer.shop_name}\n"
        f"Date: {invoice.created_at.strftime('%d %b %Y')}\n\n"
        f"*Items:*\n{items_text}\n\n"
        f"Subtotal: ₹{invoice.subtotal}\n"
        f"GST ({invoice.gst_percentage}%): ₹{invoice.gst_amount}\n"
        f"*Total: ₹{invoice.total_amount}*\n\n"
        f"Payment: {invoice.payment_method}\n"
        f"📄 Download: {pdf_url}\n\n"
        f"— Shree Ganesh Agency 🙏"
    )

    import urllib.parse
    wa_url = f"https://wa.me/?text={urllib.parse.quote(wa_message)}"

    return Response({
        'invoice_number':   invoice.invoice_number,
        'customer_name':    invoice.customer.shop_name,
        'total_amount':     float(invoice.total_amount),
        'date':             invoice.created_at.strftime('%d %b %Y'),
        'pdf_url':          pdf_url,
        'whatsapp_url':     wa_url,
        'whatsapp_message': wa_message,
    })
