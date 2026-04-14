from rest_framework import viewsets, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from datetime import timedelta
from .models import Stock
from .serializers import StockSerializer


class StockViewSet(viewsets.ModelViewSet):
    queryset = Stock.objects.select_related('product').all()
    serializer_class = StockSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['warehouse_name', 'product']
    search_fields = ['warehouse_name', 'product__product_name']
    ordering_fields = ['updated_at', 'total_crates', 'total_bottles']

    def create(self, request, *args, **kwargs):
        """
        Upsert: if stock for this product+warehouse already exists,
        add the quantities instead of raising a unique_together error.
        """
        product_id     = request.data.get('product')
        warehouse_name = request.data.get('warehouse_name', 'Main Warehouse')
        new_crates     = int(request.data.get('total_crates', 0) or 0)
        new_bottles    = int(request.data.get('total_bottles', 0) or 0)

        existing = Stock.objects.filter(
            product_id=product_id,
            warehouse_name=warehouse_name
        ).first()

        if existing:
            existing.total_crates  = max(0, existing.total_crates  + new_crates)
            existing.total_bottles = max(0, existing.total_bottles + new_bottles)
            existing.save()
            serializer = self.get_serializer(existing)
            return Response(serializer.data, status=200)

        return super().create(request, *args, **kwargs)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def inventory_alerts(request):
    """
    Smart inventory alerts:
      - out_of_stock  : crates == 0 AND bottles == 0
      - critical      : crates < 2  (but not zero)
      - low_stock     : crates <= 5 (but not critical)
      - expiring_soon : product expiry_date within next 30 days
      - expired       : product expiry_date already passed
    """
    today = timezone.now().date()
    expiry_warning_date = today + timedelta(days=30)

    stocks = Stock.objects.select_related('product').all()
    alerts = []

    for stock in stocks:
        product = stock.product
        expiry = product.expiry_date

        # Stock-level alerts
        if stock.total_crates <= 0 and stock.total_bottles <= 0:
            alert_type = 'out_of_stock'
            severity = 'critical'
            message = 'Out of stock'
        elif stock.total_crates < 2:
            alert_type = 'critical'
            severity = 'critical'
            message = f'Only {max(0, stock.total_crates)} crate(s) left — critically low'
        elif stock.total_crates <= 5:
            alert_type = 'low_stock'
            severity = 'warning'
            message = f'{stock.total_crates} crates remaining — reorder soon'
        else:
            alert_type = None
            severity = None
            message = None

        # Expiry alerts (can stack on top of stock alert)
        expiry_alert = None
        if expiry and expiry < today:
            expiry_alert = {
                'alert_type': 'expired',
                'severity': 'critical',
                'message': f'Expired on {expiry.strftime("%d %b %Y")}',
            }
        elif expiry and expiry <= expiry_warning_date:
            days_left = (expiry - today).days
            expiry_alert = {
                'alert_type': 'expiring_soon',
                'severity': 'warning',
                'message': f'Expires in {days_left} day(s) ({expiry.strftime("%d %b %Y")})',
            }

        base = {
            'product_name': product.product_name,
            'brand': product.brand,
            'warehouse': stock.warehouse_name,
            'current_crates': stock.total_crates,
            'current_bottles': stock.total_bottles,
            'expiry_date': str(expiry) if expiry else None,
        }

        if alert_type:
            alerts.append({**base, 'alert_type': alert_type, 'severity': severity, 'message': message})

        if expiry_alert:
            # Avoid duplicate if already added with same stock alert
            if alert_type:
                # Merge expiry info into existing alert
                alerts[-1]['expiry_message'] = expiry_alert['message']
                alerts[-1]['expiry_alert_type'] = expiry_alert['alert_type']
            else:
                alerts.append({**base, **expiry_alert})

    # Sort: critical first, then warning
    severity_order = {'critical': 0, 'warning': 1}
    alerts.sort(key=lambda a: severity_order.get(a['severity'], 2))

    return Response({
        'total_alerts': len(alerts),
        'critical_count': sum(1 for a in alerts if a['severity'] == 'critical'),
        'warning_count': sum(1 for a in alerts if a['severity'] == 'warning'),
        'alerts': alerts,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def auto_replenish(request):
    """
    POST /api/inventory/auto-replenish/
    Scans all low-stock items (crates <= threshold) and auto-creates
    a Purchase Order for the first available supplier per product.
    Body: { threshold_crates: 5 }
    Returns: list of POs created.
    """
    if not (request.user.is_staff or request.user.is_superuser):
        return Response({'error': 'Admin only'}, status=403)

    threshold = int(request.data.get('threshold_crates', 5))
    low_stocks = Stock.objects.filter(total_crates__lte=threshold).select_related('product')

    from apps.suppliers.models import Supplier, PurchaseOrder, PurchaseOrderItem

    created_pos = []
    skipped = []

    for stock in low_stocks:
        product = stock.product
        # Find a supplier that has supplied this product before
        supplier_item = PurchaseOrderItem.objects.filter(
            product=product
        ).select_related('purchase_order__supplier').order_by('-purchase_order__order_date').first()

        if not supplier_item:
            # Fallback: use first available supplier
            supplier = Supplier.objects.first()
        else:
            supplier = supplier_item.purchase_order.supplier

        if not supplier:
            skipped.append(product.product_name)
            continue

        # Suggest ordering 10 crates to bring stock up
        order_crates = max(10, threshold * 2)
        avg_cost = PurchaseOrderItem.objects.filter(product=product).order_by('-id').values_list('cost_per_bottle', flat=True).first() or product.rate_per_bottle

        from django.db import transaction as _tx
        with _tx.atomic():
            po = PurchaseOrder.objects.create(
                supplier=supplier,
                notes=f'Auto-replenishment: {product.product_name} low stock ({stock.total_crates} crates)',
                total_amount=order_crates * product.crate_size * float(avg_cost),
            )
            PurchaseOrderItem.objects.create(
                purchase_order=po,
                product=product,
                quantity_crates=order_crates,
                quantity_bottles=0,
                cost_per_bottle=avg_cost,
            )
        created_pos.append({
            'po_id': po.id,
            'product': product.product_name,
            'supplier': supplier.name,
            'crates_ordered': order_crates,
            'current_stock': stock.total_crates,
        })

    return Response({
        'pos_created': len(created_pos),
        'skipped_no_supplier': skipped,
        'purchase_orders': created_pos,
    })
