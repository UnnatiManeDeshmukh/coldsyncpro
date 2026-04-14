from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from .models import Order, OrderItem, DeliveryDriver


PAYMENT_COLORS = {
    'Pending': ('#e74c3c', '⏳'),
    'Partial': ('#e67e22', '🔶'),
    'Paid': ('#27ae60', '✅'),
}

DELIVERY_COLORS = {
    'Order Placed': ('#95a5a6', '📋'),
    'Order Confirmed': ('#3498db', '✔️'),
    'Processing': ('#9b59b6', '⚙️'),
    'Out for Delivery': ('#e67e22', '🚚'),
    'Delivered': ('#27ae60', '✅'),
    'Cancelled': ('#e74c3c', '❌'),
}


@admin.register(DeliveryDriver)
class DeliveryDriverAdmin(admin.ModelAdmin):
    list_display = ('driver_card', 'phone_display', 'email_display', 'vehicle_display', 'status_badge', 'active_orders_count')
    list_filter = ('is_active',)
    search_fields = ('name', 'phone', 'vehicle_number')
    list_per_page = 20

    fieldsets = (
        ('👤 Driver Info', {
            'fields': ('name', 'phone', 'email'),
            'description': 'Driver contact details. Customer will see phone & email to contact driver.',
        }),
        ('🚗 Vehicle Info', {
            'fields': ('vehicle_number', 'vehicle_type'),
        }),
        ('⚙️ Status', {
            'fields': ('is_active',),
        }),
    )

    def driver_card(self, obj):
        initials = ''.join(w[0].upper() for w in obj.name.split()[:2])
        return format_html(
            '<div style="display:flex;align-items:center;gap:10px;">'
            '<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#C00000,#8B0000);'
            'display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:13px;">{}</div>'
            '<strong style="font-size:14px;">{}</strong></div>',
            initials, obj.name
        )
    driver_card.short_description = 'Driver'

    def phone_display(self, obj):
        return format_html(
            '<a href="tel:{}" style="color:#3498db;font-family:monospace;">📱 {}</a>',
            obj.phone, obj.phone
        )
    phone_display.short_description = 'Phone'

    def email_display(self, obj):
        if obj.email:
            return format_html(
                '<a href="mailto:{}" style="color:#27ae60;font-size:12px;">✉️ {}</a>',
                obj.email, obj.email
            )
        return format_html('<span style="color:#ccc;">—</span>')
    email_display.short_description = 'Email'

    def vehicle_display(self, obj):
        if obj.vehicle_number:
            return format_html(
                '<span style="background:#f0f4ff;color:#1a3a8f;padding:2px 8px;'
                'border-radius:6px;font-family:monospace;font-size:12px;">🚗 {} {}</span>',
                obj.vehicle_number, f'({obj.vehicle_type})' if obj.vehicle_type else ''
            )
        return format_html('<span style="color:#ccc;">—</span>')
    vehicle_display.short_description = 'Vehicle'

    def status_badge(self, obj):
        if obj.is_active:
            return format_html(
                '<span style="background:#d4edda;color:#155724;border:1px solid #c3e6cb;'
                'padding:3px 10px;border-radius:12px;font-size:12px;">✅ Active</span>'
            )
        return format_html(
            '<span style="background:#f8d7da;color:#721c24;border:1px solid #f5c6cb;'
            'padding:3px 10px;border-radius:12px;font-size:12px;">❌ Inactive</span>'
        )
    status_badge.short_description = 'Status'

    def active_orders_count(self, obj):
        count = obj.orders.filter(
            delivery_status__in=['Out for Delivery', 'Processing', 'Order Confirmed']
        ).count()
        color = '#e74c3c' if count > 0 else '#27ae60'
        return format_html(
            '<span style="background:{};color:white;padding:2px 10px;'
            'border-radius:12px;font-size:12px;font-weight:bold;">{} active</span>',
            color + 'cc', count
        )
    active_orders_count.short_description = 'Active Orders'


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('item_total_display', 'created_at')
    fields = ('product', 'quantity_crates', 'quantity_bottles', 'price', 'item_total_display')

    def item_total_display(self, obj):
        if obj.pk:
            total = obj.get_item_total()
            return format_html('<strong style="color:#27ae60;">₹{}</strong>', '{:,.2f}'.format(total))
        return '-'
    item_total_display.short_description = 'Item Total'


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        'order_id_badge', 'customer_display', 'order_date_display',
        'total_display', 'payment_badge', 'delivery_badge', 'items_count'
    )
    list_filter = ('payment_status', 'delivery_status', 'order_date')
    search_fields = ('customer__shop_name', 'customer__owner_name', 'id')
    readonly_fields = ('order_date', 'total_amount', 'created_at', 'updated_at')
    inlines = [OrderItemInline]
    list_per_page = 25
    date_hierarchy = 'order_date'
    ordering = ('-order_date',)
    actions = ['mark_as_paid', 'mark_as_delivered']

    fieldsets = (
        ('📋 Order Info', {
            'fields': ('customer', 'total_amount', 'order_date')
        }),
        ('💳 Payment & Delivery', {
            'fields': ('payment_status', 'delivery_status')
        }),
        ('🚚 Delivery Details', {
            'fields': ('assigned_driver', 'delivery_vehicle', 'delivery_driver', 'delivery_driver_phone', 'delivery_driver_email', 'delivery_notes', 'estimated_delivery', 'actual_delivery'),
            'description': '💡 Select a saved driver from "Assigned Driver" — phone/email will auto-fill. Customer gets notified automatically when status = Out for Delivery.',
        }),
        ('🕒 Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def order_id_badge(self, obj):
        return format_html(
            '<span style="background:#2c3e50;color:white;padding:3px 10px;'
            'border-radius:8px;font-family:monospace;font-weight:bold;">#{}</span>',
            obj.id
        )
    order_id_badge.short_description = 'Order ID'
    order_id_badge.admin_order_field = 'id'

    def customer_display(self, obj):
        return format_html(
            '<div><strong>{}</strong><br>'
            '<small style="color:#999;">{}</small></div>',
            obj.customer.shop_name, obj.customer.owner_name
        )
    customer_display.short_description = 'Customer'
    customer_display.admin_order_field = 'customer__shop_name'

    def order_date_display(self, obj):
        return format_html(
            '<span style="color:#555;">{}</span>',
            obj.order_date.strftime('%d %b %Y, %I:%M %p')
        )
    order_date_display.short_description = 'Date'
    order_date_display.admin_order_field = 'order_date'

    def total_display(self, obj):
        return format_html('<strong style="color:#C00000;font-size:14px;">₹{}</strong>', '{:,.0f}'.format(obj.total_amount))
    total_display.short_description = 'Total'
    total_display.admin_order_field = 'total_amount'

    def payment_badge(self, obj):
        color, icon = PAYMENT_COLORS.get(obj.payment_status, ('#999', ''))
        bg = color + '22'
        border = color + '44'
        return format_html(
            '<span style="background:{};color:{};border:1px solid {};'
            'padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;">{} {}</span>',
            bg, color, border, icon, obj.payment_status
        )
    payment_badge.short_description = 'Payment'
    payment_badge.admin_order_field = 'payment_status'

    def delivery_badge(self, obj):
        color, icon = DELIVERY_COLORS.get(obj.delivery_status, ('#999', ''))
        bg = color + '22'
        border = color + '44'
        return format_html(
            '<span style="background:{};color:{};border:1px solid {};'
            'padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;">{} {}</span>',
            bg, color, border, icon, obj.delivery_status
        )
    delivery_badge.short_description = 'Delivery'
    delivery_badge.admin_order_field = 'delivery_status'

    def items_count(self, obj):
        count = obj.items.count()
        return format_html(
            '<span style="background:#ecf0f1;padding:2px 8px;border-radius:8px;font-size:12px;">{} item{}</span>',
            count, 's' if count != 1 else ''
        )
    items_count.short_description = 'Items'

    @admin.action(description='✅ Mark selected orders as Paid')
    def mark_as_paid(self, request, queryset):
        updated = queryset.update(payment_status='Paid')
        self.message_user(request, f'{updated} order(s) marked as Paid.')

    @admin.action(description='🚚 Mark selected orders as Delivered')
    def mark_as_delivered(self, request, queryset):
        updated = queryset.update(delivery_status='Delivered', actual_delivery=timezone.now())
        self.message_user(request, f'{updated} order(s) marked as Delivered.')

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('customer').prefetch_related('items')


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('order_link', 'product_display', 'quantity_crates', 'quantity_bottles', 'price_display', 'item_total_display')
    list_filter = ('product__brand', 'created_at')
    search_fields = ('order__id', 'product__product_name')
    readonly_fields = ('created_at',)

    def order_link(self, obj):
        return format_html(
            '<a href="/admin/orders/order/{}/change/" style="font-family:monospace;font-weight:bold;">#{}</a>',
            obj.order.id, obj.order.id
        )
    order_link.short_description = 'Order'

    def product_display(self, obj):
        from apps.products.admin import BRAND_COLORS
        color = BRAND_COLORS.get(obj.product.brand, '#999')
        return format_html(
            '<span style="color:{};">●</span> <strong>{}</strong> <small style="color:#999;">({})</small>',
            color, obj.product.product_name, obj.product.brand
        )
    product_display.short_description = 'Product'

    def price_display(self, obj):
        return format_html('₹{}/bottle', obj.price)
    price_display.short_description = 'Price'

    def item_total_display(self, obj):
        return format_html('<strong style="color:#27ae60;">₹{}</strong>', '{:,.2f}'.format(obj.get_item_total()))
    item_total_display.short_description = 'Total'
