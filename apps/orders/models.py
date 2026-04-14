from django.db import models
from django.db.models import Sum, F
from apps.customers.models import Customer
from apps.products.models import Product


class DeliveryDriver(models.Model):
    """Reusable driver/delivery person managed by admin."""
    name         = models.CharField(max_length=100)
    phone        = models.CharField(max_length=20)
    email        = models.EmailField(blank=True, null=True)
    vehicle_number = models.CharField(max_length=50, blank=True, null=True, help_text='e.g. MH 12 AB 1234')
    vehicle_type = models.CharField(max_length=50, blank=True, null=True, help_text='e.g. Tempo, Bike, Auto')
    is_active    = models.BooleanField(default=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Delivery Driver'
        verbose_name_plural = 'Delivery Drivers'

    def __str__(self):
        return f"{self.name} — {self.phone}"


class Order(models.Model):
    PAYMENT_STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Partial', 'Partial'),
        ('Paid', 'Paid'),
    ]
    
    DELIVERY_STATUS_CHOICES = [
        ('Order Placed', 'Order Placed'),
        ('Order Confirmed', 'Order Confirmed'),
        ('Processing', 'Processing'),
        ('Out for Delivery', 'Out for Delivery'),
        ('Delivered', 'Delivered'),
        ('Cancelled', 'Cancelled'),
    ]
    
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='orders')
    order_date = models.DateTimeField(auto_now_add=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='Pending')
    delivery_status = models.CharField(max_length=20, choices=DELIVERY_STATUS_CHOICES, default='Order Placed')
    
    # Delivery tracking fields
    assigned_driver  = models.ForeignKey(
        DeliveryDriver, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='orders',
        help_text='Select from saved drivers'
    )
    delivery_vehicle = models.CharField(max_length=100, blank=True, null=True)
    delivery_driver = models.CharField(max_length=100, blank=True, null=True)
    delivery_driver_phone = models.CharField(max_length=20, blank=True, null=True)
    delivery_driver_email = models.EmailField(blank=True, null=True)
    delivery_notes = models.TextField(blank=True, null=True)
    estimated_delivery = models.DateTimeField(blank=True, null=True)
    actual_delivery = models.DateTimeField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-order_date']
        verbose_name = 'Order'
        verbose_name_plural = 'Orders'
        indexes = [
            models.Index(fields=['customer', '-order_date'], name='order_customer_date_idx'),
            models.Index(fields=['payment_status'],          name='order_payment_status_idx'),
            models.Index(fields=['delivery_status'],         name='order_delivery_status_idx'),
            models.Index(fields=['-order_date'],             name='order_date_idx'),
        ]

    def __str__(self):
        return f"Order #{self.id} - {self.customer.shop_name}"

    def calculate_total(self):
        """Calculate total amount from order items"""
        total = self.items.aggregate(
            total=Sum(F('quantity_crates') * F('product__crate_size') * F('price') + 
                     F('quantity_bottles') * F('price'))
        )['total'] or 0
        self.total_amount = total
        self.save()
        return total


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity_crates = models.IntegerField(default=0)
    quantity_bottles = models.IntegerField(default=0)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Order Item'
        verbose_name_plural = 'Order Items'

    def __str__(self):
        return f"{self.product.product_name} - Order #{self.order.id}"

    def get_total_bottles(self):
        """Calculate total bottles including crates"""
        return (self.quantity_crates * self.product.crate_size) + self.quantity_bottles

    def get_item_total(self):
        """Calculate total price for this item"""
        total_bottles = self.get_total_bottles()
        return total_bottles * self.price
