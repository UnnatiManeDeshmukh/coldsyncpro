from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from .models import Supplier, PurchaseOrder
from .serializers import (
    SupplierSerializer, PurchaseOrderSerializer, PurchaseOrderCreateSerializer
)
from apps.inventory.models import Stock


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'contact_person', 'phone']


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.select_related('supplier').prefetch_related('items__product').all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['supplier', 'status']
    ordering_fields = ['order_date', 'total_amount']

    def get_serializer_class(self):
        if self.action == 'create':
            return PurchaseOrderCreateSerializer
        return PurchaseOrderSerializer

    @action(detail=True, methods=['post'])
    def mark_received(self, request, pk=None):
        """Mark PO as received and update inventory stock"""
        po = self.get_object()
        if po.status == 'Received':
            return Response({'error': 'Already received'}, status=status.HTTP_400_BAD_REQUEST)

        for item in po.items.all():
            # Use 'Main Warehouse' as default; get_or_create needs warehouse_name
            stock, _ = Stock.objects.get_or_create(
                product=item.product,
                warehouse_name='Main Warehouse',
                defaults={'total_crates': 0, 'total_bottles': 0}
            )
            stock.total_crates += item.quantity_crates
            stock.total_bottles += item.quantity_bottles
            stock.save()

        po.status = 'Received'
        po.save()
        return Response({'status': 'Purchase order marked as received, inventory updated'})
