"""
Seed command for CustomerShop products with real MRP prices.
Photos from frontend/dist/CustomerShop/ folder → media/products/
Usage: python manage.py seed_customer_shop
       python manage.py seed_customer_shop --clear
"""
from django.core.management.base import BaseCommand
from datetime import date, timedelta

# product_name → exact filename in media/products/
PRODUCT_PHOTOS = {
    'Thums Up 250ml':      'THUMS UP 250ML.jfif',
    'Thums Up 750ml':      'THUMS UP 750ML.jfif',
    'Thums Up 1L':         'THUMS UP 1L.jfif',
    'Thums Up 1.25L':      'THUMS UP 1.25L.jfif',
    'Thums Up 2L':         'THUMS UP 2L.jfif',
    'Thums Up 300ml':      'THUMS UP 300ML.jfif',
    'Thums Up 600ml':      'THUMS UP 600ML.jfif',
    'Sprite 250ml':        'SPRITE 250ML.jfif',
    'Sprite 300ml':        'SPRITE 300ML.jfif',
    'Sprite 600ml':        'SPRITE 600ML.jfif',
    'Sprite 750ml':        'SPRITE 750 ML.jfif',
    'Sprite 1L':           'SPRITE 1L.jfif',
    'Sprite 1.25L':        'SPRITE 1.25L.jfif',
    'Sprite 2.25L':        'SPRITE 2.25L.jfif',
    'Maaza 250ml':         'MAAZA 250ML.jfif',
    'Maaza 300ml':         'MAAZA 300ML.jfif',
    'Maaza 600ml':         'MAAZA 600ML.jfif',
    'Maaza 1L':            'MAAZA 1L.jfif',
    'Maaza 1.25L':         'MAAZA 1.25L.jfif',
    'Maaza 2.25L':         'MAAZA 2.25L.jfif',
    'Mirinda 250ml':       'MIRINDA 250ML.jfif',
    'Mirinda 300ml':       'MIRINDA 300ML.jfif',
    'Mirinda 600ml':       'MIRINDA 600ML.jfif',
    'Mirinda 1L':          'MIRINDA 1L.jfif',
    'Mirinda 1.25L':       'MRINDA 1.25L.jfif',
    'Mirinda 2.25L':       'MIRINDA 2.25L.jfif',
    'Frooti 250ml':        'frooti.jfif',
    'Fanta 250ml':         'fanta.jfif',
    'Bisleri 1L':          'BISLERI 1L.png',
    'Kinley Water 1L':     'KINELY WATER 1L.jpg',
    'Sting Red 250ml':     'RED STING 250ML.jfif',
    'Sting Blue 250ml':    'BLUE STING 250ML.jfif',
    'Sting Yellow 250ml':  'YELLOW STING 250ML.jfif',
    'Red Bull 250ml':      'RED EDITION RED BLUE 250ML.jpg',
    'Red Bull Pink 250ml': 'PINK RED BLUE 250ML.jfif',
    'Red Bull Blue 250ml': 'BLUE  RED BLUE 250ML.jfif',
    'Red Bull Green 250ml':'GREEN RED BLUE 250ML.jpg',
    'Red Bull Yellow 250ml':'YELLOW EDITION RED BLUE 250ML.jpg',
    'Monster 250ml':       'MONSTAR 250ML.webp',
    'Predator 250ml':      'PREDATOR 250ML.jfif',
    'Java Coffee':         'JAVA COFFEE.avif',
}

