from rest_framework import viewsets, filters, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.cache import cache
import secrets
from .models import Customer
from .serializers import CustomerSerializer, UserRegistrationSerializer, UpdateProfileSerializer


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['village']
    search_fields = ['shop_name', 'owner_name', 'phone', 'village']
    ordering_fields = ['created_at', 'shop_name', 'credit_limit']


@api_view(['POST'])
@permission_classes([AllowAny])
def register_customer(request):
    """
    Register a new customer with user account
    
    Required fields:
    - username
    - email
    - password
    - password_confirm
    - full_name
    - shop_name
    - mobile_number
    - address
    """
    serializer = UserRegistrationSerializer(data=request.data)
    
    if serializer.is_valid():
        user = serializer.save()
        
        # Generate JWT tokens for auto-login
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'message': 'Signup successful! Welcome to ColdSync Pro.',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'full_name': f"{user.first_name} {user.last_name}".strip()
            },
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


def _build_profile_data(user):
    """Build profile response data for a user."""
    is_staff = user.is_staff or user.is_superuser
    data = {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'full_name': f"{user.first_name} {user.last_name}".strip() or user.username,
        'role': 'admin' if is_staff else 'customer',
        'is_staff': is_staff,
        'shop_name': None,
        'phone': None,
        'village': None,
        'address': None,
        'credit_limit': None,
        'member_since': user.date_joined.strftime('%d %b %Y'),
        'language': 'en',
    }
    try:
        cp = user.customer_profile
        data.update({
            'shop_name': cp.shop_name,
            'phone': cp.phone,
            'village': cp.village,
            'address': cp.address,
            'credit_limit': float(cp.credit_limit),
            'language': cp.language,
        })
    except Exception:
        pass
    return data


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_profile(request):
    return Response(_build_profile_data(request.user), status=status.HTTP_200_OK)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_user_profile(request):
    user = request.user
    serializer = UpdateProfileSerializer(user, data=request.data, partial=True, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        try:
            from apps.audit.utils import log_action
            log_action(request, 'UPDATE', f'Profile updated for user {user.username}', 'User', user.id)
        except Exception:
            pass
        return Response(_build_profile_data(user), status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ── Forgot / Reset Password ───────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    """
    POST /api/customers/forgot-password/
    Body: { email }
    Sends a 6-digit OTP to the email. OTP valid for 10 minutes.
    Rate limited: 3 requests per email per hour via cache.
    """
    email = request.data.get('email', '').strip().lower()
    if not email:
        return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

    # Rate limit: max 3 OTP requests per email per hour
    rate_key = f'otp_rate_{email}'
    attempts = cache.get(rate_key, 0)
    if attempts >= 3:
        return Response(
            {'error': 'Too many requests. Please wait 1 hour before trying again.'},
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )

    # Always return success to prevent email enumeration
    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        # Don't reveal if email exists
        return Response({'message': 'If this email is registered, an OTP has been sent.'})

    # Generate 6-digit OTP
    otp = f'{secrets.randbelow(900000) + 100000}'

    # Store OTP in cache for 10 minutes
    cache_key = f'pwd_reset_{email}'
    cache.set(cache_key, {'otp': otp, 'user_id': user.id}, timeout=600)

    # Increment rate limit counter
    cache.set(rate_key, attempts + 1, timeout=3600)

    # Send OTP email
    try:
        from apps.billing.notifications import _send_email
        body = f"""Dear {user.get_full_name() or user.username},

Your password reset OTP for ColdSync Pro:

━━━━━━━━━━━━━━━━━━━━━━
  OTP: {otp}
━━━━━━━━━━━━━━━━━━━━━━

This OTP is valid for 10 minutes.
Do not share this OTP with anyone.

If you did not request this, please ignore this email.

— Shree Ganesh Agency
  ColdSync Pro"""
        _send_email(email, '🔐 Password Reset OTP — ColdSync Pro', body)
    except Exception:
        pass  # Silent fail — OTP still stored in cache

    return Response({'message': 'If this email is registered, an OTP has been sent.'})


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    """
    POST /api/customers/reset-password/
    Body: { email, otp, new_password }
    Verifies OTP and resets password.
    """
    email        = request.data.get('email', '').strip().lower()
    otp          = request.data.get('otp', '').strip()
    new_password = request.data.get('new_password', '')

    if not email or not otp or not new_password:
        return Response({'error': 'Email, OTP, and new password are required'}, status=status.HTTP_400_BAD_REQUEST)

    if len(new_password) < 8:
        return Response({'error': 'Password must be at least 8 characters'}, status=status.HTTP_400_BAD_REQUEST)

    cache_key = f'pwd_reset_{email}'
    stored = cache.get(cache_key)

    if not stored:
        return Response({'error': 'OTP expired or invalid. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

    if stored['otp'] != otp:
        return Response({'error': 'Invalid OTP. Please check and try again.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(id=stored['user_id'])
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    user.set_password(new_password)
    user.save()

    # Clear OTP from cache after successful reset
    cache.delete(cache_key)
    cache.delete(f'otp_rate_{email}')

    return Response({'message': 'Password reset successfully! You can now login with your new password.'})
