from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import AuditLog


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def audit_log_list(request):
    """GET /api/audit/logs/ — Admin only. Supports ?user=, ?action=, ?model=, ?page=, ?page_size="""
    if not (request.user.is_staff or request.user.is_superuser):
        return Response({'error': 'Admin only'}, status=403)

    qs = AuditLog.objects.select_related('user').all()

    user_filter   = request.query_params.get('user', '')
    action_filter = request.query_params.get('action', '')
    model_filter  = request.query_params.get('model', '')

    if user_filter:
        qs = qs.filter(user__username__icontains=user_filter)
    if action_filter:
        qs = qs.filter(action=action_filter.upper())
    if model_filter:
        qs = qs.filter(model_name__icontains=model_filter)

    # Pagination
    total_count = qs.count()
    page      = max(int(request.query_params.get('page', 1)), 1)
    page_size = min(int(request.query_params.get('page_size', 50)), 200)
    offset    = (page - 1) * page_size
    qs        = qs[offset: offset + page_size]

    data = [
        {
            'id':          log.id,
            'user':        log.user.username if log.user else 'System',
            'action':      log.action,
            'model_name':  log.model_name,
            'object_id':   log.object_id,
            'description': log.description,
            'ip_address':  log.ip_address,
            'timestamp':   log.timestamp.isoformat(),
        }
        for log in qs
    ]
    return Response({
        'count':       total_count,
        'page':        page,
        'page_size':   page_size,
        'total_pages': (total_count + page_size - 1) // page_size,
        'logs':        data,
    })
