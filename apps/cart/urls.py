from django.urls import path
from . import views

urlpatterns = [
    path('', views.get_cart, name='cart-get'),
    path('add/', views.add_to_cart, name='cart-add'),
    path('update/<int:product_id>/', views.update_cart_item, name='cart-update'),
    path('clear/', views.clear_cart, name='cart-clear'),
    path('sync/', views.sync_cart, name='cart-sync'),
]
