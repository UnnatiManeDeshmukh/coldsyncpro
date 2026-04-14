"""
Unit tests for loyalty system:
- Points awarded on order
- Redeem points
- Tier calculation
"""
from django.test import TestCase
from django.contrib.auth.models import User
from apps.customers.models import Customer
from apps.orders.models import Order
from apps.loyalty.models import LoyaltyAccount, LoyaltyTransaction
from apps.loyalty.views import award_order_points


def make_customer():
    u = User.objects.create_user(username='loyaluser', password='pass')
    return Customer.objects.create(
        user=u, shop_name='Loyal Shop', owner_name='Loyal Owner',
        phone='9000000001', address='Addr', village='V', credit_limit=50000,
    )


class LoyaltyPointsTest(TestCase):
    def setUp(self):
        self.customer = make_customer()

    def test_award_points_on_order(self):
        order = Order.objects.create(
            customer=self.customer, delivery_status='Delivered',
            payment_status='Paid', total_amount=1000,
        )
        award_order_points(order, self.customer)
        acc = LoyaltyAccount.objects.get(customer=self.customer)
        # 1 point per ₹100 → 10 points for ₹1000
        self.assertEqual(acc.points, 10)
        self.assertEqual(acc.total_earned, 10)

    def test_no_points_for_zero_amount(self):
        order = Order.objects.create(
            customer=self.customer, delivery_status='Delivered',
            payment_status='Paid', total_amount=0,
        )
        award_order_points(order, self.customer)
        self.assertFalse(LoyaltyAccount.objects.filter(customer=self.customer).exists())

    def test_tier_bronze(self):
        acc = LoyaltyAccount.objects.create(customer=self.customer, total_earned=100)
        self.assertEqual(acc.tier, 'Bronze')

    def test_tier_silver(self):
        acc = LoyaltyAccount.objects.create(customer=self.customer, total_earned=2500)
        self.assertEqual(acc.tier, 'Silver')

    def test_tier_gold(self):
        acc = LoyaltyAccount.objects.create(customer=self.customer, total_earned=6000)
        self.assertEqual(acc.tier, 'Gold')

    def test_redeem_points(self):
        from rest_framework.test import APIClient
        acc = LoyaltyAccount.objects.create(
            customer=self.customer, points=200, total_earned=200,
        )
        client = APIClient()
        client.force_authenticate(user=self.customer.user)
        res = client.post('/api/loyalty/redeem/', {'points': 100}, format='json')
        self.assertEqual(res.status_code, 200)
        acc.refresh_from_db()
        self.assertEqual(acc.points, 100)
        self.assertEqual(acc.total_redeemed, 100)

    def test_redeem_insufficient_points(self):
        from rest_framework.test import APIClient
        LoyaltyAccount.objects.create(customer=self.customer, points=50)
        client = APIClient()
        client.force_authenticate(user=self.customer.user)
        res = client.post('/api/loyalty/redeem/', {'points': 200}, format='json')
        self.assertEqual(res.status_code, 400)
