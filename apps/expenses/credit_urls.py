from django.urls import path
from .views import customer_credit_overview, my_credit_history

urlpatterns = [
    path('', customer_credit_overview, name='customer-credit-overview'),
    path('my-history/', my_credit_history, name='my-credit-history'),
]
