from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from django.http import HttpResponse
from django.db.models import Sum, Count, F, ExpressionWrapper, DecimalField
from django.utils import timezone
from datetime import timedelta
from apps.inventory.models import Stock
from apps.orders.models import Order, OrderItem
from apps.customers.models import Customer
from .utils import (
    generate_stock_report_pdf, generate_stock_report_excel,
    generate_sales_report_excel, generate_sales_report_pdf,
    generate_customer_report_pdf, generate_customer_report_excel,
    generate_products_report_pdf, generate_products_report_excel,
    generate_monthly_report_pdf, generate_monthly_report_excel,
)


class DailyStockReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        format_type = request.query_params.get('format', 'json')
        
        stocks = Stock.objects.select_related('product').all()
        
        stock_data = []
        for stock in stocks:
            stock_data.append({
                'product': stock.product.product_name,
                'brand': stock.product.brand,
                'warehouse': stock.warehouse_name,
                'total_crates': stock.total_crates,
                'total_bottles': stock.total_bottles,
                'last_updated': stock.updated_at
            })
        
        if format_type == 'pdf':
            pdf_buffer = generate_stock_report_pdf(stock_data)
            response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="stock_report_{timezone.now().date()}.pdf"'
            return response
        
        return Response({
            'date': timezone.now().date(),
            'total_products': len(stock_data),
            'stocks': stock_data
        })


class MonthlySalesReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        format_type = request.query_params.get('format', 'json')
        today = timezone.now()
        first_day = today.replace(day=1)
        
        orders = Order.objects.filter(
            order_date__gte=first_day
        ).select_related('customer').prefetch_related('items__product')
        
        sales_data = []
        for order in orders:
            sales_data.append({
                'order_id': order.id,
                'customer': order.customer.shop_name,
                'date': order.order_date,
                'total_amount': float(order.total_amount),
                'payment_status': order.payment_status,
                'delivery_status': order.delivery_status
            })
        
        total_sales = sum(item['total_amount'] for item in sales_data)
        
        if format_type == 'pdf':
            pdf_buffer = generate_sales_report_pdf(sales_data, today.strftime('%B %Y'))
            response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="sales_report_{today.strftime("%Y_%m")}.pdf"'
            return response
        
        elif format_type == 'excel':
            excel_buffer = generate_sales_report_excel(sales_data, today.strftime('%B %Y'))
            response = HttpResponse(
                excel_buffer.getvalue(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="sales_report_{today.strftime("%Y_%m")}.xlsx"'
            return response
        
        return Response({
            'month': today.strftime('%B %Y'),
            'total_orders': len(sales_data),
            'total_sales': total_sales,
            'orders': sales_data
        })


class TopCustomersReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        limit = int(request.query_params.get('limit', 10))
        period_days = int(request.query_params.get('days', 30))
        
        start_date = timezone.now() - timedelta(days=period_days)
        
        top_customers = Customer.objects.filter(
            orders__order_date__gte=start_date
        ).annotate(
            total_orders=Count('orders'),
            total_spent=Sum('orders__total_amount')
        ).filter(total_orders__gt=0).order_by('-total_spent')[:limit]
        
        customer_data = []
        for customer in top_customers:
            customer_data.append({
                'shop_name': customer.shop_name,
                'owner_name': customer.owner_name,
                'phone': customer.phone,
                'village': customer.village,
                'total_orders': customer.total_orders,
                'total_spent': float(customer.total_spent or 0)
            })
        
        return Response({
            'period_days': period_days,
            'top_customers': customer_data
        })


class LowStockAlertView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        threshold_crates = int(request.query_params.get('threshold_crates', 5))
        threshold_bottles = int(request.query_params.get('threshold_bottles', 50))
        
        low_stock_items = Stock.objects.filter(
            total_crates__lte=threshold_crates,
            total_bottles__lte=threshold_bottles
        ).select_related('product')
        
        alerts = []
        for stock in low_stock_items:
            alerts.append({
                'product': stock.product.product_name,
                'brand': stock.product.brand,
                'warehouse': stock.warehouse_name,
                'current_crates': stock.total_crates,
                'current_bottles': stock.total_bottles,
                'alert_level': 'Critical' if stock.total_crates < 2 else 'Low'
            })
        
        return Response({
            'threshold_crates': threshold_crates,
            'threshold_bottles': threshold_bottles,
            'alert_count': len(alerts),
            'alerts': alerts
        })


class TopProductsReportView(APIView):
    """
    GET /api/reports/top-products/
    ?limit=10  ?days=30
    Returns top-selling products by total bottles sold and revenue.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        limit = int(request.query_params.get('limit', 10))
        days  = int(request.query_params.get('days', 30))
        start = timezone.now() - timedelta(days=days)

        results = (
            OrderItem.objects
            .filter(order__order_date__gte=start)
            .values('product__product_name', 'product__brand', 'product__bottle_size')
            .annotate(
                total_bottles=Sum(
                    ExpressionWrapper(
                        F('quantity_crates') * F('product__crate_size') + F('quantity_bottles'),
                        output_field=DecimalField()
                    )
                ),
                total_revenue=Sum(
                    ExpressionWrapper(
                        (F('quantity_crates') * F('product__crate_size') + F('quantity_bottles')) * F('price'),
                        output_field=DecimalField()
                    )
                ),
                order_count=Count('order', distinct=True),
            )
            .order_by('-total_revenue')[:limit]
        )

        data = [
            {
                'product_name':  r['product__product_name'],
                'brand':         r['product__brand'],
                'bottle_size':   r['product__bottle_size'],
                'total_bottles': int(r['total_bottles'] or 0),
                'total_revenue': float(r['total_revenue'] or 0),
                'order_count':   r['order_count'],
            }
            for r in results
        ]
        return Response({'period_days': days, 'top_products': data})


class MonthlyRevenueReportView(APIView):
    """
    GET /api/reports/monthly/
    ?months=6
    Returns month-by-month revenue, order count, and avg order value.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        num_months = int(request.query_params.get('months', 6))
        today = timezone.now()
        months_data = []

        for i in range(num_months - 1, -1, -1):
            # Calendar-accurate month boundaries
            m_start = (today.replace(day=1) - timedelta(days=30 * i)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            if m_start.month == 12:
                m_end = m_start.replace(year=m_start.year + 1, month=1)
            else:
                m_end = m_start.replace(month=m_start.month + 1)

            qs = Order.objects.filter(order_date__gte=m_start, order_date__lt=m_end)
            revenue     = qs.aggregate(t=Sum('total_amount'))['t'] or 0
            order_count = qs.count()
            paid        = qs.filter(payment_status='Paid').aggregate(t=Sum('total_amount'))['t'] or 0
            pending     = qs.filter(payment_status__in=['Pending', 'Partial']).aggregate(t=Sum('total_amount'))['t'] or 0

            months_data.append({
                'month':       m_start.strftime('%b %Y'),
                'revenue':     float(revenue),
                'order_count': order_count,
                'paid':        float(paid),
                'pending':     float(pending),
                'avg_order':   round(float(revenue) / order_count, 2) if order_count else 0,
            })

        total_revenue = sum(m['revenue'] for m in months_data)
        return Response({
            'months':        num_months,
            'total_revenue': total_revenue,
            'monthly_data':  months_data,
        })


def download_report(request):
    """
    Unified report download endpoint — plain Django view with JWT auth.
    Query params:
      report_type = sales | inventory | customers | products | monthly | low_stock
      format      = pdf | excel | json
    """
    from django.http import JsonResponse, HttpResponse as _HR
    from rest_framework_simplejwt.authentication import JWTAuthentication
    from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

    # ── JWT Authentication ─────────────────────────────────────
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if not auth_header.startswith('Bearer '):
        return JsonResponse({'error': 'Authentication required'}, status=401)
    try:
        jwt_auth = JWTAuthentication()
        validated_token = jwt_auth.get_validated_token(auth_header.split(' ')[1])
        user = jwt_auth.get_user(validated_token)
        if not user or not user.is_active:
            return JsonResponse({'error': 'Invalid token'}, status=401)
    except (InvalidToken, TokenError) as e:
        return JsonResponse({'error': str(e)}, status=401)

    report_type = request.GET.get('report_type') or request.GET.get('type', 'sales')
    fmt         = request.GET.get('format', 'pdf')
    days        = int(request.GET.get('days', 30))
    date_from_s = request.GET.get('date_from', '')
    date_to_s   = request.GET.get('date_to', '')
    today       = timezone.now()
    stamp       = today.strftime('%Y%m%d')

    from datetime import datetime as _dt
    if date_from_s and date_to_s:
        try:
            range_start = timezone.make_aware(_dt.strptime(date_from_s, '%Y-%m-%d'))
            range_end   = timezone.make_aware(_dt.strptime(date_to_s, '%Y-%m-%d').replace(hour=23, minute=59, second=59))
            period_label = '{} to {}'.format(date_from_s, date_to_s)
        except ValueError:
            return JsonResponse({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=400)
    else:
        range_start = today - timedelta(days=days)
        range_end   = today
        period_label = 'Last {} days'.format(days)

    def _file_resp(buf, content_type, filename):
        data = buf.getvalue()
        r = _HR(data, content_type=content_type)
        r['Content-Disposition'] = 'attachment; filename="{}"'.format(filename)
        r['Content-Length'] = str(len(data))
        return r

    # ── Sales ──────────────────────────────────────────────────
    if report_type == 'sales':
        first_day = range_start
        orders = Order.objects.filter(
            order_date__gte=first_day,
            order_date__lte=range_end,
        ).select_related('customer').prefetch_related('items__product')

        sales_data = [{
            'order_id':       o.id,
            'customer':       o.customer.shop_name,
            'date':           o.order_date,
            'total_amount':   float(o.total_amount),
            'payment_status': o.payment_status,
            'delivery_status':o.delivery_status,
        } for o in orders]

        month_label = period_label

        if fmt == 'json':
            return JsonResponse({'period': period_label, 'total_orders': len(sales_data), 'total_sales': sum(r['total_amount'] for r in sales_data), 'data': sales_data})
        if fmt == 'excel':
            buf = generate_sales_report_excel(sales_data, month_label)
            return _file_resp(buf, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'sales_report_{}.xlsx'.format(stamp))
        buf = generate_sales_report_pdf(sales_data, month_label)
        return _file_resp(buf, 'application/pdf', 'sales_report_{}.pdf'.format(stamp))

    # ── Inventory / Stock ──────────────────────────────────────
    elif report_type in ('inventory', 'stock'):
        stocks = Stock.objects.select_related('product').all()
        stock_data = [{
            'product':       s.product.product_name,
            'brand':         s.product.brand,
            'warehouse':     s.warehouse_name,
            'total_crates':  s.total_crates,
            'total_bottles': s.total_bottles,
        } for s in stocks]

        if fmt == 'json':
            return JsonResponse({'total_products': len(stock_data), 'stocks': stock_data})
        if fmt == 'excel':
            buf = generate_stock_report_excel(stock_data)
            return _file_resp(buf, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'inventory_report_{}.xlsx'.format(stamp))
        buf = generate_stock_report_pdf(stock_data)
        return _file_resp(buf, 'application/pdf', 'inventory_report_{}.pdf'.format(stamp))

    # ── Customers ──────────────────────────────────────────────
    elif report_type == 'customers':
        start = range_start
        customers = Customer.objects.filter(
            orders__order_date__gte=start,
            orders__order_date__lte=range_end,
        ).annotate(
            total_orders=Count('orders'),
            total_spent=Sum('orders__total_amount'),
        ).filter(total_orders__gt=0).order_by('-total_spent')

        customer_data = [{
            'shop_name':   c.shop_name,
            'owner_name':  c.owner_name,
            'phone':       c.phone,
            'village':     c.village,
            'total_orders':c.total_orders,
            'total_spent': float(c.total_spent or 0),
        } for c in customers]

        if fmt == 'json':
            return JsonResponse({'period': period_label, 'total_customers': len(customer_data), 'customers': customer_data})
        if fmt == 'excel':
            buf = generate_customer_report_excel(customer_data, period_label)
            return _file_resp(buf, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'customer_report_{}.xlsx'.format(stamp))
        buf = generate_customer_report_pdf(customer_data, period_label)
        return _file_resp(buf, 'application/pdf', 'customer_report_{}.pdf'.format(stamp))

    # ── Top Products ───────────────────────────────────────────
    elif report_type == 'products':
        start = range_start
        results = (
            OrderItem.objects
            .filter(order__order_date__gte=start, order__order_date__lte=range_end)
            .values('product__product_name', 'product__brand', 'product__bottle_size')
            .annotate(
                total_bottles=Sum(
                    ExpressionWrapper(
                        F('quantity_crates') * F('product__crate_size') + F('quantity_bottles'),
                        output_field=DecimalField()
                    )
                ),
                total_revenue=Sum(
                    ExpressionWrapper(
                        (F('quantity_crates') * F('product__crate_size') + F('quantity_bottles')) * F('price'),
                        output_field=DecimalField()
                    )
                ),
                order_count=Count('order', distinct=True),
            )
            .order_by('-total_revenue')
        )
        products_data = [{
            'product_name':  r['product__product_name'],
            'brand':         r['product__brand'],
            'bottle_size':   r['product__bottle_size'],
            'total_bottles': int(r['total_bottles'] or 0),
            'total_revenue': float(r['total_revenue'] or 0),
            'order_count':   r['order_count'],
        } for r in results]
        if fmt == 'json':
            return JsonResponse({'period': period_label, 'total_products': len(products_data), 'products': products_data})
        if fmt == 'excel':
            buf = generate_products_report_excel(products_data, period_label)
            return _file_resp(buf, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'products_report_{}.xlsx'.format(stamp))
        buf = generate_products_report_pdf(products_data, period_label)
        return _file_resp(buf, 'application/pdf', 'products_report_{}.pdf'.format(stamp))

    # ── Monthly Revenue ────────────────────────────────────────
    elif report_type == 'monthly':
        num_months = int(request.GET.get('months', 6))
        months_data = []
        for i in range(num_months - 1, -1, -1):
            m_start = (today.replace(day=1) - timedelta(days=30 * i)).replace(
                hour=0, minute=0, second=0, microsecond=0)
            # Safe month-end: use first day of next month
            if m_start.month == 12:
                m_end = m_start.replace(year=m_start.year + 1, month=1, day=1)
            else:
                m_end = m_start.replace(month=m_start.month + 1, day=1)
            qs = Order.objects.filter(order_date__gte=m_start, order_date__lt=m_end)
            revenue = qs.aggregate(t=Sum('total_amount'))['t'] or 0
            months_data.append({
                'month': m_start.strftime('%b %Y'),
                'revenue': float(revenue),
                'order_count': qs.count(),
            })
        if fmt == 'json':
            return JsonResponse({'total_revenue': sum(m['revenue'] for m in months_data), 'months': months_data})
        if fmt == 'excel':
            buf = generate_monthly_report_excel(months_data)
            return _file_resp(buf, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'monthly_report_{}.xlsx'.format(stamp))
        buf = generate_monthly_report_pdf(months_data)
        return _file_resp(buf, 'application/pdf', 'monthly_report_{}.pdf'.format(stamp))

    # ── Low Stock Alerts ───────────────────────────────────────
    elif report_type == 'low_stock':
        threshold = int(request.GET.get('threshold_crates', 5))
        low = Stock.objects.filter(total_crates__lte=threshold).select_related('product')
        alerts_data = [{
            'product': s.product.product_name,
            'brand': s.product.brand,
            'warehouse': s.warehouse_name,
            'current_crates': s.total_crates,
            'current_bottles': s.total_bottles,
            'alert_level': 'Critical' if s.total_crates < 2 else 'Low',
        } for s in low]
        return JsonResponse({'total_alerts': len(alerts_data), 'alerts': alerts_data})

    return JsonResponse({'error': 'Invalid report_type'}, status=400)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def customer_sales_report(request, customer_id):
    """
    GET /api/reports/customer/<id>/
    Customer-wise detailed sales report.
    ?format=pdf|excel|json
    """
    from apps.customers.models import Customer
    from apps.billing.models import Payment
    from django.db.models import Sum, Count

    try:
        customer = Customer.objects.get(id=customer_id)
    except Customer.DoesNotExist:
        from rest_framework.response import Response
        return Response({'error': 'Customer not found'}, status=404)

    fmt = request.query_params.get('format', 'json')
    orders = Order.objects.filter(customer=customer).prefetch_related('items__product').order_by('-order_date')

    total_orders   = orders.count()
    total_revenue  = orders.aggregate(t=Sum('total_amount'))['t'] or 0
    paid_amount    = orders.filter(payment_status='Paid').aggregate(t=Sum('total_amount'))['t'] or 0
    pending_amount = orders.filter(payment_status__in=['Pending','Partial']).aggregate(t=Sum('total_amount'))['t'] or 0

    orders_data = [{
        'order_id':       o.id,
        'date':           o.order_date.strftime('%d %b %Y'),
        'total_amount':   float(o.total_amount),
        'payment_status': o.payment_status,
        'delivery_status':o.delivery_status,
        'items':          [
            f"{i.product.product_name} x{i.quantity_crates}cr+{i.quantity_bottles}btl"
            for i in o.items.all()
        ],
    } for o in orders]

    report_data = {
        'customer': {
            'id':           customer.id,
            'shop_name':    customer.shop_name,
            'owner_name':   customer.owner_name,
            'phone':        customer.phone,
            'village':      customer.village,
            'credit_limit': float(customer.credit_limit),
        },
        'summary': {
            'total_orders':   total_orders,
            'total_revenue':  float(total_revenue),
            'paid_amount':    float(paid_amount),
            'pending_amount': float(pending_amount),
        },
        'orders': orders_data,
    }

    if fmt == 'json':
        from rest_framework.response import Response
        return Response(report_data)

    # PDF
    from django.http import HttpResponse
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet
    import io

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=30, bottomMargin=30)
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph(f"Customer Sales Report — {customer.shop_name}", styles['Title']))
    story.append(Paragraph(f"Owner: {customer.owner_name} | Phone: {customer.phone} | Village: {customer.village}", styles['Normal']))
    story.append(Spacer(1, 12))

    summary_data = [
        ['Total Orders', 'Total Revenue', 'Paid', 'Pending'],
        [str(total_orders), f'₹{float(total_revenue):,.0f}', f'₹{float(paid_amount):,.0f}', f'₹{float(pending_amount):,.0f}'],
    ]
    t = Table(summary_data, colWidths=[120, 120, 120, 120])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E3A5F')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#F0F4FF')),
    ]))
    story.append(t)
    story.append(Spacer(1, 16))

    story.append(Paragraph("Order History", styles['Heading2']))
    order_table_data = [['Order #', 'Date', 'Amount', 'Payment', 'Delivery']]
    for o in orders_data:
        order_table_data.append([
            f"#{o['order_id']}", o['date'],
            f"₹{o['total_amount']:,.0f}", o['payment_status'], o['delivery_status'],
        ])
    ot = Table(order_table_data, colWidths=[60, 80, 80, 80, 100])
    ot.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#C00000')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F9F9F9')]),
    ]))
    story.append(ot)

    doc.build(story)
    buf.seek(0)
    response = HttpResponse(buf.getvalue(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="customer_report_{customer.id}_{customer.shop_name}.pdf"'
    return response
