from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from .models import ChatSession, ChatMessage


ROLE_CONFIG = {
    'user':      ('#3498db', '👤', '#1a3a5c', '#2980b9'),
    'assistant': ('#27ae60', '🤖', '#1a3d2b', '#219a52'),
    'system':    ('#9b59b6', '⚙️', '#2d1b4e', '#8e44ad'),
}


class ChatMessageInline(admin.TabularInline):
    model = ChatMessage
    extra = 0
    readonly_fields = ('role_badge', 'content_preview', 'timestamp')
    fields = ('role_badge', 'content_preview', 'timestamp')

    def role_badge(self, obj):
        color, icon, bg, border = ROLE_CONFIG.get(obj.role, ('#999', '💬', '#222', '#555'))
        return format_html(
            '<span style="background:{};color:{};border:1px solid {};'
            'padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;">{} {}</span>',
            bg, color, border, icon, obj.role.capitalize()
        )
    role_badge.short_description = 'Role'

    def content_preview(self, obj):
        preview = obj.content[:120] + '…' if len(obj.content) > 120 else obj.content
        return format_html(
            '<span style="color:#ccc;font-size:13px;font-style:italic;">{}</span>',
            preview
        )
    content_preview.short_description = 'Message'


@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = ('session_badge', 'user_display', 'message_count_badge', 'last_activity', 'created_at_display')
    readonly_fields = ('session_id', 'created_at')
    inlines = [ChatMessageInline]
    list_per_page = 25
    ordering = ('-created_at',)
    search_fields = ('session_id', 'user__username')

    fieldsets = (
        ('💬 Session Info', {
            'fields': ('session_id', 'user', 'created_at')
        }),
    )

    def session_badge(self, obj):
        short = str(obj.session_id)[:8].upper()
        return format_html(
            '<span style="background:#1a2a4a;color:#7eb3f5;border:1px solid #2a4a7a;'
            'padding:3px 10px;border-radius:8px;font-family:monospace;font-size:12px;">'
            '💬 {}</span>',
            short
        )
    session_badge.short_description = 'Session ID'

    def user_display(self, obj):
        if obj.user:
            return format_html(
                '<div style="display:flex;align-items:center;gap:8px;">'
                '<div style="width:28px;height:28px;border-radius:50%;background:#C00000;'
                'display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:bold;">{}</div>'
                '<strong>{}</strong></div>',
                obj.user.username[:2].upper(), obj.user.username
            )
        return format_html('<span style="color:#666;font-style:italic;">Anonymous</span>')
    user_display.short_description = 'User'

    def message_count_badge(self, obj):
        count = obj.messages.count()
        color = '#27ae60' if count > 10 else '#f39c12' if count > 3 else '#95a5a6'
        return format_html(
            '<span style="background:{};color:white;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:bold;">{} msgs</span>',
            color, count
        )
    message_count_badge.short_description = 'Messages'

    def last_activity(self, obj):
        last = obj.messages.order_by('-timestamp').first()
        if last:
            return format_html('<span style="color:#aaa;font-size:12px;">{}</span>', last.timestamp.strftime('%d %b %Y, %I:%M %p'))
        return format_html('<span style="color:#555;">—</span>')
    last_activity.short_description = 'Last Activity'

    def created_at_display(self, obj):
        return format_html('<span style="color:#777;font-size:12px;">{}</span>', obj.created_at.strftime('%d %b %Y'))
    created_at_display.short_description = 'Started'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user').prefetch_related('messages')


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('role_badge', 'session_link', 'content_preview', 'timestamp_display')
    list_filter = ('role', 'timestamp')
    readonly_fields = ('timestamp',)
    search_fields = ('content', 'session__session_id')
    list_per_page = 30
    date_hierarchy = 'timestamp'
    ordering = ('-timestamp',)

    def role_badge(self, obj):
        color, icon, bg, border = ROLE_CONFIG.get(obj.role, ('#999', '💬', '#222', '#555'))
        return format_html(
            '<span style="background:{};color:{};border:1px solid {};'
            'padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;">{} {}</span>',
            bg, color, border, icon, obj.role.capitalize()
        )
    role_badge.short_description = 'Role'
    role_badge.admin_order_field = 'role'

    def session_link(self, obj):
        short = str(obj.session.session_id)[:8].upper()
        return format_html(
            '<a href="/admin/chatbot/chatsession/{}/change/" '
            'style="font-family:monospace;color:#7eb3f5;font-size:12px;">💬 {}</a>',
            obj.session.id, short
        )
    session_link.short_description = 'Session'

    def content_preview(self, obj):
        preview = obj.content[:100] + '…' if len(obj.content) > 100 else obj.content
        return format_html('<span style="color:#ccc;font-size:13px;">{}</span>', preview)
    content_preview.short_description = 'Message'

    def timestamp_display(self, obj):
        return format_html('<span style="color:#777;font-size:12px;">{}</span>', obj.timestamp.strftime('%d %b %Y, %I:%M %p'))
    timestamp_display.short_description = 'Time'
    timestamp_display.admin_order_field = 'timestamp'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('session')
