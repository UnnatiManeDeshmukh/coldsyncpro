from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReturnRequestViewSet

router = DefaultRouter()
router.register(r'', ReturnRequestViewSet, basename='return')

urlpatterns = [path('', include(router.urls))]
