from rest_framework import serializers
from .models import Payment, Invoice
from apps.customers.serializers import CustomerSerializer
from apps.orders.serializers import OrderSerializer


class PaymentSerializer(serializers.ModelSerializer):
    customer_details = CustomerSerializer(source='customer', read_only=True)
    order_details = OrderSerializer(source='order', read_only=True)

    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ('payment_date', 'created_at', 'verified_by', 'verified_at')

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Payment amount must be greater than 0")
        return value


class InvoiceSerializer(serializers.ModelSerializer):
    customer_details = CustomerSerializer(source='customer', read_only=True)
    order_details = OrderSerializer(source='order', read_only=True)
    
    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = ('invoice_number', 'gst_amount', 'total_amount', 'created_at', 'updated_at')

    def validate_subtotal(self, value):
        if value <= 0:
            raise serializers.ValidationError("Subtotal must be greater than 0")
        return value


class InvoiceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = ['order', 'customer', 'subtotal', 'gst_percentage', 'payment_method']
