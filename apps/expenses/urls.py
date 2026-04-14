from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CreditTransactionViewSet, ExpenseViewSet

router = DefaultRouter()
router.register(r'credits', CreditTransactionViewSet, basename='credit')
router.register(r'expenses', ExpenseViewSet, basename='expense')

urlpatterns = [
    path('', include(router.urls)),
]
