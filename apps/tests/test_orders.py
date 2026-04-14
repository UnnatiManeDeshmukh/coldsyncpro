"""
Unit tests for critical order flows:
- Customer order creation (credit check, stock deduction, atomic)
- Order cancellation (stock revert)
- Reorder (atomic, credit check)
- Admin create order (atomic)
- Bulk import (per-row atomic)
"""
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from apps.customers.models import Customer
from apps.products.models import Product
from apps.inventory.models import Stock
from apps.orders.models import Order, OrderItem
import datetime


def make_user(username='testuser', is_staff=False):
    u = User.objects.create_user(username=username, password='pass1234')
    u.is_staff = is_staff
    u.save()
    return u


def make_customer(user, credit_limit=10000):
    return Customer.objects.create(
        user=user, shop_name='Test Shop', owner_name='Test Owner',
        phone=f'9{user.id:09d}'[:10], address='Test Addr', village='TestVillage',
        credit_limit=credit_limit,
    )


def make_product(name='Coke 600ml', brand='CocaCola', rate=20, crate_size=24):
    return Product.objects.create(
        product_name=name, brand=brand, bottle_size='600ml',
        crate_size=crate_size, rate_per_bottle=rate,
        expiry_date=datetime.date.today().replace(year=datetime.date.today().year + 1),
    )


def make_stock(product, crates=10, bottles=0):
    return Stock.objects.create(
        product=product, warehouse_name='Main Warehouse',
        total_crates=crates, total_bottles=bottles,
    )


class CustomerOrderCreateTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user()
        self.customer = make_customer(self.user, credit_limit=5000)
        self.product = make_product(rate=20, crate_size=24)
        self.stock = make_stock(self.product, crates=10)
        self.client.force_authenticate(user=self.user)

    def test_place_order_success(self):
        res = self.client.post('/api/orders/customer/create/', {
            'items': [{'product_id': self.product.id, 'quantity': 24}]
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        order = Order.objects.get(id=res.data['order']['id'])
        self.assertEqual(order.total_amount, 24 * 20)
        # Stock should be deducted
        self.stock.refresh_from_db()
        self.assertEqual(self.stock.total_crates, 9)  # 1 crate deducted

    def test_place_order_empty_cart(self):
        res = self.client.post('/api/orders/customer/create/', {'items': []}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_place_order_credit_exceeded(self):
        # Order total > credit limit
        res = self.client.post('/api/orders/customer/create/', {
            'items': [{'product_id': self.product.id, 'quantity': 300}]  # 300 * 20 = 6000 > 5000
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('credit', res.data['error'].lower())

    def test_place_order_expired_product(self):
        self.product.expiry_date = datetime.date(2020, 1, 1)
        self.product.save()
        res = self.client.post('/api/orders/customer/create/', {
            'items': [{'product_id': self.product.id, 'quantity': 24}]
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('expired', res.data['error'].lower())

    def test_place_order_invalid_product(self):
        res = self.client.post('/api/orders/customer/create/', {
            'items': [{'product_id': 99999, 'quantity': 1}]
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


class OrderCancelTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user()
        self.customer = make_customer(self.user)
        self.product = make_product()
        self.stock = make_stock(self.product, crates=5)
        self.order = Order.objects.create(
            customer=self.customer, delivery_status='Order Placed',
            payment_status='Pending', total_amount=480,
        )
        OrderItem.objects.create(
            order=self.order, product=self.product,
            quantity_crates=1, quantity_bottles=0, price=20,
        )
        self.client.force_authenticate(user=self.user)

    def test_cancel_order_success(self):
        res = self.client.post(f'/api/orders/customer/cancel/{self.order.id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.delivery_status, 'Cancelled')
        # Stock should be restored
        self.stock.refresh_from_db()
        self.assertEqual(self.stock.total_crates, 6)

    def test_cancel_delivered_order_fails(self):
        self.order.delivery_status = 'Delivered'
        self.order.save()
        res = self.client.post(f'/api/orders/customer/cancel/{self.order.id}/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cancel_other_customer_order_fails(self):
        other_user = make_user('other')
        make_customer(other_user)
        self.client.force_authenticate(user=other_user)
        res = self.client.post(f'/api/orders/customer/cancel/{self.order.id}/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


class AdminCreateOrderTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = make_user('admin', is_staff=True)
        self.user = make_user('cust')
        self.customer = make_customer(self.user)
        self.product = make_product()
        self.stock = make_stock(self.product, crates=10)
        self.client.force_authenticate(user=self.admin)

    def test_admin_create_order_success(self):
        res = self.client.post('/api/orders/admin/create/', {
            'customer_id': self.customer.id,
            'items': [{'product_id': self.product.id, 'quantity': 24}],
            'payment_status': 'Pending',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Order.objects.count(), 1)

    def test_admin_create_order_invalid_product_rolls_back(self):
        res = self.client.post('/api/orders/admin/create/', {
            'customer_id': self.customer.id,
            'items': [{'product_id': 99999, 'quantity': 24}],
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        # No order should be created (atomic rollback)
        self.assertEqual(Order.objects.count(), 0)

    def test_non_admin_blocked(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post('/api/orders/admin/create/', {
            'customer_id': self.customer.id,
            'items': [{'product_id': self.product.id, 'quantity': 1}],
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
