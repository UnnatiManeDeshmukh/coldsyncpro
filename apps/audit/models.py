from django.db import models
from django.contrib.auth.models import User


class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('CREATE', 'Create'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete'),
        ('LOGIN',  'Login'),
        ('LOGOUT', 'Logout'),
        ('EXPORT', 'Export'),
        ('OTHER',  'Other'),
    ]

    user        = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action      = models.CharField(max_length=10, choices=ACTION_CHOICES)
    model_name  = models.CharField(max_length=100, blank=True)
    object_id   = models.CharField(max_length=50, blank=True)
    description = models.TextField()
    ip_address  = models.GenericIPAddressField(null=True, blank=True)
    timestamp   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['model_name', '-timestamp']),
        ]

    def __str__(self):
        return f"[{self.action}] {self.user} — {self.description[:60]}"
