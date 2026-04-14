from rest_framework import serializers
from .models import Supplier, PurchaseOrder, PurchaseOrderItem
from apps.products.serializers import ProductSerializer


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    product_details = ProductSerializer(source='product', read_only=True)
    item_total = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrderItem
        fields = '__all__'

    def get_item_total(self, obj):
        return float(obj.get_total())


class PurchaseOrderSerializer(serializers.ModelSerializer):
    supplier_details = SupplierSerializer(source='supplier', read_only=True)
    items = PurchaseOrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = '__all__'
        read_only_fields = ('order_date', 'created_at', 'total_amount')


class PurchaseOrderCreateSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemSerializer(many=True)

    class Meta:
        model = PurchaseOrder
        fields = ['supplier', 'notes', 'items']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        po = PurchaseOrder.objects.create(**validated_data)
        total = 0
        for item_data in items_data:
            item = PurchaseOrderItem.objects.create(purchase_order=po, **item_data)
            total += float(item.get_total())
        po.total_amount = total
        po.save()
        return po
