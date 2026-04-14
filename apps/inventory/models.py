from django.db import models
from apps.products.models import Product


class Stock(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='stocks')
    warehouse_name = models.CharField(max_length=200)
    total_crates = models.IntegerField(default=0)
    total_bottles = models.IntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-updated_at']
        verbose_name = 'Stock'
        verbose_name_plural = 'Stocks'
        unique_together = ['product', 'warehouse_name']

    def __str__(self):
        return f"{self.product.product_name} - {self.warehouse_name}"

    def update_stock(self, crates=0, bottles=0):
        """Update stock quantities — clamp to 0 to prevent negative values"""
        self.total_crates = max(0, self.total_crates + crates)
        self.total_bottles = max(0, self.total_bottles + bottles)
        self.save()
