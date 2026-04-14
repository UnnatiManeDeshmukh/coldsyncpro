from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PaymentViewSet, InvoiceViewSet, pay_now, upi_config,
    billing_summary, invoice_share, customer_invoice_download,
    customer_invoices_list, invoice_by_order_download, verify_payment,
)

router = DefaultRouter()
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'invoices', InvoiceViewSet, basename='invoice')

urlpatterns = [
    path('summary/', billing_summary, name='billing-summary'),
    path('pay-now/', pay_now, name='pay-now'),
    path('upi-config/', upi_config, name='upi-config'),
    path('my-invoices/', customer_invoices_list, name='my-invoices'),
    path('invoices/<int:invoice_id>/share/', invoice_share, name='invoice-share'),
    path('invoices/<int:invoice_id>/download/', customer_invoice_download, name='customer-invoice-download'),
    path('invoices/by-order/<int:order_id>/download/', invoice_by_order_download, name='invoice-by-order-download'),
    path('payments/<int:payment_id>/verify/', verify_payment, name='verify-payment'),
    path('', include(router.urls)),
]
