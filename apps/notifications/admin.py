from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'type', 'title', 'is_read', 'created_at')
    list_filter  = ('type', 'is_read')
    search_fields = ('user__username', 'title', 'message')
    readonly_fields = ('created_at',)

from .models import Offer

@admin.register(Offer)
class OfferAdmin(admin.ModelAdmin):
    list_display  = ('title', 'tag', 'emoji', 'accent', 'expires_at', 'is_active')
    list_filter   = ('is_active', 'accent')
    list_editable = ('is_active',)
    search_fields = ('title', 'tag')
