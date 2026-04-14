from django.contrib import admin
from django.utils.html import format_html, mark_safe
from django.db.models import Sum, Count
from .models import Customer


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = (
        'shop_badge', 'owner_name', 'phone_display', 'village',
        'credit_limit_display', 'order_count', 'total_spent_display', 'created_at'
    )
    list_filter = ('village', 'created_at')
    search_fields = ('shop_name', 'owner_name', 'phone', 'village')
    readonly_fields = ('created_at', 'updated_at', 'order_summary')
    list_per_page = 25
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)

    fieldsets = (
        ('🏪 Shop Information', {
            'fields': ('shop_name', 'owner_name', 'phone')
        }),
        ('📍 Location', {
            'fields': ('village', 'address')
        }),
        ('💳 Credit & Account', {
            'fields': ('user', 'credit_limit', 'order_summary')
        }),
        ('🕒 Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def shop_badge(self, obj):
        initials = obj.shop_name[:2].upper()
        colors = ['#C00000', '#F5B400', '#0066CC', '#00D664', '#FF8300', '#9B59B6']
        color = colors[obj.id % len(colors)]
        return format_html(
            '<div style="display:flex;align-items:center;gap:8px;">'
            '<div style="width:32px;height:32px;border-radius:8px;background:{};'
            'display:flex;align-items:center;justify-content:center;'
            'color:white;font-weight:bold;font-size:11px;flex-shrink:0;">{}</div>'
            '<span style="font-weight:600;">{}</span></div>',
            color, initials, obj.shop_name
        )
    shop_badge.short_description = 'Shop Name'
    shop_badge.admin_order_field = 'shop_name'

    def phone_display(self, obj):
        return format_html('<span style="font-family:monospace;">📞 {}</span>', obj.phone)
    phone_display.short_description = 'Phone'

    def credit_limit_display(self, obj):
        color = '#e74c3c' if obj.credit_limit > 50000 else '#f39c12' if obj.credit_limit > 10000 else '#27ae60'
        return format_html(
            '<span style="color:{};font-weight:bold;">₹{}</span>',
            color, '{:,.0f}'.format(obj.credit_limit)
        )
    credit_limit_display.short_description = 'Credit Limit'
    credit_limit_display.admin_order_field = 'credit_limit'

    def order_count(self, obj):
        count = obj.orders.count()
        color = '#27ae60' if count > 10 else '#f39c12' if count > 3 else '#95a5a6'
        return format_html(
            '<span style="background:{};color:white;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:bold;">{}</span>',
            color, count
        )
    order_count.short_description = 'Orders'

    def total_spent_display(self, obj):
        total = obj.orders.aggregate(t=Sum('total_amount'))['t'] or 0
        return format_html('<strong style="color:#F5B400;">₹{}</strong>', '{:,.0f}'.format(total))
    total_spent_display.short_description = 'Total Spent'

    def order_summary(self, obj):
        orders = obj.orders.all()[:5]
        if not orders:
            return format_html('<em style="color:#999;">{}</em>', 'No orders yet')
        rows = mark_safe(''.join(
            '<tr><td style="padding:4px 8px;">#{}</td>'
            '<td style="padding:4px 8px;">₹{}</td>'
            '<td style="padding:4px 8px;">{}</td>'
            '<td style="padding:4px 8px;">{}</td></tr>'.format(
                o.id,
                '{:,.0f}'.format(o.total_amount),
                o.payment_status,
                o.order_date.strftime('%d %b %Y'),
            )
            for o in orders
        ))
        return format_html(
            '<table style="border-collapse:collapse;width:100%;font-size:13px;">'
            '<thead><tr style="background:#f5f5f5;">'
            '<th style="padding:4px 8px;text-align:left;">Order</th>'
            '<th style="padding:4px 8px;text-align:left;">Amount</th>'
            '<th style="padding:4px 8px;text-align:left;">Status</th>'
            '<th style="padding:4px 8px;text-align:left;">Date</th>'
            '</tr></thead><tbody>{}</tbody></table>',
            rows
        )
    order_summary.short_description = 'Recent Orders'

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('orders')
