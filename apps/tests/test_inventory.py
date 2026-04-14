"""
Unit tests for inventory:
- Stock creation and update
- Low stock alerts
- Stock deduction on order
"""
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from apps.customers.models import Customer
from apps.products.models import Product
from apps.inventory.models import Stock
import datetime


def make_product():
    return Product.objects.create(
        product_name='Test Coke', brand='CocaCola', bottle_size='600ml',
        crate_size=24, rate_per_bottle=20,
        expiry_date=datetime.date.today().replace(year=datetime.date.today().year + 1),
    )


def make_stock(product, crates=10, bottles=0):
    return Stock.objects.create(
        product=product, warehouse_name='Main Warehouse',
        total_crates=crates, total_bottles=bottles,
    )


class StockUpdateTest(TestCase):
    def setUp(self):
        self.product = make_product()
        self.stock = make_stock(self.product, crates=10, bottles=5)

    def test_update_stock_deduct_crates(self):
        self.stock.update_stock(crates=-2, bottles=0)
        self.stock.refresh_from_db()
        self.assertEqual(self.stock.total_crates, 8)

    def test_update_stock_add_crates(self):
        self.stock.update_stock(crates=5, bottles=0)
        self.stock.refresh_from_db()
        self.assertEqual(self.stock.total_crates, 15)

    def test_update_stock_bottles_overflow_to_crates(self):
        # 5 bottles + 20 more = 25 bottles = 1 crate + 1 bottle (crate_size=24)
        self.stock.update_stock(crates=0, bottles=20)
        self.stock.refresh_from_db()
        self.assertEqual(self.stock.total_crates, 11)
        self.assertEqual(self.stock.total_bottles, 1)


class InventoryAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(username='admin', password='pass', is_staff=True)
        self.product = make_product()
        self.stock = make_stock(self.product, crates=3)
        self.client.force_authenticate(user=self.admin)

    def test_list_inventory(self):
        res = self.client.get('/api/inventory/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_low_stock_alerts(self):
        # crates=3 <= 5 threshold → should appear in alerts
        res = self.client.get('/api/inventory/alerts/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        alerts = res.data.get('alerts', [])
        self.assertTrue(len(alerts) > 0)

    def test_stock_not_low_when_above_threshold(self):
        self.stock.total_crates = 10
        self.stock.save()
        res = self.client.get('/api/inventory/alerts/')
        alerts = res.data.get('alerts', [])
        # Should not include this stock
        product_names = [a.get('product_name', '') for a in alerts]
        self.assertNotIn('Test Coke', product_names)
