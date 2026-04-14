"""
One-time command to attach CustomerShop photos to existing products.
Usage: python manage.py attach_photos
"""
import os
from django.core.management.base import BaseCommand
from django.core.files import File
from django.conf import settings

PRODUCT_PHOTOS = {
    'Thums Up 250ml':       'THUMS UP 250ML.jfif',
    'Thums Up 300ml':       'THUMS UP 300ML.jfif',
    'Thums Up 600ml':       'THUMS UP 600ML.jfif',
    'Thums Up 750ml':       'THUMS UP 750ML.jfif',
    'Thums Up 1L':          'THUMS UP 1L.jfif',
    'Thums Up 1.25L':       'THUMS UP 1.25L.jfif',
    'Thums Up 2L':          'THUMS UP 2L.jfif',
    'Sprite 250ml':         'SPRITE 250ML.jfif',
    'Sprite 300ml':         'SPRITE 300ML.jfif',
    'Sprite 600ml':         'SPRITE 600ML.jfif',
    'Sprite 750ml':         'SPRITE 750 ML.jfif',
    'Sprite 1L':            'SPRITE 1L.jfif',
    'Sprite 1.25L':         'SPRITE 1.25L.jfif',
    'Sprite 2.25L':         'SPRITE 2.25L.jfif',
    'Maaza 250ml':          'MAAZA 250ML.jfif',
    'Maaza 300ml':          'MAAZA 300ML.jfif',
    'Maaza 600ml':          'MAAZA 600ML.jfif',
    'Maaza 1L':             'MAAZA 1L.jfif',
    'Maaza 1.25L':          'MAAZA 1.25L.jfif',
    'Maaza 2.25L':          'MAAZA 2.25L.jfif',
    'Mirinda 250ml':        'MIRINDA 250ML.jfif',
    'Mirinda 300ml':        'MIRINDA 300ML.jfif',
    'Mirinda 600ml':        'MIRINDA 600ML.jfif',
    'Mirinda 1L':           'MIRINDA 1L.jfif',
    'Mirinda 1.25L':        'MRINDA 1.25L.jfif',
    'Mirinda 2.25L':        'MIRINDA 2.25L.jfif',
    'Frooti 250ml':         'frooti.jfif',
    'Fanta 250ml':          'fanta.jfif',
    'Bisleri 1L':           'BISLERI 1L.png',
    'Kinley Water 1L':      'KINELY WATER 1L.jpg',
    'Sting Red 250ml':      'RED STING 250ML.jfif',
    'Sting Blue 250ml':     'BLUE STING 250ML.jfif',
    'Sting Yellow 250ml':   'YELLOW STING 250ML.jfif',
    'Red Bull 250ml':       'RED EDITION RED BLUE 250ML.jpg',
    'Red Bull Pink 250ml':  'PINK RED BLUE 250ML.jfif',
    'Red Bull Blue 250ml':  'BLUE  RED BLUE 250ML.jfif',
    'Red Bull Green 250ml': 'GREEN RED BLUE 250ML.jpg',
    'Red Bull Yellow 250ml':'YELLOW EDITION RED BLUE 250ML.jpg',
    'Monster 250ml':        'MONSTAR 250ML.webp',
    'Predator 250ml':       'PREDATOR 250ML.jfif',
}


class Command(BaseCommand):
    help = 'Attach CustomerShop photos to existing products in DB'

    def add_arguments(self, parser):
        parser.add_argument('--overwrite', action='store_true', help='Overwrite existing photos too')

    def handle(self, *args, **options):
        from apps.products.models import Product
        media_products = os.path.join(settings.MEDIA_ROOT, 'products')
        updated = skipped = missing = 0

        for name, filename in PRODUCT_PHOTOS.items():
            products = Product.objects.filter(product_name=name)
            if not products.exists():
                self.stdout.write(self.style.WARNING(f'  ? Not in DB: {name}'))
                continue

            for p in products:
                if p.image and not options['overwrite']:
                    skipped += 1
                    continue
                photo_path = os.path.join(media_products, filename)
                if not os.path.exists(photo_path):
                    self.stdout.write(self.style.WARNING(f'  ! File missing: {filename}'))
                    missing += 1
                    continue
                with open(photo_path, 'rb') as f:
                    p.image.save(f'products/{filename}', File(f), save=True)
                updated += 1
                self.stdout.write(self.style.SUCCESS(f'  ✓ {p.product_name} ({p.bottle_size})'))

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'Done. Updated: {updated}, Already had photo: {skipped}, File missing: {missing}'
        ))
