from django.contrib import admin
from django.utils.html import format_html
from .models import Stock


@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = (
        'product_display', 'brand_badge', 'warehouse_display',
        'crates_display', 'bottles_display', 'stock_status', 'updated_display'
    )
    list_filter = ('warehouse_name', 'product__brand', 'updated_at')
    search_fields = ('product__product_name', 'warehouse_name')
    readonly_fields = ('created_at', 'updated_at', 'stock_health_bar')
    list_per_page = 25
    ordering = ('total_crates',)
    actions = ['flag_low_stock']

    fieldsets = (
        ('📦 Stock Info', {
            'fields': ('product', 'warehouse_name')
        }),
        ('📊 Quantities', {
            'fields': ('total_crates', 'total_bottles', 'stock_health_bar')
        }),
        ('🕒 Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    BRAND_COLORS = {
        'CocaCola': '#F40009', 'Sprite': '#00D664', 'Fanta': '#FF8300',
        'ThumbsUp': '#0066CC', 'Limca': '#00CC44', 'Kinley': '#0099FF',
    }

    def product_display(self, obj):
        color = self.BRAND_COLORS.get(obj.product.brand, '#999')
        return format_html(
            '<div style="display:flex;align-items:center;gap:8px;">'
            '<div style="width:8px;height:8px;border-radius:50%;background:{};flex-shrink:0;"></div>'
            '<strong>{}</strong></div>',
            color, obj.product.product_name
        )
    product_display.short_description = 'Product'
    product_display.admin_order_field = 'product__product_name'

    def brand_badge(self, obj):
        color = self.BRAND_COLORS.get(obj.product.brand, '#999')
        bg, border = color + '22', color + '44'
        return format_html(
            '<span style="background:{};color:{};border:1px solid {};'
            'padding:2px 8px;border-radius:10px;font-size:12px;">{}</span>',
            bg, color, border, obj.product.brand
        )
    brand_badge.short_description = 'Brand'

    def warehouse_display(self, obj):
        return format_html(
            '<span style="background:#ecf0f1;padding:3px 10px;border-radius:8px;font-size:12px;">{}</span>',
            '🏭 ' + obj.warehouse_name
        )
    warehouse_display.short_description = 'Warehouse'

    def crates_display(self, obj):
        color = '#e74c3c' if obj.total_crates < 2 else '#e67e22' if obj.total_crates <= 5 else '#27ae60'
        return format_html(
            '<span style="color:{};font-weight:bold;font-size:15px;">{} crates</span>',
            color, obj.total_crates
        )
    crates_display.short_description = 'Crates'
    crates_display.admin_order_field = 'total_crates'

    def bottles_display(self, obj):
        return format_html(
            '<span style="color:#555;">{} btl</span>',
            obj.total_bottles
        )
    bottles_display.short_description = 'Bottles'

    def stock_status(self, obj):
        if obj.total_crates < 2:
            return format_html(
                '<span style="background:#fde8e8;color:#e74c3c;border:1px solid #f5c6c6;'
                'padding:3px 10px;border-radius:12px;font-size:12px;font-weight:bold;">{}</span>',
                '🔴 Critical'
            )
        elif obj.total_crates <= 5:
            return format_html(
                '<span style="background:#fef3e2;color:#e67e22;border:1px solid #fad7a0;'
                'padding:3px 10px;border-radius:12px;font-size:12px;font-weight:bold;">{}</span>',
                '🟡 Low'
            )
        else:
            return format_html(
                '<span style="background:#e8f8f0;color:#27ae60;border:1px solid #a9dfbf;'
                'padding:3px 10px;border-radius:12px;font-size:12px;font-weight:bold;">{}</span>',
                '🟢 Good'
            )
    stock_status.short_description = 'Status'

    def stock_health_bar(self, obj):
        max_crates = 100
        pct = min(int((obj.total_crates / max_crates) * 100), 100)
        color = '#e74c3c' if pct < 5 else '#e67e22' if pct < 20 else '#27ae60'
        return format_html(
            '<div style="background:#f0f0f0;border-radius:8px;height:16px;width:300px;overflow:hidden;">'
            '<div style="background:{};height:100%;width:{}%;border-radius:8px;transition:width 0.3s;"></div>'
            '</div><small style="color:#999;">{} / {} crates</small>',
            color, pct, obj.total_crates, max_crates
        )
    stock_health_bar.short_description = 'Stock Level'

    def updated_display(self, obj):
        return format_html('<span style="color:#999;font-size:12px;">{}</span>', obj.updated_at.strftime('%d %b %Y'))
    updated_display.short_description = 'Updated'

    @admin.action(description='⚠️ Export low stock items')
    def flag_low_stock(self, request, queryset):
        low = queryset.filter(total_crates__lte=5).count()
        self.message_user(request, f'{low} low stock item(s) identified.')

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('product')
