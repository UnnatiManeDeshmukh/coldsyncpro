from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display  = ('timestamp', 'user', 'action', 'model_name', 'object_id', 'description', 'ip_address')
    list_filter   = ('action', 'model_name')
    search_fields = ('user__username', 'description', 'model_name', 'object_id')
    readonly_fields = ('user', 'action', 'model_name', 'object_id', 'description', 'ip_address', 'timestamp')
    ordering      = ('-timestamp',)

    def has_add_permission(self, request):
        return False  # Audit logs are read-only

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser  # Only superuser can purge logs
