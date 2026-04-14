from django.db import models
from django.utils import timezone
from apps.customers.models import Customer
from apps.orders.models import Order


class UpiConfig(models.Model):
    """Admin-managed UPI payment configuration with QR image upload."""
    upi_id    = models.CharField(max_length=100, default='9960991017@ybl', help_text='e.g. 9960991017@ybl')
    upi_name  = models.CharField(max_length=100, default='Shree Ganesh Agency')
    bank_name = models.CharField(max_length=100, default='State Bank of India', blank=True)
    qr_image  = models.ImageField(
        upload_to='upi_qr/',
        blank=True, null=True,
        help_text='Upload your PhonePe / GPay / Paytm QR code image'
    )
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'UPI Configuration'
        verbose_name_plural = 'UPI Configuration'

    def __str__(self):
        return f"{self.upi_name} — {self.upi_id}"

    @classmethod
    def get_active(cls):
        """Return the active config, or create default if none exists."""
        obj = cls.objects.filter(is_active=True).first()
        if not obj:
            obj = cls.objects.create()
        return obj


class Payment(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('Cash', 'Cash'),
        ('UPI', 'UPI'),
        ('Bank Transfer', 'Bank Transfer'),
        ('Cheque', 'Cheque'),
    ]

    VERIFICATION_STATUS_CHOICES = [
        ('pending', 'Pending Verification'),
        ('verified', 'Verified'),
        ('rejected', 'Rejected'),
    ]

    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='payments')
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='payments', null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=50, choices=PAYMENT_METHOD_CHOICES)
    payment_date = models.DateTimeField(auto_now_add=True)
    reference_number = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    # UPI verification — admin manually marks as verified/rejected
    verification_status = models.CharField(
        max_length=20, choices=VERIFICATION_STATUS_CHOICES,
        default='pending',
        help_text='Admin verifies UPI payments manually'
    )
    verified_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='verified_payments'
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-payment_date']
        verbose_name = 'Payment'
        verbose_name_plural = 'Payments'
        indexes = [
            models.Index(fields=['customer', '-payment_date'], name='payment_customer_date_idx'),
            models.Index(fields=['reference_number'],          name='payment_reference_idx'),
        ]

    def __str__(self):
        return f"Payment #{self.id} - {self.customer.shop_name} - ₹{self.amount}"


class Invoice(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('Cash', 'Cash'),
        ('UPI', 'UPI'),
        ('Bank Transfer', 'Bank Transfer'),
        ('Credit', 'Credit'),
    ]
    
    invoice_number = models.CharField(max_length=50, unique=True, editable=False)
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='invoice')
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='invoices')
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    gst_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=18.00)
    gst_amount = models.DecimalField(max_digits=10, decimal_places=2)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=50, choices=PAYMENT_METHOD_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Invoice'
        verbose_name_plural = 'Invoices'
        indexes = [
            models.Index(fields=['customer', '-created_at'], name='invoice_customer_date_idx'),
            models.Index(fields=['invoice_number'],          name='invoice_number_idx'),
        ]

    def __str__(self):
        return f"Invoice {self.invoice_number} - {self.customer.shop_name}"

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            self.invoice_number = self.generate_invoice_number()
        if not self.gst_amount:
            self.gst_amount = (self.subtotal * self.gst_percentage) / 100
        if not self.total_amount:
            self.total_amount = self.subtotal + self.gst_amount
        super().save(*args, **kwargs)

    @staticmethod
    def generate_invoice_number():
        """Generate unique invoice number: INV-YYYYMMDD-XXXX"""
        today = timezone.now()
        date_str = today.strftime('%Y%m%d')
        prefix = f"INV-{date_str}"
        
        last_invoice = Invoice.objects.filter(
            invoice_number__startswith=prefix
        ).order_by('-invoice_number').first()
        
        if last_invoice:
            last_number = int(last_invoice.invoice_number.split('-')[-1])
            new_number = last_number + 1
        else:
            new_number = 1
        
        return f"{prefix}-{new_number:04d}"
