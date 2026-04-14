from django.db import models
from apps.orders.models import Order, OrderItem
from apps.customers.models import Customer


class ReturnRequest(models.Model):
    REASON_CHOICES = [
        ('Damaged', 'Damaged / Broken'),
        ('Wrong Item', 'Wrong Item Delivered'),
        ('Excess Delivery', 'Excess Delivery'),
        ('Quality Issue', 'Quality Issue'),
        ('Other', 'Other'),
    ]
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
        ('Completed', 'Completed'),
    ]
    TYPE_CHOICES = [
        ('Return', 'Product Return'),
        ('Refund', 'Cash Refund'),
        ('Credit', 'Credit Adjustment'),
    ]

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='returns')
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='returns')
    order_item = models.ForeignKey(OrderItem, on_delete=models.SET_NULL, null=True, blank=True)
    reason = models.CharField(max_length=50, choices=REASON_CHOICES)
    return_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='Return')
    quantity_crates = models.IntegerField(default=0)
    quantity_bottles = models.IntegerField(default=0)
    refund_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    notes = models.TextField(blank=True, null=True)
    admin_notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Return #{self.id} — Order #{self.order_id} — {self.status}"