PRODUCTS = [
    # --- THUMS UP ---
    {'product_name': 'Thums Up 250ml',  'brand': 'ThumbsUp', 'bottle_size': '250ml', 'crate_size': 24, 'rate_per_bottle': 20.00, 'stock_crates': 50},
    {'product_name': 'Thums Up 300ml',  'brand': 'ThumbsUp', 'bottle_size': '300ml', 'crate_size': 24, 'rate_per_bottle': 20.00, 'stock_crates': 40},
    {'product_name': 'Thums Up 600ml',  'brand': 'ThumbsUp', 'bottle_size': '600ml', 'crate_size': 12, 'rate_per_bottle': 35.00, 'stock_crates': 30},
    {'product_name': 'Thums Up 750ml',  'brand': 'ThumbsUp', 'bottle_size': '750ml', 'crate_size': 12, 'rate_per_bottle': 40.00, 'stock_crates': 30},
    {'product_name': 'Thums Up 1L',     'brand': 'ThumbsUp', 'bottle_size': '1L',    'crate_size': 12, 'rate_per_bottle': 50.00, 'stock_crates': 25},
    {'product_name': 'Thums Up 1.25L',  'brand': 'ThumbsUp', 'bottle_size': '1.25L', 'crate_size': 9,  'rate_per_bottle': 60.00, 'stock_crates': 20},
    {'product_name': 'Thums Up 2L',     'brand': 'ThumbsUp', 'bottle_size': '2L',    'crate_size': 6,  'rate_per_bottle': 99.00, 'stock_crates': 20},

    # --- SPRITE ---
    {'product_name': 'Sprite 250ml',    'brand': 'Sprite',   'bottle_size': '250ml', 'crate_size': 24, 'rate_per_bottle': 20.00, 'stock_crates': 50},
    {'product_name': 'Sprite 300ml',    'brand': 'Sprite',   'bottle_size': '300ml', 'crate_size': 24, 'rate_per_bottle': 20.00, 'stock_crates': 40},
    {'product_name': 'Sprite 600ml',    'brand': 'Sprite',   'bottle_size': '600ml', 'crate_size': 12, 'rate_per_bottle': 35.00, 'stock_crates': 30},
    {'product_name': 'Sprite 750ml',    'brand': 'Sprite',   'bottle_size': '750ml', 'crate_size': 12, 'rate_per_bottle': 40.00, 'stock_crates': 30},
    {'product_name': 'Sprite 1L',       'brand': 'Sprite',   'bottle_size': '1L',    'crate_size': 12, 'rate_per_bottle': 50.00, 'stock_crates': 25},
    {'product_name': 'Sprite 1.25L',    'brand': 'Sprite',   'bottle_size': '1.25L', 'crate_size': 9,  'rate_per_bottle': 60.00, 'stock_crates': 25},
    {'product_name': 'Sprite 2.25L',    'brand': 'Sprite',   'bottle_size': '2.25L', 'crate_size': 6,  'rate_per_bottle': 99.00, 'stock_crates': 20},

    # --- MAAZA ---
    {'product_name': 'Maaza 250ml',     'brand': 'Maaza',    'bottle_size': '250ml', 'crate_size': 24, 'rate_per_bottle': 20.00, 'stock_crates': 40},
    {'product_name': 'Maaza 300ml',     'brand': 'Maaza',    'bottle_size': '300ml', 'crate_size': 24, 'rate_per_bottle': 20.00, 'stock_crates': 35},
    {'product_name': 'Maaza 600ml',     'brand': 'Maaza',    'bottle_size': '600ml', 'crate_size': 12, 'rate_per_bottle': 35.00, 'stock_crates': 30},
    {'product_name': 'Maaza 1L',        'brand': 'Maaza',    'bottle_size': '1L',    'crate_size': 9,  'rate_per_bottle': 55.00, 'stock_crates': 20},
    {'product_name': 'Maaza 1.25L',     'brand': 'Maaza',    'bottle_size': '1.25L', 'crate_size': 9,  'rate_per_bottle': 65.00, 'stock_crates': 20},
    {'product_name': 'Maaza 2.25L',     'brand': 'Maaza',    'bottle_size': '2.25L', 'crate_size': 6,  'rate_per_bottle': 99.00, 'stock_crates': 15},

    # --- MIRINDA ---
    {'product_name': 'Mirinda 250ml',   'brand': 'Mirinda',  'bottle_size': '250ml', 'crate_size': 24, 'rate_per_bottle': 20.00, 'stock_crates': 40},
    {'product_name': 'Mirinda 300ml',   'brand': 'Mirinda',  'bottle_size': '300ml', 'crate_size': 24, 'rate_per_bottle': 20.00, 'stock_crates': 35},
    {'product_name': 'Mirinda 600ml',   'brand': 'Mirinda',  'bottle_size': '600ml', 'crate_size': 12, 'rate_per_bottle': 35.00, 'stock_crates': 30},
    {'product_name': 'Mirinda 1L',      'brand': 'Mirinda',  'bottle_size': '1L',    'crate_size': 12, 'rate_per_bottle': 45.00, 'stock_crates': 25},
    {'product_name': 'Mirinda 1.25L',   'brand': 'Mirinda',  'bottle_size': '1.25L', 'crate_size': 9,  'rate_per_bottle': 60.00, 'stock_crates': 20},
    {'product_name': 'Mirinda 2.25L',   'brand': 'Mirinda',  'bottle_size': '2.25L', 'crate_size': 6,  'rate_per_bottle': 99.00, 'stock_crates': 15},

    # --- FROOTI ---
    {'product_name': 'Frooti 250ml',    'brand': 'Frooti',   'bottle_size': '250ml', 'crate_size': 24, 'rate_per_bottle': 15.00, 'stock_crates': 50},

    # --- FANTA ---
    {'product_name': 'Fanta 250ml',     'brand': 'Fanta',    'bottle_size': '250ml', 'crate_size': 24, 'rate_per_bottle': 20.00, 'stock_crates': 30},

    # --- BISLERI ---
    {'product_name': 'Bisleri 1L',      'brand': 'Bisleri',  'bottle_size': '1L',    'crate_size': 12, 'rate_per_bottle': 20.00, 'stock_crates': 40},

    # --- KINLEY ---
    {'product_name': 'Kinley Water 1L', 'brand': 'Kinley',   'bottle_size': '1L',    'crate_size': 12, 'rate_per_bottle': 20.00, 'stock_crates': 40},

    # --- STING ---
    {'product_name': 'Sting Red 250ml',    'brand': 'Sting',       'bottle_size': '250ml', 'crate_size': 24, 'rate_per_bottle': 30.00, 'stock_crates': 40},
    {'product_name': 'Sting Blue 250ml',   'brand': 'StingBlue',   'bottle_size': '250ml', 'crate_size': 24, 'rate_per_bottle': 30.00, 'stock_crates': 30},
    {'product_name': 'Sting Yellow 250ml', 'brand': 'StingYellow', 'bottle_size': '250ml', 'crate_size': 24, 'rate_per_bottle': 30.00, 'stock_crates': 30},

    # --- RED BULL ---
    {'product_name': 'Red Bull 250ml',       'brand': 'RedBull',     'bottle_size': '250ml', 'crate_size': 24, 'rate_per_bottle': 125.00, 'stock_crates': 20},
    {'product_name': 'Red Bull Pink 250ml',  'brand': 'RedBullPink', 'bottle_size': '250ml', 'crate_size': 24, 'rate_per_bottle': 125.00, 'stock_crates': 15},
    {'product_name': 'Red Bull Blue 250ml',  'brand': 'RedBullBlue', 'bottle_size': '250ml', 'crate_size': 24, 'rate_per_bottle': 125.00, 'stock_crates': 15},
    {'product_name': 'Red Bull Green 250ml', 'brand': 'RedBullGreen','bottle_size': '250ml', 'crate_size': 24, 'rate_per_bottle': 125.00, 'stock_crates': 15},
    {'product_name': 'Red Bull Yellow 250ml','brand': 'RedBullGold', 'bottle_size': '250ml', 'crate_size': 24, 'rate_per_bottle': 125.00, 'stock_crates': 15},

    # --- MONSTER ---
    {'product_name': 'Monster 250ml',   'brand': 'Monster',  'bottle_size': '250ml', 'crate_size': 24, 'rate_per_bottle': 99.00, 'stock_crates': 20},

    # --- PREDATOR ---
    {'product_name': 'Predator 250ml',  'brand': 'Predator', 'bottle_size': '250ml', 'crate_size': 24, 'rate_per_bottle': 30.00, 'stock_crates': 30},

    # --- JAVA COFFEE ---
    {'product_name': 'Java Coffee',     'brand': 'Java',     'bottle_size': '250ml', 'crate_size': 24, 'rate_per_bottle': 50.00, 'stock_crates': 20},
]


