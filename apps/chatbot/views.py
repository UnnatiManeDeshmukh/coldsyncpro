import uuid
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from .models import ChatSession, ChatMessage
from .bot_engine import get_bot_reply

# Max message length
MAX_MSG_LEN = 500
# Rate limit: max messages per session per minute
RATE_LIMIT = 20
RATE_WINDOW = timedelta(minutes=1)


def _is_rate_limited(session):
    """Return True if session has exceeded RATE_LIMIT messages in the last minute."""
    cutoff = timezone.now() - RATE_WINDOW
    recent = ChatMessage.objects.filter(
        session=session, role='user', timestamp__gte=cutoff
    ).count()
    return recent >= RATE_LIMIT


@api_view(['POST'])
@permission_classes([AllowAny])
def chat(request):
    message = request.data.get('message', '').strip()
    session_id = request.data.get('session_id') or str(uuid.uuid4())
    lang_hint = request.data.get('lang', '').strip()[:5] or None

    if not message:
        return Response({'error': 'Message is required'}, status=status.HTTP_400_BAD_REQUEST)

    # Truncate overly long messages instead of rejecting
    if len(message) > MAX_MSG_LEN:
        message = message[:MAX_MSG_LEN]

    user = request.user if request.user.is_authenticated else None
    session, _ = ChatSession.objects.get_or_create(session_id=session_id, defaults={'user': user})

    # Rate limiting
    if _is_rate_limited(session):
        return Response(
            {'error': 'Too many messages. Please wait a moment before sending again.'},
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )

    # Build conversation history for AI context (last 6 messages)
    recent_msgs = session.messages.order_by('-timestamp')[:6]
    conversation_history = [
        {'role': 'assistant' if m.role == 'bot' else 'user', 'content': m.content}
        for m in reversed(recent_msgs)
    ]

    ChatMessage.objects.create(session=session, role='user', content=message)
    reply = get_bot_reply(
        message, user=user,
        conversation_history=conversation_history,
        lang_hint=lang_hint,
    )
    ChatMessage.objects.create(session=session, role='bot', content=reply)
    return Response({'reply': reply, 'session_id': session_id})


@api_view(['GET'])
@permission_classes([AllowAny])
def history(request, session_id):
    try:
        session = ChatSession.objects.get(session_id=session_id)
        return Response([
            {'role': m.role, 'content': m.content, 'timestamp': m.timestamp}
            for m in session.messages.all()
        ])
    except ChatSession.DoesNotExist:
        return Response([])
