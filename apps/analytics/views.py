from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import models
from django.db.models import Sum, Count, Q, F, Value, ExpressionWrapper, IntegerField, DecimalField
from django.utils import timezone
from datetime import timedelta
from apps.orders.models import Order
from apps.products.models import Product
from apps.customers.models import Customer
from apps.expenses.models import Expense


def _get_or_create_customer(user):
    """Get customer profile, auto-creating one if missing."""
    try:
        return user.customer_profile
    except Customer.DoesNotExist:
        return Customer.objects.create(
            user=user,
            shop_name=f"{user.get_full_name() or user.username}'s Shop",
            owner_name=user.get_full_name() or user.username,
            phone=f"00000{user.id:05d}",
            address='Address not set',
            village='',
            credit_limit=50000,
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def customer_dashboard_stats(request):
    """
    Get comprehensive dashboard statistics for customer.
    Staff/admin users get aggregate stats across all customers.
    """
    user = request.user

    # Staff/admin: return aggregate stats
    if user.is_staff or user.is_superuser:
        orders = Order.objects.all()
        today = timezone.now()
        thirty_days_ago = today - timedelta(days=30)
        total_spent = orders.aggregate(total=Sum('total_amount'))['total'] or 0
        monthly = orders.filter(order_date__gte=thirty_days_ago).aggregate(total=Sum('total_amount'))['total'] or 0
        pending_payments = orders.filter(
            payment_status__in=['Pending', 'Partial']
        ).aggregate(total=Sum('total_amount'))['total'] or 0
        return Response({
            'stats': {
                'total_orders': orders.count(),
                'pending_orders': orders.filter(delivery_status__in=['Order Placed','Order Confirmed','Processing','Out for Delivery']).count(),
                'completed_orders': orders.filter(delivery_status='Delivered').count(),
                'cancelled_orders': orders.filter(delivery_status='Cancelled').count(),
                'total_spent': float(total_spent),
                'monthly_spending': float(monthly),
                'weekly_spending': 0,
                'pending_payments': float(pending_payments),
                'paid_amount': 0,
            },
            'trends': {'spending_trend': 'neutral', 'spending_change': 0},
            'credit': {'credit_limit': 0, 'outstanding': 0, 'available': 0},
        })

    try:
        customer = user.customer_profile
    except Customer.DoesNotExist:
        customer = _get_or_create_customer(user)
    
    # Get all customer orders
    orders = Order.objects.filter(customer=customer)
    
    # Calculate date ranges
    today = timezone.now()
    thirty_days_ago = today - timedelta(days=30)
    seven_days_ago = today - timedelta(days=7)
    
    # Basic stats
    total_orders = orders.count()
    pending_orders = orders.filter(
        Q(delivery_status='Order Placed') |
        Q(delivery_status='Order Confirmed') |
        Q(delivery_status='Processing') |
        Q(delivery_status='Out for Delivery')
    ).count()
    completed_orders = orders.filter(delivery_status='Delivered').count()
    cancelled_orders = orders.filter(delivery_status='Cancelled').count()
    
    # Financial stats
    total_spent = orders.aggregate(total=Sum('total_amount'))['total'] or 0
    monthly_spending = orders.filter(
        order_date__gte=thirty_days_ago
    ).aggregate(total=Sum('total_amount'))['total'] or 0
    weekly_spending = orders.filter(
        order_date__gte=seven_days_ago
    ).aggregate(total=Sum('total_amount'))['total'] or 0
    
    # Payment stats
    pending_payments = orders.filter(
        Q(payment_status='Pending') | Q(payment_status='Partial')
    ).aggregate(total=Sum('total_amount'))['total'] or 0
    paid_amount = orders.filter(
        payment_status='Paid'
    ).aggregate(total=Sum('total_amount'))['total'] or 0
    
    # Trend calculations (compare with previous period)
    previous_month = today - timedelta(days=60)
    previous_month_spending = orders.filter(
        order_date__gte=previous_month,
        order_date__lt=thirty_days_ago
    ).aggregate(total=Sum('total_amount'))['total'] or 0
    
    spending_trend = 'neutral'
    spending_change = 0
    if previous_month_spending > 0:
        spending_change = ((monthly_spending - previous_month_spending) / previous_month_spending) * 100
        if spending_change > 5:
            spending_trend = 'up'
        elif spending_change < -5:
            spending_trend = 'down'
    
    return Response({
        'stats': {
            'total_orders': total_orders,
            'pending_orders': pending_orders,
            'completed_orders': completed_orders,
            'cancelled_orders': cancelled_orders,
            'total_spent': float(total_spent),
            'monthly_spending': float(monthly_spending),
            'weekly_spending': float(weekly_spending),
            'pending_payments': float(pending_payments),
            'paid_amount': float(paid_amount),
        },
        'trends': {
            'spending_trend': spending_trend,
            'spending_change': round(spending_change, 1),
        },
        'credit': {
            'credit_limit': float(customer.credit_limit),
            'outstanding': float(pending_payments),
            'available': float(customer.credit_limit - pending_payments),
        }
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def customer_order_trends(request):
    """Monthly order trends — optimized with single bulk query."""
    from django.db.models.functions import TruncMonth
    user = request.user
    customer = _get_or_create_customer(user)
    today = timezone.now()
    six_months_ago = today - timedelta(days=180)

    # Single query for all months
    qs = (
        Order.objects
        .filter(customer=customer, order_date__gte=six_months_ago)
        .annotate(month=TruncMonth('order_date'))
        .values('month')
        .annotate(orders=Count('id'), spending=Sum('total_amount'))
        .order_by('month')
    )
    data_map = {r['month'].strftime('%b'): r for r in qs}

    months_data = []
    for i in range(5, -1, -1):
        m = (today - timedelta(days=30 * (i + 1))).strftime('%b')
        row = data_map.get(m, {})
        months_data.append({
            'month':    m,
            'orders':   row.get('orders', 0),
            'spending': float(row.get('spending') or 0),
        })

    return Response({'trends': months_data})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def customer_top_products(request):
    user = request.user
    customer = _get_or_create_customer(user)
    from apps.orders.models import OrderItem
    
    top_products = OrderItem.objects.filter(
        order__customer=customer
    ).values(
        'product__product_name',
        'product__brand'
    ).annotate(
        total_quantity=Sum(
            ExpressionWrapper(
                F('quantity_crates') * F('product__crate_size') + F('quantity_bottles'),
                output_field=IntegerField()
            )
        ),
        order_count=Count('order')
    ).order_by('-total_quantity')[:5]
    
    return Response({'top_products': list(top_products)})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def customer_recent_activity(request):
    user = request.user
    customer = _get_or_create_customer(user)
    activities = []

    recent_orders = Order.objects.filter(customer=customer).select_related('customer').order_by('-order_date')[:10]

    for order in recent_orders:
        activities.append({
            'type': 'order',
            'title': f'Order #{order.id} Placed',
            'description': f'Order total: ₹{order.total_amount}',
            'time': order.order_date,
            'amount': float(order.total_amount)
        })

        # Make actual_delivery timezone-aware before comparison
        if order.delivery_status == 'Delivered' and order.actual_delivery:
            delivery_time = order.actual_delivery
            if timezone.is_naive(delivery_time):
                delivery_time = timezone.make_aware(delivery_time)
            activities.append({
                'type': 'delivery',
                'title': f'Order #{order.id} Delivered',
                'description': 'Order successfully delivered',
                'time': delivery_time,
            })

        if order.payment_status == 'Paid':
            updated_time = order.updated_at
            if timezone.is_naive(updated_time):
                updated_time = timezone.make_aware(updated_time)
            activities.append({
                'type': 'payment',
                'title': 'Payment Received',
                'description': f'Order #{order.id} payment completed',
                'time': updated_time,
                'amount': float(order.total_amount)
            })

    activities.sort(key=lambda x: x['time'], reverse=True)

    now = timezone.now()
    for activity in activities[:10]:
        time_diff = now - activity['time']
        if time_diff.days > 0:
            activity['time'] = f'{time_diff.days} day{"s" if time_diff.days > 1 else ""} ago'
        elif time_diff.seconds > 3600:
            hours = time_diff.seconds // 3600
            activity['time'] = f'{hours} hour{"s" if hours > 1 else ""} ago'
        else:
            minutes = max(time_diff.seconds // 60, 0)
            activity['time'] = f'{minutes} minute{"s" if minutes != 1 else ""} ago'

    return Response({'activities': activities[:10]})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recommended_products(request):
    """
    Get recommended products for customer
    """
    user = request.user
    
    try:
        customer = user.customer_profile
    except Customer.DoesNotExist:
        # Return all products if no customer profile
        products = Product.objects.all()[:6]
        from apps.products.serializers import ProductSerializer
        return Response({
            'recommended': ProductSerializer(products, many=True).data
        })
    
    # Get customer's order history
    from apps.orders.models import OrderItem
    
    ordered_products = OrderItem.objects.filter(
        order__customer=customer
    ).values_list('product_id', flat=True).distinct()
    
    # Get products customer hasn't ordered yet
    new_products = Product.objects.exclude(id__in=ordered_products)[:3]
    
    # Get products customer ordered before (reorder suggestions)
    reorder_products = Product.objects.filter(id__in=ordered_products)[:3]
    
    from apps.products.serializers import ProductSerializer
    
    return Response({
        'recommended': ProductSerializer(new_products, many=True).data,
        'reorder': ProductSerializer(reorder_products, many=True).data,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_summary(request):
    """
    Admin dashboard summary — includes total_customers for stat card.
    """
    from apps.inventory.models import Stock

    total_revenue    = Order.objects.aggregate(total=Sum('total_amount'))['total'] or 0
    total_orders     = Order.objects.count()
    total_customers  = Customer.objects.count()
    pending_payments = Order.objects.filter(
        payment_status__in=['Pending', 'Partial']
    ).aggregate(total=Sum('total_amount'))['total'] or 0
    low_stock_count  = Stock.objects.filter(total_crates__lte=5).count()

    return Response({
        'total_revenue':    float(total_revenue),
        'total_orders':     total_orders,
        'total_customers':  total_customers,
        'pending_payments': float(pending_payments),
        'low_stock_count':  low_stock_count,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def revenue_chart(request):
    """
    Monthly revenue for the last N months (default 6, supports ?months=3|6|12).
    Returns: [{ month, revenue }, ...]
    """
    import calendar
    num_months = min(int(request.query_params.get('months', 6)), 24)
    today = timezone.now()
    months_data = []
    for i in range(num_months - 1, -1, -1):
        month = today.month - i
        year  = today.year
        while month <= 0:
            month += 12
            year  -= 1
        m_start = today.replace(year=year, month=month, day=1, hour=0, minute=0, second=0, microsecond=0)
        if m_start.month == 12:
            m_end = m_start.replace(year=m_start.year + 1, month=1, day=1)
        else:
            m_end = m_start.replace(month=m_start.month + 1, day=1)

        rev = Order.objects.filter(
            order_date__gte=m_start,
            order_date__lt=m_end,
        ).aggregate(total=Sum('total_amount'))['total'] or 0

        months_data.append({'month': m_start.strftime('%b %Y'), 'revenue': float(rev)})

    return Response({'revenue_chart': months_data})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def top_customers(request):
    """
    Top customers by total purchase amount. Supports ?limit= (default 5, max 50).
    """
    limit = min(int(request.query_params.get('limit', 5)), 50)
    customers = Customer.objects.annotate(
        total_spent=Sum('orders__total_amount'),
        total_orders=Count('orders'),
    ).filter(total_orders__gt=0).order_by('-total_spent')[:limit]

    data = [
        {
            'shop_name': c.shop_name,
            'owner_name': c.owner_name,
            'total_spent': float(c.total_spent or 0),
            'total_orders': c.total_orders,
        }
        for c in customers
    ]
    return Response({'top_customers': data})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def daily_revenue(request):
    """Today's total revenue — last 7 days breakdown in 2 queries."""
    from django.db.models.functions import TruncDate
    today = timezone.now().date()
    seven_days_ago = timezone.now() - timedelta(days=6)

    # Single query for all 7 days
    daily_qs = (
        Order.objects
        .filter(order_date__gte=seven_days_ago)
        .annotate(day=TruncDate('order_date'))
        .values('day')
        .annotate(revenue=Sum('total_amount'))
        .order_by('day')
    )
    rev_map = {str(r['day']): float(r['revenue'] or 0) for r in daily_qs}

    days_data = []
    for i in range(6, -1, -1):
        day = (timezone.now() - timedelta(days=i)).date()
        days_data.append({'date': day.strftime('%a'), 'revenue': rev_map.get(str(day), 0)})

    total = rev_map.get(str(today), 0)
    return Response({
        'total_revenue': total,
        'date': str(today),
        'daily_breakdown': days_data,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def monthly_revenue(request):
    """Current month's total revenue"""
    today = timezone.now()
    first_day = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    total = Order.objects.filter(
        order_date__gte=first_day
    ).aggregate(total=Sum('total_amount'))['total'] or 0

    # Last 6 months breakdown
    months_data = []
    for i in range(5, -1, -1):
        m_start = today - timedelta(days=30 * (i + 1))
        m_end = today - timedelta(days=30 * i)
        rev = Order.objects.filter(
            order_date__gte=m_start,
            order_date__lt=m_end
        ).aggregate(total=Sum('total_amount'))['total'] or 0
        months_data.append({'month': m_start.strftime('%b'), 'revenue': float(rev)})

    return Response({
        'total_revenue': float(total),
        'month': today.strftime('%B %Y'),
        'monthly_breakdown': months_data,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profit_analysis(request):
    """Profit = Revenue - Expenses for a given period"""
    period = request.query_params.get('period', 'month')

    today = timezone.now()
    if period == 'week':
        start = today - timedelta(days=7)
    elif period == 'year':
        start = today - timedelta(days=365)
    else:  # month
        start = today - timedelta(days=30)

    revenue = Order.objects.filter(
        order_date__gte=start
    ).aggregate(total=Sum('total_amount'))['total'] or 0

    expenses = Expense.objects.filter(
        date__gte=start.date()
    ).aggregate(total=Sum('amount'))['total'] or 0

    profit = float(revenue) - float(expenses)

    return Response({
        'period': period,
        'revenue': float(revenue),
        'expenses': float(expenses),
        'profit': profit,
        'profit_margin': round((profit / float(revenue) * 100), 2) if revenue and float(revenue) > 0 else None,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def brand_sales(request):
    """Total sales (revenue) grouped by product brand"""
    from apps.orders.models import OrderItem
    from django.db.models import DecimalField
    from django.db.models.functions import Coalesce

    results = (
        OrderItem.objects
        .values('product__brand')
        .annotate(
            total_revenue=Sum(
                ExpressionWrapper(
                    (F('quantity_crates') * F('product__crate_size') + F('quantity_bottles')) * F('price'),
                    output_field=models.DecimalField(max_digits=12, decimal_places=2)
                )
            ),
            total_quantity=Sum(
                ExpressionWrapper(
                    F('quantity_crates') * F('product__crate_size') + F('quantity_bottles'),
                    output_field=IntegerField()
                )
            ),
            order_count=Count('order', distinct=True),
        )
        .order_by('-total_revenue')
    )

    return Response({
        'brand_sales': [
            {
                'brand': item['product__brand'],
                'total_revenue': float(item['total_revenue'] or 0),
                'total_quantity': item['total_quantity'] or 0,
                'order_count': item['order_count'],
            }
            for item in results
        ]
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def expense_summary(request):
    """Expense breakdown by category for current month"""
    today = timezone.now()
    first_day = today.replace(day=1).date()

    by_category = Expense.objects.filter(
        date__gte=first_day
    ).values('category').annotate(total=Sum('amount')).order_by('-total')

    total = Expense.objects.filter(
        date__gte=first_day
    ).aggregate(total=Sum('amount'))['total'] or 0

    return Response({
        'month': today.strftime('%B %Y'),
        'total_expenses': float(total),
        'by_category': [
            {'category': item['category'], 'amount': float(item['total'])}
            for item in by_category
        ],
    })


# ══════════════════════════════════════════════════════════════════
# FEATURE 1: AI-Based Demand Forecasting & Stock Prediction
# ══════════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def demand_forecast(request):
    """
    AI-based demand forecasting using weighted moving average on historical sales.
    Returns next 3-month predicted demand per product.
    GET /api/analytics/demand-forecast/
    """
    from apps.orders.models import OrderItem
    from apps.inventory.models import Stock
    from django.db.models.functions import TruncMonth
    import math

    today = timezone.now()
    six_months_ago = today - timedelta(days=180)

    # ── Bulk fetch: all sales in last 6 months, grouped by product + month ──
    sales_qs = (
        OrderItem.objects
        .filter(order__order_date__gte=six_months_ago)
        .annotate(month=TruncMonth('order__order_date'))
        .values('product_id', 'month')
        .annotate(
            qty=Sum(
                ExpressionWrapper(
                    F('quantity_crates') * F('product__crate_size') + F('quantity_bottles'),
                    output_field=IntegerField()
                )
            )
        )
    )
    # Build lookup: {product_id: {month_str: qty}}
    sales_map = {}
    for row in sales_qs:
        pid = row['product_id']
        m   = row['month'].strftime('%Y-%m') if row['month'] else ''
        sales_map.setdefault(pid, {})[m] = int(row['qty'] or 0)

    # ── Bulk fetch: current stock per product ──
    stock_map = {}
    for s in Stock.objects.select_related('product').all():
        pid = s.product_id
        bottles = (s.total_crates * s.product.crate_size) + s.total_bottles
        stock_map[pid] = stock_map.get(pid, 0) + bottles

    products = Product.objects.all()
    forecasts = []

    for product in products:
        # Build 6-month sales array
        monthly_sales = []
        for i in range(5, -1, -1):
            m_start = today - timedelta(days=30 * (i + 1))
            month_key = m_start.strftime('%Y-%m')
            monthly_sales.append(sales_map.get(product.id, {}).get(month_key, 0))

        if sum(monthly_sales) == 0:
            continue

        weights = [1, 1, 2, 2, 3, 3]
        weighted_sum = sum(s * w for s, w in zip(monthly_sales, weights))
        avg = weighted_sum / sum(weights)

        last_month = monthly_sales[-1]
        three_month_avg = sum(monthly_sales[-3:]) / 3 if sum(monthly_sales[-3:]) else avg
        seasonal_factor = max(0.5, min((last_month / three_month_avg) if three_month_avg > 0 else 1.0, 2.0))
        predicted_next = math.ceil(avg * seasonal_factor)

        current_bottles = stock_map.get(product.id, 0)
        stock_needed    = max(0, predicted_next - current_bottles)
        crates_needed   = math.ceil(stock_needed / product.crate_size) if product.crate_size else 0

        trend = 'stable'
        if monthly_sales[-1] > monthly_sales[-2] * 1.1:
            trend = 'rising'
        elif monthly_sales[-1] < monthly_sales[-2] * 0.9:
            trend = 'falling'

        forecasts.append({
            'product_id':       product.id,
            'product_name':     product.product_name,
            'brand':            product.brand,
            'bottle_size':      product.bottle_size,
            'monthly_sales':    monthly_sales,
            'predicted_demand': predicted_next,
            'current_stock':    current_bottles,
            'stock_needed':     stock_needed,
            'crates_to_order':  crates_needed,
            'trend':            trend,
            'seasonal_factor':  round(seasonal_factor, 2),
        })

    forecasts.sort(key=lambda x: x['stock_needed'], reverse=True)

    return Response({
        'forecast_month': (today + timedelta(days=30)).strftime('%B %Y'),
        'generated_at':   today.strftime('%d %b %Y, %I:%M %p'),
        'forecasts':      forecasts,
    })


# ══════════════════════════════════════════════════════════════════
# FEATURE 2: Delivery Route Optimization (Village-wise grouping)
# ══════════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def route_optimization(request):
    """
    Village-wise delivery route planning.
    Groups pending deliveries by village, calculates load per route.
    GET /api/analytics/route-optimization/
    """
    from apps.orders.models import Order

    pending_orders = Order.objects.select_related('customer').filter(
        delivery_status__in=['Order Placed', 'Order Confirmed', 'Processing', 'Out for Delivery']
    ).prefetch_related('items__product')

    # Group by village
    village_map = {}
    for order in pending_orders:
        village = order.customer.village or 'Unknown'
        if village not in village_map:
            village_map[village] = {
                'village':       village,
                'orders':        [],
                'total_amount':  0,
                'total_crates':  0,
                'total_bottles': 0,
                'customers':     set(),
            }
        total_crates  = sum(i.quantity_crates  for i in order.items.all())
        total_bottles = sum(i.quantity_bottles for i in order.items.all())
        village_map[village]['orders'].append({
            'order_id':       order.id,
            'shop_name':      order.customer.shop_name,
            'owner_name':     order.customer.owner_name,
            'phone':          order.customer.phone,
            'address':        order.customer.address,
            'amount':         float(order.total_amount),
            'payment_status': order.payment_status,
            'delivery_status':order.delivery_status,
            'crates':         total_crates,
            'bottles':        total_bottles,
        })
        village_map[village]['total_amount']  += float(order.total_amount)
        village_map[village]['total_crates']  += total_crates
        village_map[village]['total_bottles'] += total_bottles
        village_map[village]['customers'].add(order.customer.id)

    routes = []
    for v, data in village_map.items():
        data['customer_count'] = len(data['customers'])
        data['order_count']    = len(data['orders'])
        del data['customers']
        # Priority: more crates = higher priority
        data['priority'] = 'high' if data['total_crates'] >= 10 else ('medium' if data['total_crates'] >= 5 else 'low')
        routes.append(data)

    routes.sort(key=lambda x: x['total_crates'], reverse=True)

    return Response({
        'total_pending_orders': pending_orders.count(),
        'total_villages':       len(routes),
        'routes':               routes,
    })


# ══════════════════════════════════════════════════════════════════
# FEATURE 3: Profit Per Crate / Product Analysis
# ══════════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profit_per_product(request):
    """
    Profit per product/crate analysis — optimized with bulk aggregation.
    Revenue per product from sales vs estimated cost (from purchase orders).
    GET /api/analytics/profit-per-product/
    """
    from apps.orders.models import OrderItem
    from apps.suppliers.models import PurchaseOrderItem

    # ── Bulk: revenue + bottles sold per product ──────────────────────────
    sales_agg = (
        OrderItem.objects
        .values('product_id', 'product__product_name', 'product__brand',
                'product__bottle_size', 'product__crate_size', 'product__rate_per_bottle')
        .annotate(
            total_bottles_sold=Sum(
                ExpressionWrapper(
                    F('quantity_crates') * F('product__crate_size') + F('quantity_bottles'),
                    output_field=IntegerField()
                )
            ),
            revenue=Sum(
                ExpressionWrapper(
                    (F('quantity_crates') * F('product__crate_size') + F('quantity_bottles')) * F('price'),
                    output_field=models.DecimalField(max_digits=12, decimal_places=2)
                )
            ),
        )
        .filter(total_bottles_sold__gt=0)
    )
    sales_map = {r['product_id']: r for r in sales_agg}

    # ── Bulk: avg cost per product from POs ───────────────────────────────
    cost_agg = (
        PurchaseOrderItem.objects
        .values('product_id')
        .annotate(avg_cost=models.Avg('cost_per_bottle'))
    )
    cost_map = {r['product_id']: float(r['avg_cost'] or 0) for r in cost_agg}

    result = []
    for pid, s in sales_map.items():
        avg_cost          = cost_map.get(pid, 0)
        total_bottles     = s['total_bottles_sold'] or 0
        revenue           = float(s['revenue'] or 0)
        crate_size        = s['product__crate_size'] or 1
        total_cost        = avg_cost * total_bottles
        profit            = revenue - total_cost
        crates_sold       = total_bottles / crate_size
        profit_per_crate  = profit / crates_sold if crates_sold > 0 else 0
        margin            = (profit / revenue * 100) if revenue else 0

        result.append({
            'product_id':       pid,
            'product_name':     s['product__product_name'],
            'brand':            s['product__brand'],
            'bottle_size':      s['product__bottle_size'],
            'crate_size':       crate_size,
            'selling_price':    float(s['product__rate_per_bottle']),
            'avg_cost_price':   round(avg_cost, 2),
            'bottles_sold':     total_bottles,
            'crates_sold':      round(crates_sold, 2),
            'revenue':          round(revenue, 2),
            'total_cost':       round(total_cost, 2),
            'profit':           round(profit, 2),
            'profit_per_crate': round(profit_per_crate, 2),
            'margin_percent':   round(margin, 2),
        })

    result.sort(key=lambda x: x['profit_per_crate'], reverse=True)

    return Response({
        'products': result,
        'summary': {
            'total_revenue': round(sum(p['revenue'] for p in result), 2),
            'total_cost':    round(sum(p['total_cost'] for p in result), 2),
            'total_profit':  round(sum(p['profit'] for p in result), 2),
        }
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def todays_orders(request):
    """
    GET /api/analytics/todays-orders/
    Admin: today's orders with summary stats.
    """
    from django.utils.timezone import localtime
    today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    orders = Order.objects.filter(
        order_date__gte=today_start
    ).select_related('customer').order_by('-order_date')

    total_revenue = orders.aggregate(t=Sum('total_amount'))['t'] or 0
    data = [{
        'id':              o.id,
        'shop_name':       o.customer.shop_name,
        'owner_name':      o.customer.owner_name,
        'phone':           o.customer.phone,
        'total_amount':    float(o.total_amount),
        'payment_status':  o.payment_status,
        'delivery_status': o.delivery_status,
        'order_time':      localtime(o.order_date).strftime('%I:%M %p'),
    } for o in orders]

    return Response({
        'date':          timezone.now().strftime('%d %b %Y'),
        'total_orders':  orders.count(),
        'total_revenue': float(total_revenue),
        'paid_count':    orders.filter(payment_status='Paid').count(),
        'pending_count': orders.filter(payment_status__in=['Pending','Partial']).count(),
        'orders':        data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_mark_paid(request):
    """
    POST /api/analytics/bulk-mark-paid/
    Admin: mark multiple orders as Paid at once.
    Body: { order_ids: [1, 2, 3] }
    """
    if not (request.user.is_staff or request.user.is_superuser):
        return Response({'error': 'Admin only'}, status=403)

    order_ids = request.data.get('order_ids', [])
    if not order_ids:
        return Response({'error': 'order_ids list is required'}, status=400)

    updated = Order.objects.filter(id__in=order_ids).update(payment_status='Paid')

    try:
        from apps.audit.utils import log_action
        log_action(request, 'UPDATE', f'Bulk marked {updated} orders as Paid: {order_ids}', 'Order', None)
    except Exception:
        pass

    return Response({'updated': updated, 'message': f'{updated} orders marked as Paid.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def whatsapp_broadcast(request):
    """
    POST /api/analytics/whatsapp-broadcast/
    Admin: send WhatsApp message to all/selected customers.
    Body: { message, customer_ids (optional — empty = all) }
    """
    if not (request.user.is_staff or request.user.is_superuser):
        return Response({'error': 'Admin only'}, status=403)

    message     = request.data.get('message', '').strip()
    customer_ids = request.data.get('customer_ids', [])

    if not message:
        return Response({'error': 'Message is required'}, status=400)
    if len(message) > 1000:
        return Response({'error': 'Message too long (max 1000 chars)'}, status=400)

    from apps.customers.models import Customer
    from apps.billing.notifications import _twilio_client, _send_whatsapp, _send_sms

    if customer_ids:
        customers = Customer.objects.filter(id__in=customer_ids, phone__isnull=False)
    else:
        customers = Customer.objects.filter(phone__isnull=False).exclude(phone='')

    client = _twilio_client()
    sent = 0
    failed = 0
    errors = []

    for customer in customers:
        try:
            full_msg = f"📢 *Shree Ganesh Agency*\n\nDear *{customer.owner_name}*,\n\n{message}\n\n— Shree Ganesh Agency 🙏"
            ok = _send_whatsapp(client, customer.phone, full_msg)
            if not ok:
                ok = _send_sms(client, customer.phone, full_msg)
            if ok:
                sent += 1
            else:
                failed += 1
        except Exception as e:
            failed += 1
            errors.append({'customer': customer.shop_name, 'error': str(e)})

    return Response({
        'total':  sent + failed,
        'sent':   sent,
        'failed': failed,
        'errors': errors[:10],
    })


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_customer_credit(request, customer_id):
    """
    PATCH /api/analytics/customers/<id>/credit/
    Admin: directly update customer credit limit.
    Body: { credit_limit }
    """
    if not (request.user.is_staff or request.user.is_superuser):
        return Response({'error': 'Admin only'}, status=403)

    try:
        from apps.customers.models import Customer
        customer = Customer.objects.get(id=customer_id)
    except Customer.DoesNotExist:
        return Response({'error': 'Customer not found'}, status=404)

    new_limit = request.data.get('credit_limit')
    if new_limit is None:
        return Response({'error': 'credit_limit is required'}, status=400)

    try:
        new_limit = float(new_limit)
        if new_limit < 0:
            raise ValueError
    except (TypeError, ValueError):
        return Response({'error': 'Invalid credit_limit value'}, status=400)

    old_limit = float(customer.credit_limit)
    customer.credit_limit = new_limit
    customer.save(update_fields=['credit_limit'])

    try:
        from apps.audit.utils import log_action
        log_action(request, 'UPDATE', f'Credit limit updated for {customer.shop_name}: ₹{old_limit} → ₹{new_limit}', 'Customer', customer.id)
    except Exception:
        pass

    return Response({
        'customer_id':  customer.id,
        'shop_name':    customer.shop_name,
        'credit_limit': float(customer.credit_limit),
        'message':      f'Credit limit updated to ₹{new_limit:,.0f}',
    })
