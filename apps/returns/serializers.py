from rest_framework import serializers
from .models import ReturnRequest


class ReturnRequestSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.shop_name', read_only=True)
    order_date = serializers.DateTimeField(source='order.order_date', read_only=True)

    class Meta:
        model = ReturnRequest
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')
