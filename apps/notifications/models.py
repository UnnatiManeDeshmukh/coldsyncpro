from django.db import models
from django.contrib.auth.models import User


class Notification(models.Model):
    TYPE_CHOICES = [
        ('order_placed',              'Order Placed'),
        ('order_confirmed',           'Order Confirmed'),
        ('order_processing',          'Order Processing'),
        ('order_out_for_delivery',    'Out for Delivery'),
        ('order_shipped',             'Order Shipped'),
        ('order_delivered',           'Order Delivered'),
        ('order_cancelled',           'Order Cancelled'),
        ('payment_reminder',          'Payment Reminder'),
        ('payment_received',          'Payment Received'),
        ('low_stock',                 'Low Stock Alert'),
        ('new_order_admin',           'New Order (Admin)'),
        ('general',                   'General'),
    ]

    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    type       = models.CharField(max_length=30, choices=TYPE_CHOICES, default='general')
    title      = models.CharField(max_length=200)
    message    = models.TextField()
    is_read    = models.BooleanField(default=False)
    order_id   = models.IntegerField(null=True, blank=True)   # optional link
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'

    def __str__(self):
        return f"[{self.type}] {self.title} → {self.user.username}"


class Offer(models.Model):
    ACCENT_CHOICES = [
        ('red', 'Red'), ('blue', 'Blue'), ('gold', 'Gold'),
        ('orange', 'Orange'), ('purple', 'Purple'), ('green', 'Green'),
    ]
    title       = models.CharField(max_length=200)
    description = models.TextField()
    tag         = models.CharField(max_length=100)
    emoji       = models.CharField(max_length=10, default='🎁')
    accent      = models.CharField(max_length=20, choices=ACCENT_CHOICES, default='gold')
    expires_at  = models.DateField()
    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Special Offer'
        verbose_name_plural = 'Special Offers'

    def __str__(self):
        return self.title
