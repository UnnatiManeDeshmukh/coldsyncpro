from django.contrib import admin
from .models import Supplier, PurchaseOrder, PurchaseOrderItem


class PurchaseOrderItemInline(admin.TabularInline):
    model = PurchaseOrderItem
    extra = 1


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ['name', 'contact_person', 'phone', 'email', 'created_at']
    search_fields = ['name', 'contact_person', 'phone']


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'supplier', 'status', 'total_amount', 'order_date']
    list_filter = ['status', 'supplier']
    inlines = [PurchaseOrderItemInline]
