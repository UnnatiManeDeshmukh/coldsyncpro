from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    OrderViewSet, OrderItemViewSet,
    create_customer_order, get_customer_orders, get_payment_history,
    delivery_list, assign_driver, bulk_import_orders, reorder, drivers_list, driver_detail,
    admin_create_order, driver_orders, driver_update_status, cancel_order,
)

router = DefaultRouter()
router.register(r'list', OrderViewSet, basename='order')
router.register(r'items', OrderItemViewSet, basename='orderitem')

urlpatterns = [
    # Admin order creation
    path('admin/create/', admin_create_order, name='admin-order-create'),
    # Customer-specific endpoints — must come before router
    path('customer/create/', create_customer_order, name='customer-order-create'),
    path('customer/my-orders/', get_customer_orders, name='customer-orders'),
    path('customer/payment-history/', get_payment_history, name='payment-history'),
    path('customer/reorder/<int:order_id>/', reorder, name='reorder'),
    path('customer/cancel/<int:order_id>/', cancel_order, name='cancel-order'),
    # Delivery management
    path('delivery/', delivery_list, name='delivery-list'),
    path('delivery/<int:pk>/assign/', assign_driver, name='assign-driver'),
    path('drivers/', drivers_list, name='drivers-list'),
    path('drivers/<int:pk>/', driver_detail, name='driver-detail'),
    # Driver app endpoints
    path('driver/orders/', driver_orders, name='driver-orders'),
    path('driver/orders/<int:pk>/status/', driver_update_status, name='driver-update-status'),
    path('bulk-import/', bulk_import_orders, name='bulk-import-orders'),
    path('', include(router.urls)),
]
