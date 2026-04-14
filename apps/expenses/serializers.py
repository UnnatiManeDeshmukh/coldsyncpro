from rest_framework import serializers
from .models import CreditTransaction, Expense
from apps.customers.serializers import CustomerSerializer
from apps.billing.serializers import InvoiceSerializer


class CreditTransactionSerializer(serializers.ModelSerializer):
    customer_details = CustomerSerializer(source='customer', read_only=True)
    invoice_details = InvoiceSerializer(source='invoice', read_only=True)
    remaining_amount = serializers.ReadOnlyField()
    
    class Meta:
        model = CreditTransaction
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')

    def validate(self, data):
        if data.get('amount_paid', 0) > data.get('amount_due', 0):
            raise serializers.ValidationError("Amount paid cannot exceed amount due")
        return data


class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Expense amount must be greater than 0")
        return value
