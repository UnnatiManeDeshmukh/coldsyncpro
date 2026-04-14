from rest_framework import serializers
from .models import RecurringOrder, RecurringOrderItem
from apps.products.serializers import ProductSerializer


class RecurringOrderItemSerializer(serializers.ModelSerializer):
    product_details = ProductSerializer(source='product', read_only=True)

    class Meta:
        model = RecurringOrderItem
        fields = '__all__'
        read_only_fields = ('recurring_order',)


class RecurringOrderSerializer(serializers.ModelSerializer):
    items = RecurringOrderItemSerializer(many=True, read_only=True)
    customer_name = serializers.CharField(source='customer.shop_name', read_only=True)

    class Meta:
        model = RecurringOrder
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')


class RecurringOrderCreateSerializer(serializers.ModelSerializer):
    items = RecurringOrderItemSerializer(many=True)

    class Meta:
        model = RecurringOrder
        fields = ['customer', 'frequency', 'next_order_date', 'notes', 'items']
        extra_kwargs = {'customer': {'required': False}}

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError("At least one product is required.")
        for item in items:
            if not item.get('product'):
                raise serializers.ValidationError("Each item must have a product selected.")
            if item.get('quantity_crates', 0) == 0 and item.get('quantity_bottles', 0) == 0:
                raise serializers.ValidationError("Each item must have quantity > 0.")
        return items

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        obj = RecurringOrder.objects.create(**validated_data)
        for item in items_data:
            RecurringOrderItem.objects.create(recurring_order=obj, **item)
        return obj
