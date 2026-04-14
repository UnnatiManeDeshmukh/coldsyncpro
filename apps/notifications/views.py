from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.http import StreamingHttpResponse
from django.contrib.auth.models import User
from rest_framework_simplejwt.authentication import JWTAuthentication
from datetime import timedelta
import json
import time
from .models import Notification, Offer


def _serialize(n):
    return {
        'id':         n.id,
        'type':       n.type,
        'title':      n.title,
        'message':    n.message,
        'is_read':    n.is_read,
        'order_id':   n.order_id,
        'created_at': n.created_at.isoformat(),
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_notifications(request):
    """Return latest 50 notifications for the current user."""
    user = request.user
    if not user.is_staff:
        _inject_payment_reminders(user)
    notifs = Notification.objects.filter(user=user)[:50]
    unread = Notification.objects.filter(user=user, is_read=False).count()
    return Response({
        'notifications': [_serialize(n) for n in notifs],
        'unread_count':  unread,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_read(request, pk):
    try:
        n = Notification.objects.get(pk=pk, user=request.user)
        n.is_read = True
        n.save(update_fields=['is_read'])
        return Response({'status': 'ok'})
    except Notification.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_read(request):
    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response({'status': 'ok'})


@api_view(['GET'])
@permission_classes([AllowAny])
def list_offers(request):
    """Return active, non-expired offers."""
    today = timezone.now().date()
    offers = Offer.objects.filter(is_active=True, expires_at__gte=today)
    data = [{
        'id':          o.id,
        'title':       o.title,
        'description': o.description,
        'tag':         o.tag,
        'emoji':       o.emoji,
        'accent':      o.accent,
        'expires_at':  o.expires_at.isoformat(),
    } for o in offers]
    return Response(data)


def notification_stream(request):
    """
    GET /api/notifications/stream/?token=<jwt>
    Server-Sent Events endpoint — pushes new notifications in real-time.
    Polls DB every 5 seconds and sends new notifications since last check.
    Token passed as query param (SSE can't set headers).

    Production note: For high-scale deployments, replace with Django Channels + Redis.
    This DB-polling approach works well for small-medium deployments (< 100 concurrent users).
    Each SSE connection uses one Gunicorn worker thread — set workers = 2 * CPU + 1 in gunicorn.conf.py
    and use --worker-class=gthread with --threads=4 to handle concurrent SSE connections efficiently.
    """
    # Authenticate via token query param
    token = request.GET.get('token', '')
    user = None
    if token:
        try:
            auth = JWTAuthentication()
            validated = auth.get_validated_token(token)
            user = auth.get_user(validated)
        except Exception:
            pass

    if not user:
        def denied():
            yield 'data: {"error": "unauthorized"}\n\n'
        return StreamingHttpResponse(denied(), content_type='text/event-stream')

    def event_stream():
        import select as _select
        last_id = Notification.objects.filter(user=user).order_by('-id').values_list('id', flat=True).first() or 0
        heartbeat = 0
        max_cycles = 720  # 720 × 5s = 1 hour — connection auto-close

        while heartbeat < max_cycles:
            try:
                # Check for new notifications
                new_notifs = Notification.objects.filter(
                    user=user, id__gt=last_id
                ).order_by('id')

                for n in new_notifs:
                    data = json.dumps(_serialize(n))
                    yield f'data: {data}\n\n'
                    last_id = n.id

                # Send unread count every cycle
                unread = Notification.objects.filter(user=user, is_read=False).count()
                yield f'data: {json.dumps({"type": "unread_count", "count": unread})}\n\n'

                # Heartbeat every 30s to keep connection alive
                heartbeat += 1
                if heartbeat % 6 == 0:
                    yield ': heartbeat\n\n'

                time.sleep(5)

            except Exception:
                break

    response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    response['Access-Control-Allow-Origin'] = '*'
    return response


def _inject_payment_reminders(user):
    try:
        from apps.orders.models import Order
        customer = user.customer_profile
    except Exception:
        return
    outstanding = Order.objects.filter(
        customer=customer,
        payment_status__in=['Pending', 'Partial'],
    ).count()
    if outstanding == 0:
        return
    cutoff = timezone.now() - timedelta(hours=24)
    recent = Notification.objects.filter(
        user=user, type='payment_reminder',
        created_at__gte=cutoff,
        title__startswith='Payment Due',
    ).exists()
    if not recent:
        Notification.objects.create(
            user=user,
            type='payment_reminder',
            title='Payment Due',
            message=f'You have {outstanding} unpaid order(s). Please clear your balance.',
        )


# ── Admin-only endpoints ──────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_send_notification(request):
    """
    POST /api/notifications/admin/send/
    Admin ला specific user किंवा सगळ्या customers ला notification पाठवता येते.
    Body: { target: 'all' | 'customer' | user_id, title, message, type }
    """
    target  = request.data.get('target', 'all')
    title   = request.data.get('title', '').strip()
    message = request.data.get('message', '').strip()
    ntype   = request.data.get('type', 'general')

    if not title or not message:
        return Response({'error': 'Title and message required'}, status=400)

    if target == 'all':
        users = User.objects.filter(is_active=True, is_staff=False)
    elif target == 'customers':
        users = User.objects.filter(is_active=True, is_staff=False, customer_profile__isnull=False)
    else:
        try:
            users = User.objects.filter(id=int(target))
        except (ValueError, TypeError):
            return Response({'error': 'Invalid target'}, status=400)

    count = 0
    for user in users:
        Notification.objects.create(user=user, type=ntype, title=title, message=message)
        count += 1

    return Response({'success': True, 'sent_to': count})


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_users_list(request):
    """GET /api/notifications/admin/users/ — list all users for admin."""
    users = User.objects.all().order_by('-date_joined')
    data = [{
        'id':           u.id,
        'username':     u.username,
        'email':        u.email,
        'is_staff':     u.is_staff,
        'is_active':    u.is_active,
        'date_joined':  u.date_joined.strftime('%d %b %Y'),
        'last_login':   u.last_login.strftime('%d %b %Y %H:%M') if u.last_login else None,
        'full_name':    u.get_full_name(),
    } for u in users]
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_toggle_user(request, user_id):
    """POST /api/notifications/admin/users/<id>/toggle/ — activate/deactivate user."""
    try:
        user = User.objects.get(id=user_id)
        if user.is_superuser:
            return Response({'error': 'Cannot deactivate superuser'}, status=400)
        user.is_active = not user.is_active
        user.save(update_fields=['is_active'])
        return Response({'success': True, 'is_active': user.is_active})
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)


@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def admin_offers(request):
    """GET list / POST create offer."""
    if request.method == 'GET':
        offers = Offer.objects.all()
        data = [{
            'id': o.id, 'title': o.title, 'description': o.description,
            'tag': o.tag, 'emoji': o.emoji, 'accent': o.accent,
            'expires_at': o.expires_at.isoformat(), 'is_active': o.is_active,
            'created_at': o.created_at.strftime('%d %b %Y'),
        } for o in offers]
        return Response(data)

    # POST — create
    data = request.data
    required = ['title', 'description', 'tag', 'expires_at']
    for f in required:
        if not data.get(f):
            return Response({'error': f'{f} is required'}, status=400)
    offer = Offer.objects.create(
        title=data['title'], description=data['description'],
        tag=data['tag'], emoji=data.get('emoji', '🎁'),
        accent=data.get('accent', 'gold'),
        expires_at=data['expires_at'],
        is_active=data.get('is_active', True),
    )
    return Response({'id': offer.id, 'title': offer.title}, status=201)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
def admin_offer_detail(request, pk):
    """PATCH update / DELETE remove offer."""
    try:
        offer = Offer.objects.get(pk=pk)
    except Offer.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)

    if request.method == 'DELETE':
        offer.delete()
        return Response({'status': 'deleted'})

    # PATCH
    for field in ['title', 'description', 'tag', 'emoji', 'accent', 'expires_at', 'is_active']:
        if field in request.data:
            setattr(offer, field, request.data[field])
    offer.save()
    return Response({'status': 'updated', 'id': offer.id})


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_chat_sessions(request):
    """GET /api/notifications/admin/chat-sessions/ — list chatbot sessions."""
    from apps.chatbot.models import ChatSession, ChatMessage
    sessions = ChatSession.objects.all().order_by('-created_at')[:50]
    data = []
    for s in sessions:
        msgs = s.messages.all()
        last = msgs.last()
        data.append({
            'id':           s.id,
            'session_id':   s.session_id,
            'user':         s.user.username if s.user else 'Anonymous',
            'message_count': msgs.count(),
            'last_message': last.content[:80] if last else '',
            'last_role':    last.role if last else '',
            'created_at':   s.created_at.strftime('%d %b %Y %H:%M'),
        })
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_chat_messages(request, session_id):
    """GET /api/notifications/admin/chat-sessions/<session_id>/messages/"""
    from apps.chatbot.models import ChatSession, ChatMessage
    try:
        session = ChatSession.objects.get(id=session_id)
        msgs = session.messages.all()
        return Response([{
            'role': m.role,
            'content': m.content,
            'timestamp': m.timestamp.strftime('%d %b %H:%M'),
        } for m in msgs])
    except ChatSession.DoesNotExist:
        return Response([], status=404)
