"""
Management command to seed the 5 core cold drink products + inventory stock.
Usage: python manage.py seed_products
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta


PRODUCTS = [
    {
        'product_name': 'Coca-Cola',
        'brand': 'CocaCola',
        'bottle_size': '300ml',
        'crate_size': 24,
        'rate_per_bottle': 20.00,
        'expiry_date': date.today() + timedelta(days=365),
        'stock_crates': 50,
    },
    {
        'product_name': 'Sprite',
        'brand': 'Sprite',
        'bottle_size': '300ml',
        'crate_size': 24,
        'rate_per_bottle': 18.00,
        'expiry_date': date.today() + timedelta(days=365),
        'stock_crates': 40,
    },
    {
        'product_name': 'Fanta',
        'brand': 'Fanta',
        'bottle_size': '300ml',
        'crate_size': 24,
        'rate_per_bottle': 18.00,
        'expiry_date': date.today() + timedelta(days=365),
        'stock_crates': 35,
    },
    {
        'product_name': 'Thums Up',
        'brand': 'ThumbsUp',
        'bottle_size': '300ml',
        'crate_size': 24,
        'rate_per_bottle': 22.00,
        'expiry_date': date.today() + timedelta(days=365),
        'stock_crates': 45,
    },
    {
        'product_name': 'Limca',
        'brand': 'Limca',
        'bottle_size': '300ml',
        'crate_size': 24,
        'rate_per_bottle': 18.00,
        'expiry_date': date.today() + timedelta(days=365),
        'stock_crates': 30,
    },
]


class Command(BaseCommand):
    help = 'Seed the database with 5 core cold drink products and initial stock'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing products before seeding',
        )

    def handle(self, *args, **options):
        from apps.products.models import Product
        from apps.inventory.models import Stock

        if options['clear']:
            Product.objects.all().delete()
            self.stdout.write(self.style.WARNING('Cleared all existing products.'))

        created_count = 0
        skipped_count = 0

        for data in PRODUCTS:
            stock_crates = data.pop('stock_crates')

            product, created = Product.objects.get_or_create(
                brand=data['brand'],
                bottle_size=data['bottle_size'],
                defaults=data,
            )

            if created:
                # Create initial stock entry
                Stock.objects.get_or_create(
                    product=product,
                    warehouse_name='Main Warehouse',
                    defaults={
                        'total_crates': stock_crates,
                        'total_bottles': 0,
                    }
                )
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'  ✓ Created: {product.brand} - {product.product_name} ({product.bottle_size})')
                )
            else:
                skipped_count += 1
                self.stdout.write(
                    self.style.WARNING(f'  ~ Skipped (already exists): {product.brand} - {product.product_name}')
                )

            # Restore the key for next iteration safety
            data['stock_crates'] = stock_crates

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'Done. Created: {created_count}, Skipped: {skipped_count}'
        ))
