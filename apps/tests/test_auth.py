"""
Unit tests for authentication:
- Login (valid, invalid, case-insensitive username)
- Token refresh
- Protected endpoint without token
- Customer registration
"""
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status


class AuthTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='Sanku', password='testpass123')

    def test_login_success(self):
        res = self.client.post('/api/auth/login/', {
            'username': 'Sanku', 'password': 'testpass123'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('access', res.data)
        self.assertIn('refresh', res.data)

    def test_login_case_insensitive(self):
        # CaseInsensitiveTokenView — lowercase should work
        res = self.client.post('/api/auth/login/', {
            'username': 'sanku', 'password': 'testpass123'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_login_wrong_password(self):
        res = self.client.post('/api/auth/login/', {
            'username': 'Sanku', 'password': 'wrongpass'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_nonexistent_user(self):
        res = self.client.post('/api/auth/login/', {
            'username': 'nobody', 'password': 'pass'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_protected_endpoint_without_token(self):
        res = self.client.get('/api/orders/list/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_refresh(self):
        login = self.client.post('/api/auth/login/', {
            'username': 'Sanku', 'password': 'testpass123'
        }, format='json')
        refresh = login.data['refresh']
        res = self.client.post('/api/auth/refresh/', {'refresh': refresh}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('access', res.data)

    def test_token_refresh_invalid(self):
        res = self.client.post('/api/auth/refresh/', {'refresh': 'badtoken'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class CustomerRegistrationTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_success(self):
        res = self.client.post('/api/customers/register/', {
            'username': 'newshop',
            'password': 'StrongPass123!',
            'shop_name': 'New Shop',
            'owner_name': 'New Owner',
            'phone': '9876543210',
            'address': '123 Main St',
            'village': 'TestVillage',
        }, format='json')
        # 201 or 200 depending on implementation
        self.assertIn(res.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

    def test_register_duplicate_phone(self):
        from apps.customers.models import Customer
        u = User.objects.create_user(username='existing', password='pass')
        Customer.objects.create(
            user=u, shop_name='S', owner_name='O',
            phone='9876543210', address='A', village='V',
        )
        res = self.client.post('/api/customers/register/', {
            'username': 'newuser2',
            'password': 'StrongPass123!',
            'shop_name': 'Shop2',
            'owner_name': 'Owner2',
            'phone': '9876543210',  # duplicate
            'address': 'Addr',
            'village': 'V',
        }, format='json')
        self.assertIn(res.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_409_CONFLICT])
