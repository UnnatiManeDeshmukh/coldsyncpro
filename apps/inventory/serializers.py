from rest_framework import serializers
from .models import Stock
from apps.products.serializers import ProductSerializer


class StockSerializer(serializers.ModelSerializer):
    product_details = ProductSerializer(source='product', read_only=True)
    
    class Meta:
        model = Stock
        fields = '__all__'
        read_only_fields = ('updated_at', 'created_at')

    def validate_total_crates(self, value):
        if value < 0:
            raise serializers.ValidationError("Total crates cannot be negative")
        return value

    def validate_total_bottles(self, value):
        if value < 0:
            raise serializers.ValidationError("Total bottles cannot be negative")
        return value
