from django.urls import path
from .views import audit_log_list

urlpatterns = [
    path('logs/', audit_log_list, name='audit-logs'),
]
