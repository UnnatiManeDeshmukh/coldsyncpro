from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, brands_list, catalog_products

router = DefaultRouter()
router.register(r'', ProductViewSet, basename='product')

urlpatterns = [
    path('brands/', brands_list, name='brands-list'),
    path('catalog/', catalog_products, name='catalog-products'),
    path('', include(router.urls)),
]
