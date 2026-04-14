from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RecurringOrderViewSet, process_due_subscriptions

router = DefaultRouter()
router.register(r'', RecurringOrderViewSet, basename='recurring-order')

urlpatterns = [
    path('process-due/', process_due_subscriptions, name='process-due-subscriptions'),
    path('', include(router.urls)),
]
