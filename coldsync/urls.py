from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.throttling import AnonRateThrottle
from django.contrib.auth.models import User
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from . import views


class LoginRateThrottle(AnonRateThrottle):
    rate = '10/minute'
    scope = 'login'


class CaseInsensitiveTokenSerializer(TokenObtainPairSerializer):
    """Allow login with any case username (e.g. sanku = Sanku = SANKU)"""
    def validate(self, attrs):
        username = attrs.get('username', '')
        if not User.objects.filter(username=username).exists():
            # Use first() to avoid MultipleObjectsReturned if duplicates exist
            user = User.objects.filter(username__iexact=username).order_by('-is_superuser', 'id').first()
            if user:
                attrs['username'] = user.username
        return super().validate(attrs)


class CaseInsensitiveTokenView(TokenObtainPairView):
    serializer_class = CaseInsensitiveTokenSerializer
    throttle_classes = [LoginRateThrottle]

urlpatterns = [
    # Homepage
    path('', views.home, name='home'),
    path('api/', views.api_info, name='api_root'),
    path('api/info/', views.api_info, name='api_info'),
    path('api/health/', views.health_check, name='health_check'),
    path('api/contact/', views.contact_us, name='contact_us'),
    path('api/public-stats/', views.public_stats, name='public_stats'),
    path('api/test-notifications/', views.test_notifications, name='test_notifications'),

    # Authentication
    path('api/auth/login/', CaseInsensitiveTokenView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # API Endpoints
    path('api/customers/', include('apps.customers.urls')),
    path('api/products/', include('apps.products.urls')),
    path('api/inventory/', include('apps.inventory.urls')),
    path('api/orders/', include('apps.orders.urls')),
    path('api/billing/', include('apps.billing.urls')),
    path('api/expenses/', include('apps.expenses.urls')),
    path('api/credit/', include('apps.expenses.credit_urls')),
    path('api/analytics/', include('apps.analytics.urls')),
    path('api/reports/', include('apps.reports.urls')),
    path('api/chatbot/', include('apps.chatbot.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/suppliers/', include('apps.suppliers.urls')),
    path('api/returns/', include('apps.returns.urls')),
    path('api/subscriptions/', include('apps.subscriptions.urls')),
    path('api/loyalty/', include('apps.loyalty.urls')),
    path('api/audit/', include('apps.audit.urls')),
    path('api/cart/', include('apps.cart.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)