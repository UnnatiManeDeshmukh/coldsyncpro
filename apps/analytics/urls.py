from django.urls import path
from .views import (
    customer_dashboard_stats,
    customer_order_trends,
    customer_top_products,
    customer_recent_activity,
    recommended_products,
    daily_revenue,
    monthly_revenue,
    brand_sales,
    profit_analysis,
    expense_summary,
    dashboard_summary,
    revenue_chart,
    top_customers,
    demand_forecast,
    route_optimization,
    profit_per_product,
    todays_orders,
    bulk_mark_paid,
    whatsapp_broadcast,
    update_customer_credit,
)

urlpatterns = [
    # Admin dashboard APIs
    path('dashboard/', dashboard_summary, name='dashboard-summary'),
    path('revenue-chart/', revenue_chart, name='revenue-chart'),
    path('top-customers/', top_customers, name='top-customers'),

    # Admin analytics
    path('revenue/daily/', daily_revenue, name='daily-revenue'),
    path('revenue/monthly/', monthly_revenue, name='monthly-revenue'),
    path('brand-sales/', brand_sales, name='brand-sales'),
    path('profit/', profit_analysis, name='profit-analysis'),
    path('expenses/summary/', expense_summary, name='expense-summary'),

    # New admin features
    path('todays-orders/', todays_orders, name='todays-orders'),
    path('bulk-mark-paid/', bulk_mark_paid, name='bulk-mark-paid'),
    path('whatsapp-broadcast/', whatsapp_broadcast, name='whatsapp-broadcast'),
    path('customers/<int:customer_id>/credit/', update_customer_credit, name='update-customer-credit'),

    # Customer dashboard analytics
    path('customer/dashboard/', customer_dashboard_stats, name='customer-dashboard-stats'),
    path('customer/trends/', customer_order_trends, name='customer-order-trends'),
    path('customer/top-products/', customer_top_products, name='customer-top-products'),
    path('customer/activity/', customer_recent_activity, name='customer-recent-activity'),
    path('customer/recommended/', recommended_products, name='recommended-products'),

    # New features
    path('demand-forecast/', demand_forecast, name='demand-forecast'),
    path('route-optimization/', route_optimization, name='route-optimization'),
    path('profit-per-product/', profit_per_product, name='profit-per-product'),
]
