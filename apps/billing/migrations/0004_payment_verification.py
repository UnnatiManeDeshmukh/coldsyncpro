from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('billing', '0003_add_performance_indexes'),
    ]

    operations = [
        migrations.AddField(
            model_name='payment',
            name='verification_status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pending Verification'),
                    ('verified', 'Verified'),
                    ('rejected', 'Rejected'),
                ],
                default='pending',
                help_text='Admin verifies UPI payments manually',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='payment',
            name='verified_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='verified_payments',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='payment',
            name='verified_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
