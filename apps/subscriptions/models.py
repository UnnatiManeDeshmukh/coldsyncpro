from django.db import models
from apps.customers.models import Customer
from apps.products.models import Product


class RecurringOrder(models.Model):
    FREQUENCY_CHOICES = [
        ('weekly', 'Weekly'),
        ('biweekly', 'Every 2 Weeks'),
        ('monthly', 'Monthly'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('cancelled', 'Cancelled'),
    ]

    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='recurring_orders')
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default='monthly')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    next_order_date = models.DateField()
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Recurring #{self.id} — {self.customer.shop_name} ({self.frequency})"


class RecurringOrderItem(models.Model):
    recurring_order = models.ForeignKey(RecurringOrder, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity_crates = models.IntegerField(default=0)
    quantity_bottles = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.product.product_name} — Recurring #{self.recurring_order.id}"
