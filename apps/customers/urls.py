from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CustomerViewSet, register_customer, get_user_profile, update_user_profile,
    forgot_password, reset_password,
)

router = DefaultRouter()
router.register(r'', CustomerViewSet, basename='customer')

urlpatterns = [
    path('register/', register_customer, name='register-customer'),
    path('profile/', get_user_profile, name='user-profile'),
    path('profile/update/', update_user_profile, name='update-profile'),
    path('forgot-password/', forgot_password, name='forgot-password'),
    path('reset-password/', reset_password, name='reset-password'),
    path('', include(router.urls)),
]
