"""
Rebuild CustomerShop products — one product per CustomerShop image file.
Removes duplicates/garbage, creates clean products with photos attached.
Usage: python manage.py rebuild_shop
"""
import os
from django.core.management.base import BaseCommand
from django.core.files import File
from django.conf import settings
from datetime import date, timedelta

# Exact mapping: CustomerShop filename → product data
# Key = exact filename in frontend/dist/CustomerShop/
SHOP_PRODUCTS = [
    # filename,                          product_name,              brand,          bottle_size, crate_size, rate
    ('THUMS UP 250ML.jfif',             'Thums Up 250ml',          'ThumbsUp',     '250ml', 24, 20.00),
    ('THUMS UP 300ML.jfif',             'Thums Up 300ml',          'ThumbsUp',     '300ml', 24, 20.00),
    ('THUMS UP 600ML.jfif',             'Thums Up 600ml',          'ThumbsUp',     '600ml', 12, 35.00),
    ('THUMS UP 750ML.jfif',             'Thums Up 750ml',          'ThumbsUp',     '750ml', 12, 40.00),
    ('THUMS UP 1L.jfif',                'Thums Up 1L',             'ThumbsUp',     '1L',    12, 50.00),
    ('THUMS UP 1.25L.jfif',             'Thums Up 1.25L',          'ThumbsUp',     '1.25L',  9, 60.00),
    ('THUMS UP 2L.jfif',                'Thums Up 2L',             'ThumbsUp',     '2L',     6, 99.00),
    ('SPRITE 250ML.jfif',               'Sprite 250ml',            'Sprite',       '250ml', 24, 20.00),
    ('SPRITE 300ML.jfif',               'Sprite 300ml',            'Sprite',       '300ml', 24, 20.00),
    ('SPRITE 600ML.jfif',               'Sprite 600ml',            'Sprite',       '600ml', 12, 35.00),
    ('SPRITE 750 ML.jfif',              'Sprite 750ml',            'Sprite',       '750ml', 12, 40.00),
    ('SPRITE 1L.jfif',                  'Sprite 1L',               'Sprite',       '1L',    12, 50.00),
    ('SPRITE 1.25L.jfif',               'Sprite 1.25L',            'Sprite',       '1.25L',  9, 60.00),
    ('SPRITE 2.25L.jfif',               'Sprite 2.25L',            'Sprite',       '2.25L',  6, 99.00),
    ('MAAZA 250ML.jfif',                'Maaza 250ml',             'Maaza',        '250ml', 24, 20.00),
    ('MAAZA 300ML.jfif',                'Maaza 300ml',             'Maaza',        '300ml', 24, 20.00),
    ('MAAZA 600ML.jfif',                'Maaza 600ml',             'Maaza',        '600ml', 12, 35.00),
    ('MAAZA 1L.jfif',                   'Maaza 1L',                'Maaza',        '1L',     9, 55.00),
    ('MAAZA 1.25L.jfif',                'Maaza 1.25L',             'Maaza',        '1.25L',  9, 65.00),
    ('MAAZA 2.25L.jfif',                'Maaza 2.25L',             'Maaza',        '2.25L',  6, 99.00),
    ('MIRINDA 250ML.jfif',              'Mirinda 250ml',           'Mirinda',      '250ml', 24, 20.00),
    ('MIRINDA 300ML.jfif',              'Mirinda 300ml',           'Mirinda',      '300ml', 24, 20.00),
    ('MIRINDA 600ML.jfif',              'Mirinda 600ml',           'Mirinda',      '600ml', 12, 35.00),
    ('MIRINDA 1L.jfif',                 'Mirinda 1L',              'Mirinda',      '1L',    12, 45.00),
    ('MRINDA 1.25L.jfif',               'Mirinda 1.25L',           'Mirinda',      '1.25L',  9, 60.00),
    ('MIRINDA 2.25L.jfif',              'Mirinda 2.25L',           'Mirinda',      '2.25L',  6, 99.00),
    ('frooti.jfif',                     'Frooti 250ml',            'Frooti',       '250ml', 24, 15.00),
    ('fanta.jfif',                      'Fanta 250ml',             'Fanta',        '250ml', 24, 20.00),
    ('BISLERI 1L.png',                  'Bisleri 1L',              'Bisleri',      '1L',    12, 20.00),
    ('KINELY WATER 1L.jpg',             'Kinley Water 1L',         'Kinley',       '1L',    12, 20.00),
    ('RED STING 250ML.jfif',            'Sting Red 250ml',         'Sting',        '250ml', 24, 30.00),
    ('BLUE STING 250ML.jfif',           'Sting Blue 250ml',        'StingBlue',    '250ml', 24, 30.00),
    ('YELLOW STING 250ML.jfif',         'Sting Yellow 250ml',      'StingYellow',  '250ml', 24, 30.00),
    ('RED EDITION RED BLUE 250ML.jpg',  'Red Bull Red 250ml',      'RedBull',      '250ml', 24, 125.00),
    ('PINK RED BLUE 250ML.jfif',        'Red Bull Pink 250ml',     'RedBullPink',  '250ml', 24, 125.00),
    ('BLUE  RED BLUE 250ML.jfif',       'Red Bull Blue 250ml',     'RedBullBlue',  '250ml', 24, 125.00),
    ('GREEN RED BLUE 250ML.jpg',        'Red Bull Green 250ml',    'RedBullGreen', '250ml', 24, 125.00),
    ('YELLOW EDITION RED BLUE 250ML.jpg','Red Bull Yellow 250ml',  'RedBullYellow','250ml', 24, 125.00),
    ('MONSTAR 250ML.webp',              'Monster 250ml',           'Monster',      '250ml', 24, 99.00),
    ('PREDATOR 250ML.jfif',             'Predator 250ml',          'Predator',     '250ml', 24, 30.00),
    ('JAVA COFFEE.avif',                'Java Coffee 250ml',       'Java',         '250ml', 24, 50.00),
]

