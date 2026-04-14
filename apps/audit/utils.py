import logging

logger = logging.getLogger(__name__)


def get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def log_action(request, action, description, model_name='', object_id=''):
    """
    Helper to create an AuditLog entry. Safe to call anywhere — failures are logged, not raised.
    Usage:
        from apps.audit.utils import log_action
        log_action(request, 'UPDATE', f'Updated order #{order.id}', 'Order', order.id)
    """
    try:
        from .models import AuditLog
        AuditLog.objects.create(
            user=request.user if request.user.is_authenticated else None,
            action=action,
            model_name=model_name,
            object_id=str(object_id),
            description=description,
            ip_address=get_client_ip(request),
        )
    except Exception as e:
        logger.error(f"AuditLog write failed: {e}")
