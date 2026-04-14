from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .models import LoyaltyAccount, LoyaltyTransaction
from apps.customers.models import Customer

POINTS_PER_100 = 1  # 1 point per ₹100 spent


def get_or_create_account(customer):
    acc, _ = LoyaltyAccount.objects.get_or_create(customer=customer)
    return acc


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_loyalty(request):
    """Customer: get own loyalty account."""
    try:
        customer = request.user.customer_profile
    except Exception:
        return Response({'points': 0, 'tier': 'Bronze', 'total_earned': 0, 'transactions': []})
    acc = get_or_create_account(customer)
    txns = acc.transactions.all()[:20]
    return Response({
        'points': acc.points,
        'tier': acc.tier,
        'total_earned': acc.total_earned,
        'total_redeemed': acc.total_redeemed,
        'transactions': [
            {'type': t.transaction_type, 'points': t.points, 'description': t.description,
             'date': t.created_at.strftime('%d %b %Y')}
            for t in txns
        ]
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def all_loyalty(request):
    """Admin: list all loyalty accounts."""
    if not (request.user.is_staff or request.user.is_superuser):
        return Response({'error': 'Admin only'}, status=403)
    accounts = LoyaltyAccount.objects.select_related('customer').order_by('-points')
    return Response([{
        'customer_id': a.customer_id,
        'shop_name': a.customer.shop_name,
        'owner_name': a.customer.owner_name,
        'points': a.points,
        'tier': a.tier,
        'total_earned': a.total_earned,
        'total_redeemed': a.total_redeemed,
    } for a in accounts])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def award_bonus(request):
    """Admin: manually award bonus points to a customer."""
    if not (request.user.is_staff or request.user.is_superuser):
        return Response({'error': 'Admin only'}, status=403)
    customer_id = request.data.get('customer_id')
    points = int(request.data.get('points', 0))
    description = request.data.get('description', 'Bonus points')
    if points <= 0:
        return Response({'error': 'Points must be positive'}, status=400)
    try:
        customer = Customer.objects.get(id=customer_id)
    except Customer.DoesNotExist:
        return Response({'error': 'Customer not found'}, status=404)
    acc = get_or_create_account(customer)
    acc.points += points
    acc.total_earned += points
    acc.save()
    LoyaltyTransaction.objects.create(account=acc, points=points, transaction_type='bonus', description=description)
    return Response({'status': 'ok', 'new_balance': acc.points})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def redeem_points(request):
    """Customer: redeem points (100 pts = ₹10 discount)."""
    try:
        customer = request.user.customer_profile
    except Exception:
        return Response({'error': 'Customer profile not found'}, status=404)
    points = int(request.data.get('points', 0))
    if points <= 0:
        return Response({'error': 'Points must be positive'}, status=400)
    acc = get_or_create_account(customer)
    if acc.points < points:
        return Response({'error': f'Insufficient points. You have {acc.points} pts.'}, status=400)
    acc.points -= points
    acc.total_redeemed += points
    acc.save()
    discount = round(points / 10, 2)  # 100 pts = ₹10
    LoyaltyTransaction.objects.create(
        account=acc, points=-points, transaction_type='redeem',
        description=f'Redeemed {points} pts for ₹{discount} discount'
    )
    return Response({'status': 'ok', 'points_redeemed': points, 'discount_amount': discount, 'discount_value': discount, 'remaining_points': acc.points})


def award_order_points(order, customer):
    """Called after order creation to award loyalty points."""
    points = int(float(order.total_amount) / 100) * POINTS_PER_100
    if points <= 0:
        return
    acc = get_or_create_account(customer)
    acc.points += points
    acc.total_earned += points
    acc.save()
    LoyaltyTransaction.objects.create(
        account=acc, points=points, transaction_type='earn',
        description=f'Order #{order.id} — ₹{order.total_amount}'
    )
