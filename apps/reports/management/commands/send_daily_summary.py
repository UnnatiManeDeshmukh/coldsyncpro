"""
Management command: send_daily_summary
Sends a daily sales summary email to the admin.
Run manually: python manage.py send_daily_summary
Scheduled via: apps/scheduler.py (APScheduler)
"""
from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from django.db.models import Sum, Count
from apps.orders.models import Order
from apps.billing.models import Payment


class Command(BaseCommand):
    help = 'Send daily sales summary email to admin'

    def handle(self, *args, **kwargs):
        today = timezone.now().date()

        # Orders placed today — single aggregated query
        orders_agg = Order.objects.filter(order_date__date=today).aggregate(
            count=Count('id'), total=Sum('total_amount')
        )
        orders_count = orders_agg['count'] or 0
        orders_total = orders_agg['total'] or 0

        # Payments received today — single aggregated query
        payments_agg = Payment.objects.filter(payment_date__date=today).aggregate(
            count=Count('id'), total=Sum('amount')
        )
        payments_count = payments_agg['count'] or 0
        payments_total = payments_agg['total'] or 0

        # Pending orders — single aggregated query
        pending_agg = Order.objects.filter(payment_status='Pending').aggregate(
            count=Count('id'), total=Sum('total_amount')
        )
        pending_orders = pending_agg['count'] or 0
        pending_amount = pending_agg['total'] or 0

        # Low stock count
        from apps.inventory.models import Stock
        low_stock = Stock.objects.filter(total_crates__lte=5).count()

        admin_email = getattr(settings, 'ADMIN_EMAIL', 'shreeganeshagency1517@gmail.com')

        subject = f"📊 ColdSync Pro — Daily Summary ({today.strftime('%d %b %Y')})"
        body = f"""Good Morning!

Here is your daily business summary for {today.strftime('%d %B %Y')}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  TODAY'S ORDERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Orders Placed  : {orders_count}
  Orders Value   : ₹{orders_total:,.2f}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  TODAY'S PAYMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Payments Received : {payments_count}
  Amount Collected  : ₹{payments_total:,.2f}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PENDING / ALERTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Pending Orders    : {pending_orders} (₹{pending_amount:,.2f} due)
  Low Stock Items   : {low_stock} products

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Have a great day!
— ColdSync Pro
"""

        try:
            send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [admin_email], fail_silently=False)
            self.stdout.write(self.style.SUCCESS(f'Daily summary sent to {admin_email}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Failed to send summary: {e}'))
