from django.contrib import admin
from django.utils.html import format_html
from django import forms
from .models import Payment, Invoice, UpiConfig

ALLOWED_QR_TYPES = {'image/jpeg', 'image/png', 'image/webp'}
MAX_QR_SIZE_MB   = 3


class UpiConfigAdminForm(forms.ModelForm):
    class Meta:
        model = UpiConfig
        fields = '__all__'

    def clean_qr_image(self):
        img = self.cleaned_data.get('qr_image')
        if img and hasattr(img, 'size'):
            if img.size > MAX_QR_SIZE_MB * 1024 * 1024:
                raise forms.ValidationError(f"QR image too large. Max size is {MAX_QR_SIZE_MB}MB.")
            ct = getattr(img, 'content_type', '')
            if ct and ct not in ALLOWED_QR_TYPES:
                raise forms.ValidationError("Invalid image type. Use JPEG, PNG, or WebP.")
            name = getattr(img, 'name', '')
            ext  = name.rsplit('.', 1)[-1].lower() if '.' in name else ''
            if ext not in {'jpg', 'jpeg', 'png', 'webp'}:
                raise forms.ValidationError("Invalid extension. Use .jpg, .jpeg, .png, or .webp")
        return img


PAYMENT_METHOD_ICONS = {
    'Cash': '💵',
    'UPI': '📱',
    'Bank Transfer': '🏦',
    'Cheque': '📄',
    'Credit': '💳',
}


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        'payment_id', 'customer_display', 'amount_display',
        'method_badge', 'reference_display', 'payment_date_display'
    )
    list_filter = ('payment_method', 'payment_date')
    search_fields = ('customer__shop_name', 'reference_number')
    readonly_fields = ('payment_date', 'created_at')
    list_per_page = 25
    date_hierarchy = 'payment_date'

    fieldsets = (
        ('💳 Payment Info', {
            'fields': ('customer', 'order', 'amount', 'payment_method')
        }),
        ('📋 Reference', {
            'fields': ('reference_number', 'notes')
        }),
        ('🕒 Timestamps', {
            'fields': ('payment_date', 'created_at'),
            'classes': ('collapse',)
        }),
    )

    def payment_id(self, obj):
        return format_html(
            '<span style="font-family:monospace;font-weight:bold;color:#2c3e50;">PMT-{}</span>',
            '{:04d}'.format(obj.id)
        )
    payment_id.short_description = 'Payment ID'

    def customer_display(self, obj):
        return format_html(
            '<strong>{}</strong><br><small style="color:#999;">{}</small>',
            obj.customer.shop_name, obj.customer.owner_name
        )
    customer_display.short_description = 'Customer'

    def amount_display(self, obj):
        return format_html('<strong style="color:#27ae60;font-size:14px;">₹{}</strong>', '{:,.2f}'.format(obj.amount))
    amount_display.short_description = 'Amount'
    amount_display.admin_order_field = 'amount'

    def method_badge(self, obj):
        icon = PAYMENT_METHOD_ICONS.get(obj.payment_method, '💰')
        colors = {'Cash': '#27ae60', 'UPI': '#9b59b6', 'Bank Transfer': '#3498db', 'Cheque': '#e67e22', 'Credit': '#e74c3c'}
        color = colors.get(obj.payment_method, '#95a5a6')
        bg, border = color + '22', color + '44'
        return format_html(
            '<span style="background:{};color:{};border:1px solid {};'
            'padding:3px 10px;border-radius:12px;font-size:12px;">{} {}</span>',
            bg, color, border, icon, obj.payment_method
        )
    method_badge.short_description = 'Method'

    def reference_display(self, obj):
        if obj.reference_number:
            return format_html('<code style="background:#f5f5f5;padding:2px 6px;border-radius:4px;">{}</code>', obj.reference_number)
        return format_html('<span style="color:#ccc;">{}</span>', '—')
    reference_display.short_description = 'Reference'

    def payment_date_display(self, obj):
        return format_html('<span style="color:#555;">{}</span>', obj.payment_date.strftime('%d %b %Y, %I:%M %p'))
    payment_date_display.short_description = 'Date'


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = (
        'invoice_number_display', 'customer_display', 'order_link',
        'subtotal_display', 'gst_display', 'total_display', 'method_badge', 'created_display'
    )
    list_filter = ('payment_method', 'created_at')
    search_fields = ('invoice_number', 'customer__shop_name')
    readonly_fields = ('invoice_number', 'gst_amount', 'total_amount', 'created_at', 'updated_at')
    list_per_page = 25
    date_hierarchy = 'created_at'

    fieldsets = (
        ('🧾 Invoice Details', {
            'fields': ('invoice_number', 'order', 'customer')
        }),
        ('💰 Amounts', {
            'fields': ('subtotal', 'gst_percentage', 'gst_amount', 'total_amount')
        }),
        ('💳 Payment', {
            'fields': ('payment_method',)
        }),
        ('🕒 Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def invoice_number_display(self, obj):
        return format_html(
            '<span style="font-family:monospace;font-weight:bold;color:#C00000;">{}</span>',
            obj.invoice_number
        )
    invoice_number_display.short_description = 'Invoice #'

    def customer_display(self, obj):
        return format_html(
            '<strong>{}</strong><br><small style="color:#999;">{}</small>',
            obj.customer.shop_name, obj.customer.owner_name
        )
    customer_display.short_description = 'Customer'

    def order_link(self, obj):
        return format_html(
            '<a href="/admin/orders/order/{}/change/" style="font-family:monospace;">Order #{}</a>',
            obj.order.id, obj.order.id
        )
    order_link.short_description = 'Order'

    def subtotal_display(self, obj):
        return format_html('₹{}', '{:,.2f}'.format(obj.subtotal))
    subtotal_display.short_description = 'Subtotal'

    def gst_display(self, obj):
        return format_html(
            '<span style="color:#e67e22;">₹{} <small>({}%)</small></span>',
            '{:,.2f}'.format(obj.gst_amount), obj.gst_percentage
        )
    gst_display.short_description = 'GST'

    def total_display(self, obj):
        return format_html('<strong style="color:#C00000;font-size:14px;">₹{}</strong>', '{:,.2f}'.format(obj.total_amount))
    total_display.short_description = 'Total'
    total_display.admin_order_field = 'total_amount'

    def method_badge(self, obj):
        icon = PAYMENT_METHOD_ICONS.get(obj.payment_method, '💰')
        colors = {'Cash': '#27ae60', 'UPI': '#9b59b6', 'Bank Transfer': '#3498db', 'Credit': '#e74c3c'}
        color = colors.get(obj.payment_method, '#95a5a6')
        bg, border = color + '22', color + '44'
        return format_html(
            '<span style="background:{};color:{};border:1px solid {};'
            'padding:3px 10px;border-radius:12px;font-size:12px;">{} {}</span>',
            bg, color, border, icon, obj.payment_method
        )
    method_badge.short_description = 'Method'

    def created_display(self, obj):
        return format_html('<span style="color:#555;">{}</span>', obj.created_at.strftime('%d %b %Y'))
    created_display.short_description = 'Date'


@admin.register(UpiConfig)
class UpiConfigAdmin(admin.ModelAdmin):
    form = UpiConfigAdminForm
    list_display = ('upi_name_display', 'upi_id_display', 'bank_name', 'qr_preview', 'status_badge', 'updated_at_display')
    readonly_fields = ('updated_at', 'qr_preview_large')
    list_per_page = 5

    fieldsets = (
        ('📱 UPI Details', {
            'fields': ('upi_id', 'upi_name', 'bank_name'),
            'description': 'Enter your UPI ID and account name exactly as registered.',
        }),
        ('🖼️ QR Code Image', {
            'fields': ('qr_image', 'qr_preview_large'),
            'description': (
                '⬆️ Upload your PhonePe / GPay / Paytm QR code image here. '
                'This will be shown to customers during payment. '
                'Recommended: screenshot your QR from PhonePe app → Download QR option.'
            ),
        }),
        ('⚙️ Status', {
            'fields': ('is_active', 'updated_at'),
        }),
    )

    def upi_name_display(self, obj):
        return format_html(
            '<strong style="color:#C00000;font-size:14px;">{}</strong>',
            obj.upi_name
        )
    upi_name_display.short_description = 'Name'

    def upi_id_display(self, obj):
        return format_html(
            '<code style="background:#f0f4ff;color:#1a3a8f;padding:3px 10px;'
            'border-radius:6px;font-size:13px;font-weight:bold;">{}</code>',
            obj.upi_id
        )
    upi_id_display.short_description = 'UPI ID'

    def qr_preview(self, obj):
        if obj.qr_image:
            return format_html(
                '<img src="{}" style="width:60px;height:60px;object-fit:contain;'
                'border-radius:8px;border:2px solid #ddd;background:#fff;padding:2px;" />',
                obj.qr_image.url
            )
        return format_html('<span style="color:#ccc;font-size:12px;">No image</span>')
    qr_preview.short_description = 'QR Preview'

    def qr_preview_large(self, obj):
        if obj.qr_image:
            return format_html(
                '<div style="margin-top:8px;">'
                '<img src="{}" style="width:220px;height:220px;object-fit:contain;'
                'border-radius:12px;border:3px solid #C00000;background:#fff;padding:8px;'
                'box-shadow:0 4px 20px rgba(192,0,0,0.2);" />'
                '<p style="color:#666;font-size:12px;margin-top:6px;">👆 This QR will be shown to customers during payment</p>'
                '</div>',
                obj.qr_image.url
            )
        return format_html(
            '<div style="width:220px;height:220px;border:2px dashed #ddd;border-radius:12px;'
            'display:flex;align-items:center;justify-content:center;color:#aaa;font-size:13px;">'
            '📷 Upload QR image above</div>'
        )
    qr_preview_large.short_description = 'QR Code Preview'

    def status_badge(self, obj):
        if obj.is_active:
            return format_html(
                '<span style="background:#d4edda;color:#155724;border:1px solid #c3e6cb;'
                'padding:3px 12px;border-radius:12px;font-size:12px;font-weight:600;">✅ Active</span>'
            )
        return format_html(
            '<span style="background:#f8d7da;color:#721c24;border:1px solid #f5c6cb;'
            'padding:3px 12px;border-radius:12px;font-size:12px;">❌ Inactive</span>'
        )
    status_badge.short_description = 'Status'

    def updated_at_display(self, obj):
        return format_html(
            '<span style="color:#888;font-size:12px;">{}</span>',
            obj.updated_at.strftime('%d %b %Y, %I:%M %p')
        )
    updated_at_display.short_description = 'Last Updated'

    def has_add_permission(self, request):
        # Only allow one config record
        return not UpiConfig.objects.exists()
