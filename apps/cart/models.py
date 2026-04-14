from django.db import models
from django.contrib.auth.models import User
from apps.products.models import Product


class CartItem(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cart_items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'product')
        ordering = ['-added_at']

    def __str__(self):
        return f"{self.user.username} — {self.product.product_name} x{self.quantity}"

    @property
    def subtotal(self):
        return self.quantity * float(self.product.rate_per_bottle)
