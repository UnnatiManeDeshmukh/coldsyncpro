from django.db import models
from django.contrib.auth.models import User


class Customer(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='customer_profile', null=True, blank=True)
    shop_name = models.CharField(max_length=200)
    owner_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15, unique=True)
    address = models.TextField()
    village = models.CharField(max_length=100)
    credit_limit = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    language = models.CharField(max_length=10, default='en')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Customer'
        verbose_name_plural = 'Customers'
        indexes = [
            models.Index(fields=['phone'],   name='customer_phone_idx'),
            models.Index(fields=['village'], name='customer_village_idx'),
        ]

    def __str__(self):
        return f"{self.shop_name} - {self.owner_name}"
