"""
Unit tests for notifications:
- List notifications
- Mark as read
- Mark all read
- Admin send notification
- Offers list
"""
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from apps.notifications.models import Notification, Offer
import datetime


class NotificationTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='notif_user', password='pass')
        self.admin = User.objects.create_user(username='notif_admin', password='pass', is_staff=True)
        self.notif = Notification.objects.create(
            user=self.user, type='general',
            title='Test Notification', message='Test message',
        )

    def test_list_notifications_authenticated(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.get('/api/notifications/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('notifications', res.data)

    def test_list_notifications_unauthenticated(self):
        res = self.client.get('/api/notifications/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_mark_notification_read(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post(f'/api/notifications/{self.notif.id}/read/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.notif.refresh_from_db()
        self.assertTrue(self.notif.is_read)

    def test_mark_all_read(self):
        Notification.objects.create(user=self.user, type='general', title='T2', message='M2')
        self.client.force_authenticate(user=self.user)
        res = self.client.post('/api/notifications/read-all/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        unread = Notification.objects.filter(user=self.user, is_read=False).count()
        self.assertEqual(unread, 0)

    def test_admin_send_notification_to_all(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/notifications/admin/send/', {
            'target': 'all',
            'title': 'Broadcast Test',
            'message': 'Hello everyone',
            'type': 'general',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data.get('success'))

    def test_non_admin_cannot_send_notification(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post('/api/notifications/admin/send/', {
            'target': 'all', 'title': 'T', 'message': 'M', 'type': 'general',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_mark_other_users_notification(self):
        other = User.objects.create_user(username='other_notif', password='pass')
        self.client.force_authenticate(user=other)
        res = self.client.post(f'/api/notifications/{self.notif.id}/read/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


class OffersTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(username='offer_admin', password='pass', is_staff=True)
        Offer.objects.create(
            title='Summer Sale', description='10% off',
            tag='SUMMER', emoji='☀️', accent='gold',
            expires_at=datetime.date.today().replace(year=datetime.date.today().year + 1),
            is_active=True,
        )
        Offer.objects.create(
            title='Expired Offer', description='Old',
            tag='OLD', emoji='❌', accent='red',
            expires_at=datetime.date(2020, 1, 1),
            is_active=True,
        )

    def test_public_offers_excludes_expired(self):
        res = self.client.get('/api/notifications/offers/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        titles = [o['title'] for o in res.data]
        self.assertIn('Summer Sale', titles)
        self.assertNotIn('Expired Offer', titles)

    def test_admin_create_offer(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/notifications/admin/offers/', {
            'title': 'New Offer',
            'description': 'Buy 2 get 1',
            'tag': 'DEAL',
            'emoji': '🎁',
            'accent': 'blue',
            'expires_at': str(datetime.date.today().replace(year=datetime.date.today().year + 1)),
            'is_active': True,
        }, format='json')
        self.assertIn(res.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
