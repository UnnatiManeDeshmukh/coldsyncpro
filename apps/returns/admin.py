from django.contrib import admin
from .models import ReturnRequest


@admin.register(ReturnRequest)
class ReturnRequestAdmin(admin.ModelAdmin):
    list_display = ['id', 'customer', 'order', 'reason', 'return_type', 'refund_amount', 'status', 'created_at']
    list_filter = ['status', 'return_type', 'reason']
    search_fields = ['customer__shop_name']
