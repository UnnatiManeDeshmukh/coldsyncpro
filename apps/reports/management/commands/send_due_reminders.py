"""
Management command: send_due_reminders
Sends payment due reminder emails to customers with pending orders.
Run manually: python manage.py send_due_reminders
Scheduled via: apps/scheduler.py (every day at 10:00 AM)
"""
from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Sum
from apps.orders.models import Order


class Command(BaseCommand):
    help = 'Send payment due reminder emails to customers with pending orders'

    def handle(self, *args, **kwargs):
        pending_orders = Order.objects.filter(
            payment_status__in=['Pending', 'Partial']
        ).select_related('customer__user').order_by('customer')

        if not pending_orders.exists():
            self.stdout.write(self.style.SUCCESS('No pending orders found.'))
            return

        # Group by customer
        customer_orders = {}
        for order in pending_orders:
            cid = order.customer.id
            if cid not in customer_orders:
                customer_orders[cid] = {'customer': order.customer, 'orders': []}
            customer_orders[cid]['orders'].append(order)

        sent = 0
        for cid, data in customer_orders.items():
            customer = data['customer']
            orders = data['orders']
            email = getattr(customer.user, 'email', None) if customer.user else None

            total_due = sum(float(o.total_amount) for o in orders)
            orders_text = '\n'.join(
                f"  • Order #{o.id} — ₹{o.total_amount} ({o.payment_status})"
                for o in orders
            )

            # Email to customer
            if email:
                try:
                    send_mail(
                        f"⚠️ Payment Due Reminder — ₹{total_due:,.0f} | ColdSync Pro",
                        f"""Dear {customer.owner_name},

This is a friendly reminder that you have pending payments.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PAYMENT DUE REMINDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Shop         : {customer.shop_name}
  Total Due    : ₹{total_due:,.2f}

  Pending Orders:
{orders_text}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Please clear your dues at the earliest.
Contact us: {getattr(settings, 'ADMIN_EMAIL', 'shreeganeshagency1517@gmail.com')}

— ColdSync Pro Team
""",
                        settings.DEFAULT_FROM_EMAIL,
                        [email],
                        fail_silently=True,
                    )
                    sent += 1
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f'Failed for {email}: {e}'))

        # Summary email to admin
        admin_email = getattr(settings, 'ADMIN_EMAIL', 'shreeganeshagency1517@gmail.com')
        all_due = float(
            Order.objects.filter(payment_status__in=['Pending', 'Partial'])
            .aggregate(t=Sum('total_amount'))['t'] or 0
        )
        try:
            send_mail(
                f"📋 Due Reminders Sent — {len(customer_orders)} customers | ₹{all_due:,.0f} pending",
                f"""Due reminder summary — ColdSync Pro

  Customers with dues : {len(customer_orders)}
  Total pending amount: ₹{all_due:,.2f}
  Reminder emails sent: {sent}
""",
                settings.DEFAULT_FROM_EMAIL,
                [admin_email],
                fail_silently=True,
            )
        except Exception:
            pass

        self.stdout.write(self.style.SUCCESS(
            f'Reminders sent to {sent} customers. Total due: ₹{all_due:,.2f}'
        ))
