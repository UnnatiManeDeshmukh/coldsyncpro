from rest_framework import serializers
from .models import Order, OrderItem
from apps.customers.serializers import CustomerSerializer
from apps.products.serializers import ProductSerializer


class OrderItemSerializer(serializers.ModelSerializer):
    product_details = ProductSerializer(source='product', read_only=True)
    item_total = serializers.SerializerMethodField()
    total_bottles = serializers.SerializerMethodField()
    
    class Meta:
        model = OrderItem
        fields = '__all__'
        read_only_fields = ('created_at',)

    def get_item_total(self, obj):
        return obj.get_item_total()

    def get_total_bottles(self, obj):
        return obj.get_total_bottles()

    def validate(self, data):
        if data.get('quantity_crates', 0) < 0:
            raise serializers.ValidationError("Quantity crates cannot be negative")
        if data.get('quantity_bottles', 0) < 0:
            raise serializers.ValidationError("Quantity bottles cannot be negative")
        if data.get('quantity_crates', 0) == 0 and data.get('quantity_bottles', 0) == 0:
            raise serializers.ValidationError("At least one quantity must be greater than 0")
        return data


class OrderSerializer(serializers.ModelSerializer):
    customer_details = CustomerSerializer(source='customer', read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = Order
        fields = '__all__'
        read_only_fields = ('order_date', 'total_amount', 'created_at', 'updated_at')


class OrderCreateSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)
    
    class Meta:
        model = Order
        fields = ['customer', 'payment_status', 'delivery_status', 'items']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        order = Order.objects.create(**validated_data)
        
        for item_data in items_data:
            OrderItem.objects.create(order=order, **item_data)
        
        order.calculate_total()
        return order
