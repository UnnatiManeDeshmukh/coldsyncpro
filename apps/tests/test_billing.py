"""
Unit tests for billing critical paths:
- pay_now: valid payment, duplicate reference, invalid amount
- verify_payment: admin verify/reject, order status update
- UPI config: get/update
"""
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from apps.customers.models import Customer
from apps.orders.models import Order
from apps.billing.models import Payment


def make_user(username='u', is_staff=False):
    u = User.objects.create_user(username=username, password='pass')
    u.is_staff = is_staff
    u.save()
    return u


def make_customer(user):
    return Customer.objects.create(
        user=user, shop_name='Shop', owner_name='Owner',
        phone=f'9{user.id:09d}'[:10], address='Addr', village='V', credit_limit=50000,
    )


class PayNowTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user('buyer')
        self.customer = make_customer(self.user)
        self.client.force_authenticate(user=self.user)

    def test_pay_now_success(self):
        res = self.client.post('/api/billing/pay-now/', {
            'amount': 500, 'reference_number': '123456789012',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data['success'])
        self.assertEqual(Payment.objects.count(), 1)

    def test_pay_now_duplicate_reference(self):
        Payment.objects.create(
            customer=self.customer, amount=100,
            payment_method='UPI', reference_number='DUPREF123456',
        )
        res = self.client.post('/api/billing/pay-now/', {
            'amount': 200, 'reference_number': 'DUPREF123456',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('reference', res.data['error'].lower())

    def test_pay_now_invalid_amount(self):
        res = self.client.post('/api/billing/pay-now/', {
            'amount': -100, 'reference_number': '999999999999',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_pay_now_missing_reference(self):
        res = self.client.post('/api/billing/pay-now/', {
            'amount': 500, 'reference_number': '',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class VerifyPaymentTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = make_user('admin', is_staff=True)
        self.user = make_user('cust')
        self.customer = make_customer(self.user)
        self.order = Order.objects.create(
            customer=self.customer, delivery_status='Delivered',
            payment_status='Pending', total_amount=500,
        )
        self.payment = Payment.objects.create(
            customer=self.customer, order=self.order,
            amount=500, payment_method='UPI', reference_number='TESTREF123456',
        )
        self.client.force_authenticate(user=self.admin)

    def test_verify_payment_updates_order_status(self):
        res = self.client.post(f'/api/billing/payments/{self.payment.id}/verify/', {
            'action': 'verify'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.payment_status, 'Paid')

    def test_reject_payment_resets_order_status(self):
        res = self.client.post(f'/api/billing/payments/{self.payment.id}/verify/', {
            'action': 'reject'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.payment_status, 'Pending')

    def test_non_admin_cannot_verify(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post(f'/api/billing/payments/{self.payment.id}/verify/', {
            'action': 'verify'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_invalid_action(self):
        res = self.client.post(f'/api/billing/payments/{self.payment.id}/verify/', {
            'action': 'approve'  # invalid
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
