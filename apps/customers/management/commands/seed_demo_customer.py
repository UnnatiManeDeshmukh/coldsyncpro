"""
Management command to create a demo customer user for testing.
Usage: python manage.py seed_demo_customer
Creates: username=customer1, password=customer123
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Create a demo customer user for testing the customer dashboard'

    def handle(self, *args, **options):
        from django.contrib.auth.models import User
        from apps.customers.models import Customer

        username = 'customer1'
        password = 'customer123'
        email = 'customer1@coldsync.com'

        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.WARNING(f'User "{username}" already exists. Skipping.'))
            return

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name='Demo',
            last_name='Customer',
        )

        Customer.objects.create(
            user=user,
            shop_name='Demo Cold Drinks Shop',
            owner_name='Demo Customer',
            phone='9999999999',
            address='Modnimb, Solapur District, Maharashtra - 413226',
            village='Demo Village',
            credit_limit=50000.00,
        )

        self.stdout.write(self.style.SUCCESS(
            f'\n  ✓ Demo customer created!'
            f'\n    Username : {username}'
            f'\n    Password : {password}'
            f'\n    Email    : {email}'
            f'\n    Credit   : ₹50,000'
        ))
