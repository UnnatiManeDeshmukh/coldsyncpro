from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StockViewSet, inventory_alerts, auto_replenish

router = DefaultRouter()
router.register(r'', StockViewSet, basename='stock')

urlpatterns = [
    path('alerts/', inventory_alerts, name='inventory-alerts'),
    path('auto-replenish/', auto_replenish, name='auto-replenish'),
    path('', include(router.urls)),
]
