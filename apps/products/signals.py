"""
Product image auto-resize/compress on save.
Pillow वापरून upload झालेली image 800x800 मध्ये resize होते, JPEG quality 85%.
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Product
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Product)
@receiver(post_delete, sender=Product)
def invalidate_product_cache(sender, instance, **kwargs):
    """Clear catalog and brands cache when any product changes."""
    from django.core.cache import cache
    from django.utils import timezone
    today = timezone.now().date()
    cache.delete(f'brands_list_{today}')
    # Clear all catalog cache keys (brand-filtered variants)
    cache.delete_many([f'catalog_products_{today}_'])
    # Use pattern delete if available (Redis), else delete common keys
    for brand in ['', 'Coca-Cola', 'Sprite', 'Fanta', 'Limca', 'Kinley', 'Thums Up', 'Maaza']:
        cache.delete(f'catalog_products_{today}_{brand}')


@receiver(post_save, sender=Product)
def optimize_product_image(sender, instance, **kwargs):
    if not instance.image:
        return
    try:
        from PIL import Image
        import os

        img_path = instance.image.path
        if not os.path.exists(img_path):
            return

        with Image.open(img_path) as img:
            # Already small enough — skip
            if img.width <= 800 and img.height <= 800:
                return

            img.thumbnail((800, 800), Image.LANCZOS)

            # Convert RGBA/P to RGB for JPEG
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')

            img.save(img_path, format='JPEG', quality=85, optimize=True)
            logger.info(f'Optimized product image: {img_path}')

    except Exception as e:
        logger.warning(f'Image optimization failed for product {instance.id}: {e}')
