from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone


def validate_future_date(value):
    if value < timezone.now().date():
        raise ValidationError(f'Expiry date {value} cannot be in the past.')


class Product(models.Model):
    BOTTLE_SIZE_CHOICES = [
        ('125ml', '125ml'),
        ('150ml', '150ml'),
        ('200ml', '200ml'),
        ('250ml', '250ml'),
        ('300ml', '300ml'),
        ('500ml', '500ml'),
        ('600ml', '600ml'),
        ('750ml', '750ml'),
        ('1L', '1 Liter'),
        ('1.25L', '1.25 Liter'),
        ('1.5L', '1.5 Liter'),
        ('1.75L', '1.75 Liter'),
        ('2L', '2 Liter'),
        ('2.25L', '2.25 Liter'),
        ('2.5L', '2.5 Liter'),
    ]
    
    product_name = models.CharField(max_length=200)
    brand = models.CharField(max_length=100)
    bottle_size = models.CharField(max_length=20, choices=BOTTLE_SIZE_CHOICES)
    crate_size = models.IntegerField(help_text="Number of bottles per crate")
    rate_per_bottle = models.DecimalField(max_digits=10, decimal_places=2)
    expiry_date = models.DateField(validators=[validate_future_date])
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Product'
        verbose_name_plural = 'Products'

    def __str__(self):
        return f"{self.brand} - {self.product_name} ({self.bottle_size})"
