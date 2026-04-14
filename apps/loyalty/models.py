from django.db import models
from apps.customers.models import Customer


class LoyaltyAccount(models.Model):
    customer = models.OneToOneField(Customer, on_delete=models.CASCADE, related_name='loyalty')
    points = models.IntegerField(default=0)
    total_earned = models.IntegerField(default=0)
    total_redeemed = models.IntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.customer.shop_name} — {self.points} pts"

    @property
    def tier(self):
        if self.total_earned >= 5000:
            return 'Gold'
        elif self.total_earned >= 2000:
            return 'Silver'
        return 'Bronze'


class LoyaltyTransaction(models.Model):
    TYPE_CHOICES = [('earn', 'Earned'), ('redeem', 'Redeemed'), ('bonus', 'Bonus')]
    account = models.ForeignKey(LoyaltyAccount, on_delete=models.CASCADE, related_name='transactions')
    points = models.IntegerField()
    transaction_type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    description = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
