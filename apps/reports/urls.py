from django.urls import path
from .views import (
    DailyStockReportView,
    MonthlySalesReportView,
    TopCustomersReportView,
    TopProductsReportView,
    MonthlyRevenueReportView,
    LowStockAlertView,
    download_report,
    customer_sales_report,
)

urlpatterns = [
    path('stock/daily/',      DailyStockReportView.as_view(),       name='daily-stock-report'),
    path('sales/monthly/',    MonthlySalesReportView.as_view(),     name='monthly-sales-report'),
    path('customers/top/',    TopCustomersReportView.as_view(),     name='top-customers'),
    path('top-products/',     TopProductsReportView.as_view(),      name='top-products'),
    path('monthly/',          MonthlyRevenueReportView.as_view(),   name='monthly-revenue'),
    path('alerts/low-stock/', LowStockAlertView.as_view(),          name='low-stock-alerts'),
    path('download/',         download_report,                      name='report-download'),
    path('customer/<int:customer_id>/', customer_sales_report,      name='customer-sales-report'),
]