# Brands that belong to CustomerShop — all others are garbage/old
SHOP_BRANDS = {
    'ThumbsUp', 'Sprite', 'Maaza', 'Mirinda', 'Frooti', 'Fanta',
    'Bisleri', 'Kinley', 'Sting', 'StingBlue', 'StingYellow',
    'RedBull', 'RedBullPink', 'RedBullBlue', 'RedBullGreen', 'RedBullYellow',
    'Monster', 'Predator', 'Java',
}


class Command(BaseCommand):
    help = 'Rebuild CustomerShop — clean products with photos from CustomerShop folder'

    def handle(self, *args, **options):
        from apps.products.models import Product
        from apps.inventory.models import Stock

        src_dir = os.path.join(settings.BASE_DIR, 'frontend', 'dist', 'CustomerShop')
        expiry = date.today() + timedelta(days=365)

        # Step 1: Delete all old/garbage products (brands not in SHOP_BRANDS)
        old = Product.objects.exclude(brand__in=SHOP_BRANDS)
        old_count = old.count()
        old.delete()
        self.stdout.write(self.style.WARNING(f'Removed {old_count} old/garbage products'))

        # Step 2: Delete duplicate shop products (keep only canonical ones)
        # We'll delete all existing shop products and recreate cleanly
        existing = Product.objects.filter(brand__in=SHOP_BRANDS)
        existing_count = existing.count()
        existing.delete()
        self.stdout.write(self.style.WARNING(f'Removed {existing_count} existing shop products (will recreate)'))

        created = 0
        no_file = 0

        for (filename, product_name, brand, bottle_size, crate_size, rate) in SHOP_PRODUCTS:
            photo_path = os.path.join(src_dir, filename)

            product = Product(
                product_name=product_name,
                brand=brand,
                bottle_size=bottle_size,
                crate_size=crate_size,
                rate_per_bottle=rate,
                expiry_date=expiry,
            )

            if os.path.exists(photo_path):
                with open(photo_path, 'rb') as f:
                    product.image.save(f'products/{filename}', File(f), save=False)
                product.save()
                self.stdout.write(self.style.SUCCESS(f'  ✓ {product_name} [{filename}]'))
            else:
                product.save()
                self.stdout.write(self.style.WARNING(f'  ~ {product_name} [no file: {filename}]'))
                no_file += 1

            # Add stock
            Stock.objects.get_or_create(
                product=product,
                warehouse_name='Main Warehouse',
                defaults={'total_crates': 50, 'total_bottles': 0},
            )
            created += 1

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'Done. Created: {created} products, Missing photos: {no_file}'
        ))
        self.stdout.write(self.style.SUCCESS(
            f'Total products in DB: {Product.objects.count()}'
        ))
