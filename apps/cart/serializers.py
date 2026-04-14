from rest_framework import serializers
from .models import CartItem
from apps.products.serializers import ProductSerializer


class CartItemSerializer(serializers.ModelSerializer):
    product_details = ProductSerializer(source='product', read_only=True)
    subtotal = serializers.ReadOnlyField()

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'product_details', 'quantity', 'subtotal', 'added_at', 'updated_at']
        read_only_fields = ['added_at', 'updated_at']
