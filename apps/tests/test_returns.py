"""
Unit tests for returns:
- Create return request
- Approve return (stock restored)
- Reject return
- Customer can only return delivered orders
"""
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from apps.customers.models import Customer
from apps.products.models import Product
from apps.orders.models import Order, OrderItem
from apps.inventory.models import Stock
from apps.returns.models import ReturnRequest
import datetime


def make_setup():
    admin = User.objects.create_user(username='admin_r', password='pass', is_staff=True)
    user = User.objects.create_user(username='cust_r', password='pass')
    customer = Customer.objects.create(
        user=user, shop_name='Return Shop', owner_name='Return Owner',
        phone='9111111111', address='Addr', village='V', credit_limit=50000,
    )
    product = Product.objects.create(
        product_name='Return Coke', brand='CocaCola', bottle_size='600ml',
        crate_size=24, rate_per_bottle=20,
        expiry_date=datetime.date.today().replace(year=datetime.date.today().year + 1),
    )
    stock = Stock.objects.create(
        product=product, warehouse_name='Main Warehouse',
        total_crates=5, total_bottles=0,
    )
    order = Order.objects.create(
        customer=customer, delivery_status='Delivered',
        payment_status='Paid', total_amount=480,
    )
    item = OrderItem.objects.create(
        order=order, product=product,
        quantity_crates=1, quantity_bottles=0, price=20,
    )
    return admin, user, customer, product, stock, order, item


class ReturnRequestTest(TestCase):
    def setUp(self):
        self.admin, self.user, self.customer, self.product, self.stock, self.order, self.item = make_setup()
        self.client = APIClient()

    def test_customer_create_return(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post('/api/returns/', {
            'order': self.order.id,
            'order_item': self.item.id,
            'reason': 'Damaged',
            'return_type': 'Refund',
            'quantity_crates': 1,
            'quantity_bottles': 0,
            'refund_amount': 480,
        }, format='json')
        self.assertIn(res.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

    def test_admin_approve_return_restores_stock(self):
        self.client.force_authenticate(user=self.admin)
        ret = ReturnRequest.objects.create(
            customer=self.customer, order=self.order, order_item=self.item,
            reason='Damaged', return_type='Stock',
            quantity_crates=1, quantity_bottles=0,
            refund_amount=480, status='Pending',
        )
        initial_crates = self.stock.total_crates
        res = self.client.post(f'/api/returns/{ret.id}/approve/', {}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.stock.refresh_from_db()
        self.assertEqual(self.stock.total_crates, initial_crates + 1)

    def test_admin_reject_return(self):
        self.client.force_authenticate(user=self.admin)
        ret = ReturnRequest.objects.create(
            customer=self.customer, order=self.order, order_item=self.item,
            reason='Wrong item', return_type='Refund',
            quantity_crates=0, quantity_bottles=0,
            refund_amount=0, status='Pending',
        )
        res = self.client.post(f'/api/returns/{ret.id}/reject/', {'admin_notes': 'Not valid'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ret.refresh_from_db()
        self.assertEqual(ret.status, 'Rejected')

    def test_customer_cannot_see_other_returns(self):
        other_user = User.objects.create_user(username='other_r', password='pass')
        Customer.objects.create(
            user=other_user, shop_name='Other', owner_name='Other',
            phone='9222222222', address='A', village='V',
        )
        self.client.force_authenticate(user=other_user)
        ReturnRequest.objects.create(
            customer=self.customer, order=self.order,
            reason='Test', return_type='Refund',
            quantity_crates=0, quantity_bottles=0,
            refund_amount=0, status='Pending',
        )
        res = self.client.get('/api/returns/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get('results', res.data)
        self.assertEqual(len(results), 0)
