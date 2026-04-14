# Generated migration for making supplier address optional

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('suppliers', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='supplier',
            name='address',
            field=models.TextField(blank=True, default=''),
        ),
    ]
