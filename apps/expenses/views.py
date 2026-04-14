from rest_framework import viewsets, filters, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, Max, Q, F, ExpressionWrapper, DecimalField, Count
from .models import CreditTransaction, Expense
from .serializers import CreditTransactionSerializer, ExpenseSerializer
from apps.customers.models import Customer
from apps.orders.models import Order


class CreditTransactionViewSet(viewsets.ModelViewSet):
    queryset = CreditTransaction.objects.select_related('customer', 'invoice').all()
    serializer_class = CreditTransactionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['customer', 'status']
    search_fields = ['customer__shop_name', 'invoice__invoice_number']
    ordering_fields = ['created_at', 'amount_due', 'payment_date']

    @action(detail=True, methods=['post'])
    def make_payment(self, request, pk=None):
        """Record a payment for credit transaction"""
        credit = self.get_object()
        payment_amount = request.data.get('payment_amount', 0)
        try:
            payment_amount = float(payment_amount)
            if payment_amount <= 0:
                return Response({'error': 'Payment amount must be greater than 0'},
                                status=status.HTTP_400_BAD_REQUEST)
            if credit.amount_paid + payment_amount > credit.amount_due:
                return Response({'error': 'Payment exceeds remaining amount'},
                                status=status.HTTP_400_BAD_REQUEST)
            credit.amount_paid += payment_amount
            credit.update_status()
            return Response({
                'status': 'Payment recorded successfully',
                'remaining_amount': credit.remaining_amount,
            })
        except ValueError:
            return Response({'error': 'Invalid payment amount'},
                            status=status.HTTP_400_BAD_REQUEST)


class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'date']
    search_fields = ['expense_name', 'notes']
    ordering_fields = ['date', 'amount']


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def customer_credit_overview(request):
    """
    GET /api/credit/
    Returns per-customer credit summary:
      - credit_limit       (from Customer model)
      - used_credit        (sum of pending/partial order amounts)
      - remaining_credit   (credit_limit - used_credit)
      - total_outstanding  (sum of unpaid CreditTransactions)
      - last_payment_date  (most recent CreditTransaction payment_date)
      - exceeded           (bool: used_credit > credit_limit)
      - transaction_count  (open credit transactions)
    """
    search = request.query_params.get('search', '').strip()
    status_filter = request.query_params.get('status', '')   # exceeded | ok | all

    customers = Customer.objects.all().order_by('shop_name')
    if search:
        customers = customers.filter(
            Q(shop_name__icontains=search) | Q(owner_name__icontains=search)
        )

    # ── Bulk aggregations — N+1 avoid karo ──────────────────────────────────
    from django.db.models import OuterRef, Subquery
    customer_ids = list(customers.values_list('id', flat=True))

    # Used credit per customer (unpaid orders)
    used_map = dict(
        Order.objects.filter(
            customer_id__in=customer_ids,
            payment_status__in=['Pending', 'Partial'],
        ).values('customer_id').annotate(total=Sum('total_amount')).values_list('customer_id', 'total')
    )

    # Outstanding credit transactions per customer
    outstanding_map = dict(
        CreditTransaction.objects.filter(
            customer_id__in=customer_ids,
            status__in=['Pending', 'Partial'],
        ).values('customer_id').annotate(
            total=Sum(ExpressionWrapper(F('amount_due') - F('amount_paid'), output_field=DecimalField()))
        ).values_list('customer_id', 'total')
    )

    # Last payment date per customer
    last_payment_map = dict(
        CreditTransaction.objects.filter(
            customer_id__in=customer_ids,
            payment_date__isnull=False,
        ).values('customer_id').annotate(last=Max('payment_date')).values_list('customer_id', 'last')
    )

    # Open transaction count per customer
    txn_count_map = dict(
        CreditTransaction.objects.filter(
            customer_id__in=customer_ids,
            status__in=['Pending', 'Partial'],
        ).values('customer_id').annotate(cnt=Count('id')).values_list('customer_id', 'cnt')
    )

    data = []
    for customer in customers:
        credit_limit    = float(customer.credit_limit)
        used            = float(used_map.get(customer.id) or 0)
        remaining       = credit_limit - used
        exceeded        = used > credit_limit
        utilisation_pct = round((used / credit_limit * 100), 1) if credit_limit > 0 else 0
        last_payment    = last_payment_map.get(customer.id)

        row = {
            'customer_id':      customer.id,
            'shop_name':        customer.shop_name,
            'owner_name':       customer.owner_name,
            'phone':            customer.phone,
            'village':          customer.village,
            'credit_limit':     credit_limit,
            'used_credit':      used,
            'remaining_credit': remaining,
            'outstanding':      float(outstanding_map.get(customer.id) or 0),
            'last_payment_date': str(last_payment) if last_payment else None,
            'exceeded':         exceeded,
            'utilisation_pct':  utilisation_pct,
            'transaction_count': txn_count_map.get(customer.id, 0),
        }
        data.append(row)

    # Status filter
    if status_filter == 'exceeded':
        data = [d for d in data if d['exceeded']]
    elif status_filter == 'ok':
        data = [d for d in data if not d['exceeded']]

    # Sort: exceeded first, then by used_credit desc
    data.sort(key=lambda d: (-int(d['exceeded']), -d['used_credit']))

    total_outstanding = sum(d['outstanding'] for d in data)
    exceeded_count    = sum(1 for d in data if d['exceeded'])

    return Response({
        'summary': {
            'total_customers':   len(data),
            'exceeded_count':    exceeded_count,
            'total_outstanding': total_outstanding,
        },
        'customers': data,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_credit_history(request):
    """
    GET /api/credit/my-history/
    Customer ला स्वतःचा detailed credit/payment history दाखवतो.
    """
    try:
        customer = request.user.customer_profile
    except Exception:
        return Response({'error': 'Customer profile not found'}, status=404)

    # Credit transactions
    txns = CreditTransaction.objects.filter(customer=customer).select_related('invoice', 'invoice__order').order_by('-created_at')

    transactions = []
    for t in txns:
        transactions.append({
            'id':             t.id,
            'amount_due':     float(t.amount_due),
            'amount_paid':    float(t.amount_paid),
            'remaining':      float(t.remaining_amount),
            'status':         t.status,
            'payment_date':   str(t.payment_date) if t.payment_date else None,
            'created_at':     t.created_at.strftime('%d %b %Y'),
            'notes':          t.notes or '',
            'invoice_number': t.invoice.invoice_number if t.invoice else None,
            'order_id':       t.invoice.order_id if t.invoice else None,
        })

    # Summary
    total_due  = sum(float(t.amount_due)  for t in txns)
    total_paid = sum(float(t.amount_paid) for t in txns)

    return Response({
        'credit_limit':  float(customer.credit_limit),
        'total_due':     total_due,
        'total_paid':    total_paid,
        'outstanding':   total_due - total_paid,
        'transactions':  transactions,
    })
