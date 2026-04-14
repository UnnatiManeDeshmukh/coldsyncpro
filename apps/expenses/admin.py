from django.contrib import admin
from django.utils.html import format_html
from .models import CreditTransaction, Expense


CREDIT_STATUS_CONFIG = {
    'Pending': ('#e74c3c', '⏳', '#fde8e8', '#f5c6c6'),
    'Partial': ('#e67e22', '🔶', '#fef3e2', '#fad7a0'),
    'Paid': ('#27ae60', '✅', '#e8f8f0', '#a9dfbf'),
}

EXPENSE_CATEGORY_ICONS = {
    'Transport': '🚚',
    'Salary': '👷',
    'Maintenance': '🔧',
    'Utilities': '💡',
    'Marketing': '📢',
    'Other': '📌',
}


@admin.register(CreditTransaction)
class CreditTransactionAdmin(admin.ModelAdmin):
    list_display = (
        'credit_id', 'customer_display', 'invoice_link',
        'amount_due_display', 'amount_paid_display', 'remaining_display',
        'status_badge', 'payment_date'
    )
    list_filter = ('status', 'payment_date', 'created_at')
    search_fields = ('customer__shop_name', 'invoice__invoice_number')
    readonly_fields = ('created_at', 'updated_at', 'remaining_amount_display')
    list_per_page = 25
    date_hierarchy = 'created_at'
    actions = ['mark_as_paid']

    fieldsets = (
        ('💳 Credit Info', {
            'fields': ('customer', 'invoice', 'status')
        }),
        ('💰 Amounts', {
            'fields': ('amount_due', 'amount_paid', 'remaining_amount_display')
        }),
        ('📅 Payment', {
            'fields': ('payment_date', 'notes')
        }),
        ('🕒 Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def credit_id(self, obj):
        return format_html(
            '<span style="font-family:monospace;font-weight:bold;color:#2c3e50;">CR-{}</span>',
            '{:04d}'.format(obj.id)
        )
    credit_id.short_description = 'ID'

    def customer_display(self, obj):
        return format_html(
            '<strong>{}</strong><br><small style="color:#999;">{}</small>',
            obj.customer.shop_name, obj.customer.owner_name
        )
    customer_display.short_description = 'Customer'

    def invoice_link(self, obj):
        return format_html(
            '<a href="/admin/billing/invoice/{}/change/" style="font-family:monospace;color:#C00000;">{}</a>',
            obj.invoice.id, obj.invoice.invoice_number
        )
    invoice_link.short_description = 'Invoice'

    def amount_due_display(self, obj):
        return format_html('<span style="color:#555;">₹{}</span>', '{:,.2f}'.format(obj.amount_due))
    amount_due_display.short_description = 'Due'

    def amount_paid_display(self, obj):
        return format_html('<span style="color:#27ae60;font-weight:bold;">₹{}</span>', '{:,.2f}'.format(obj.amount_paid))
    amount_paid_display.short_description = 'Paid'

    def remaining_display(self, obj):
        remaining = obj.remaining_amount
        color = '#e74c3c' if remaining > 0 else '#27ae60'
        return format_html('<strong style="color:{};">₹{}</strong>', color, '{:,.2f}'.format(remaining))
    remaining_display.short_description = 'Remaining'

    def remaining_amount_display(self, obj):
        remaining = obj.remaining_amount
        pct_paid = int((float(obj.amount_paid) / float(obj.amount_due)) * 100) if obj.amount_due else 0
        color = '#27ae60' if pct_paid >= 100 else '#e67e22' if pct_paid > 0 else '#e74c3c'
        return format_html(
            '<strong style="color:{};">₹{}</strong> '
            '<div style="background:#f0f0f0;border-radius:8px;height:12px;width:200px;margin-top:4px;overflow:hidden;">'
            '<div style="background:{};height:100%;width:{}%;border-radius:8px;"></div></div>'
            '<small style="color:#999;">{}% paid</small>',
            color, '{:,.2f}'.format(remaining), color, pct_paid, pct_paid
        )
    remaining_amount_display.short_description = 'Remaining Amount'

    def status_badge(self, obj):
        color, icon, bg, border = CREDIT_STATUS_CONFIG.get(obj.status, ('#999', '', '#f5f5f5', '#ddd'))
        return format_html(
            '<span style="background:{};color:{};border:1px solid {};'
            'padding:3px 10px;border-radius:12px;font-size:12px;font-weight:bold;">{} {}</span>',
            bg, color, border, icon, obj.status
        )
    status_badge.short_description = 'Status'
    status_badge.admin_order_field = 'status'

    @admin.action(description='✅ Mark selected as Paid')
    def mark_as_paid(self, request, queryset):
        from django.utils import timezone
        for obj in queryset:
            obj.amount_paid = obj.amount_due
            obj.status = 'Paid'
            obj.payment_date = timezone.now().date()
            obj.save()
        self.message_user(request, f'{queryset.count()} transaction(s) marked as Paid.')

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('customer', 'invoice')


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = (
        'expense_display', 'category_badge', 'amount_display', 'date', 'notes_preview'
    )
    list_filter = ('category', 'date')
    search_fields = ('expense_name', 'notes')
    readonly_fields = ('created_at', 'updated_at')
    list_per_page = 25
    date_hierarchy = 'date'

    fieldsets = (
        ('📌 Expense Details', {
            'fields': ('expense_name', 'category', 'amount', 'date')
        }),
        ('📝 Notes', {
            'fields': ('notes',)
        }),
        ('🕒 Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def expense_display(self, obj):
        icon = EXPENSE_CATEGORY_ICONS.get(obj.category, '📌')
        return format_html('{} <strong>{}</strong>', icon, obj.expense_name)
    expense_display.short_description = 'Expense'
    expense_display.admin_order_field = 'expense_name'

    def category_badge(self, obj):
        colors = {
            'Transport': '#3498db', 'Salary': '#9b59b6', 'Maintenance': '#e67e22',
            'Utilities': '#f1c40f', 'Marketing': '#e74c3c', 'Other': '#95a5a6'
        }
        color = colors.get(obj.category, '#95a5a6')
        icon = EXPENSE_CATEGORY_ICONS.get(obj.category, '📌')
        bg, border = color + '22', color + '44'
        return format_html(
            '<span style="background:{};color:{};border:1px solid {};'
            'padding:3px 10px;border-radius:12px;font-size:12px;">{} {}</span>',
            bg, color, border, icon, obj.category
        )
    category_badge.short_description = 'Category'

    def amount_display(self, obj):
        return format_html('<strong style="color:#e74c3c;">₹{}</strong>', '{:,.2f}'.format(obj.amount))
    amount_display.short_description = 'Amount'
    amount_display.admin_order_field = 'amount'

    def notes_preview(self, obj):
        if obj.notes:
            preview = obj.notes[:60] + '...' if len(obj.notes) > 60 else obj.notes
            return format_html('<span style="color:#777;font-size:12px;">{}</span>', preview)
        return format_html('<span style="color:#ccc;">{}</span>', '—')
    notes_preview.short_description = 'Notes'