class Command(BaseCommand):
    help = 'Seed CustomerShop products with real MRP prices and photos from media/products/'

    def add_arguments(self, parser):
        parser.add_argument('--clear', action='store_true', help='Clear existing CustomerShop products before seeding')

    def handle(self, *args, **options):
        import os
        from django.core.files import File
        from django.conf import settings
        from apps.products.models import Product
        from apps.inventory.models import Stock

        expiry = date.today() + timedelta(days=365)
        media_products = os.path.join(settings.MEDIA_ROOT, 'products')

        if options['clear']:
            brands = set(p['brand'] for p in PRODUCTS)
            deleted = Product.objects.filter(brand__in=brands).delete()
            self.stdout.write(self.style.WARNING(f'Cleared: {deleted}'))

        created = skipped = photos_set = 0

        for data in PRODUCTS:
            stock_crates = data.pop('stock_crates')
            data['expiry_date'] = expiry

            product, is_new = Product.objects.get_or_create(
                brand=data['brand'],
                bottle_size=data['bottle_size'],
                defaults=data,
            )

            # Attach photo if available and not already set
            photo_filename = PRODUCT_PHOTOS.get(product.product_name)
            if photo_filename and (not product.image or is_new):
                photo_path = os.path.join(media_products, photo_filename)
                if os.path.exists(photo_path):
                    with open(photo_path, 'rb') as f:
                        product.image.save(f'products/{photo_filename}', File(f), save=True)
                    photos_set += 1

            if is_new:
                Stock.objects.get_or_create(
                    product=product,
                    warehouse_name='Main Warehouse',
                    defaults={'total_crates': stock_crates, 'total_bottles': 0},
                )
                created += 1
                self.stdout.write(self.style.SUCCESS(f'  ✓ {product.product_name} @ ₹{product.rate_per_bottle}'))
            else:
                skipped += 1
                self.stdout.write(self.style.WARNING(f'  ~ Skipped: {product.product_name}'))

            data['stock_crates'] = stock_crates

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'Done. Created: {created}, Skipped: {skipped}, Photos set: {photos_set}'
        ))
