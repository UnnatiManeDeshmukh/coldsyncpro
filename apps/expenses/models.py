from django.db import models
from apps.customers.models import Customer
from apps.billing.models import Invoice


class CreditTransaction(models.Model):
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Partial', 'Partial'),
        ('Paid', 'Paid'),
    ]
    
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='credit_transactions')
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='credit_transactions')
    amount_due = models.DecimalField(max_digits=10, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    payment_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Credit Transaction'
        verbose_name_plural = 'Credit Transactions'

    def __str__(self):
        return f"Credit #{self.id} - {self.customer.shop_name} - ₹{self.amount_due}"

    @property
    def remaining_amount(self):
        return self.amount_due - self.amount_paid

    def update_status(self):
        """Auto update status based on payment"""
        if self.amount_paid >= self.amount_due:
            self.status = 'Paid'
        elif self.amount_paid > 0:
            self.status = 'Partial'
        else:
            self.status = 'Pending'
        self.save()


class Expense(models.Model):
    CATEGORY_CHOICES = [
        ('Transport', 'Transport'),
        ('Salary', 'Salary'),
        ('Maintenance', 'Maintenance'),
        ('Utilities', 'Utilities'),
        ('Marketing', 'Marketing'),
        ('Other', 'Other'),
    ]
    
    expense_name = models.CharField(max_length=200)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='Other')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField()
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']
        verbose_name = 'Expense'
        verbose_name_plural = 'Expenses'

    def __str__(self):
        return f"{self.expense_name} - ₹{self.amount} ({self.date})"
