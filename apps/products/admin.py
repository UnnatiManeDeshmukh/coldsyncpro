from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from .models import Product


BRAND_COLORS = {
    'CocaCola': '#F40009',
    'Sprite': '#00D664',
    'Fanta': '#FF8300',
    'ThumbsUp': '#0066CC',
    'Limca': '#00CC44',
    'Kinley': '#0099FF',
}

BRAND_EMOJIS = {
    'CocaCola': '🥤',
    'Sprite': '💚',
    'Fanta': '🍊',
    'ThumbsUp': '👍',
    'Limca': '🍋',
    'Kinley': '💧',
}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        'product_badge', 'brand_badge', 'bottle_size_display',
        'crate_size', 'rate_display', 'expiry_display', 'stock_count', 'image_thumb'
    )
    list_filter = ('brand', 'bottle_size')
    search_fields = ('product_name', 'brand')
    readonly_fields = ('created_at', 'updated_at', 'image_preview')
    list_per_page = 20

    fieldsets = (
        ('🥤 Product Details', {
            'fields': ('product_name', 'brand', 'bottle_size', 'crate_size')
        }),
        ('🖼️ Product Image', {
            'fields': ('image', 'image_preview'),
        }),
        ('💰 Pricing', {
            'fields': ('rate_per_bottle',)
        }),
        ('📅 Dates', {
            'fields': ('expiry_date', 'created_at', 'updated_at'),
        }),
    )

    def product_badge(self, obj):
        color = BRAND_COLORS.get(obj.brand, '#999')
        emoji = BRAND_EMOJIS.get(obj.brand, '🥤')
        bg = color + '22'
        return format_html(
            '<div style="display:flex;align-items:center;gap:8px;">'
            '<div style="width:30px;height:30px;border-radius:50%;background:{};'
            'border:2px solid {};display:flex;align-items:center;justify-content:center;font-size:14px;">{}</div>'
            '<span style="font-weight:600;">{}</span></div>',
            bg, color, emoji, obj.product_name
        )
    product_badge.short_description = 'Product'
    product_badge.admin_order_field = 'product_name'

    def brand_badge(self, obj):
        color = BRAND_COLORS.get(obj.brand, '#999')
        bg = color + '22'
        border = color + '44'
        return format_html(
            '<span style="background:{};color:{};border:1px solid {};'
            'padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;">{}</span>',
            bg, color, border, obj.brand
        )
    brand_badge.short_description = 'Brand'
    brand_badge.admin_order_field = 'brand'

    def bottle_size_display(self, obj):
        return format_html(
            '<span style="background:#f0f0f0;padding:2px 8px;border-radius:8px;font-size:12px;">{}</span>',
            obj.bottle_size
        )
    bottle_size_display.short_description = 'Size'

    def rate_display(self, obj):
        return format_html('<strong style="color:#27ae60;">₹{}/bottle</strong>', '{}'.format(obj.rate_per_bottle))
    rate_display.short_description = 'Rate'
    rate_display.admin_order_field = 'rate_per_bottle'

    def expiry_display(self, obj):
        today = timezone.now().date()
        days_left = (obj.expiry_date - today).days
        if days_left < 0:
            color, label = '#e74c3c', f'Expired {abs(days_left)}d ago'
        elif days_left <= 30:
            color, label = '#e67e22', f'⚠️ {days_left}d left'
        elif days_left <= 90:
            color, label = '#f39c12', f'{days_left}d left'
        else:
            color, label = '#27ae60', obj.expiry_date.strftime('%d %b %Y')
        return format_html('<span style="color:{};">{}</span>', color, label)
    expiry_display.short_description = 'Expiry'
    expiry_display.admin_order_field = 'expiry_date'

    def stock_count(self, obj):
        total_crates = sum(s.total_crates for s in obj.stocks.all())
        if total_crates == 0:
            return format_html('<span style="color:#e74c3c;">{}</span>', '⚠️ No Stock')
        color = '#e74c3c' if total_crates < 5 else '#f39c12' if total_crates < 20 else '#27ae60'
        return format_html('<span style="color:{};">{}</span>', color, '📦 {} crates'.format(total_crates))
    stock_count.short_description = 'Stock'

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('stocks')

    def image_thumb(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="width:40px;height:40px;object-fit:cover;border-radius:8px;" />', obj.image.url)
        return format_html('<span style="color:#999;font-size:11px;">{}</span>', 'No image')
    image_thumb.short_description = 'Image'

    def image_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="max-width:200px;max-height:200px;border-radius:12px;border:2px solid #eee;" />', obj.image.url)
        return format_html('<span style="color:#999;">{}</span>', 'No image uploaded yet')
    image_preview.short_description = 'Image Preview'
