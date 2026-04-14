"""
APScheduler setup for ColdSync Pro.
Runs daily at midnight to auto-generate recurring orders.
"""
import logging
from datetime import date
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from django_apscheduler.jobstores import DjangoJobStore

logger = logging.getLogger(__name__)

_scheduler = None


def process_recurring_orders():
    """Auto-generate orders for all active subscriptions due today."""
    from .models import RecurringOrder
    from .views import _create_order_from_recurring, _advance_next_date

    today = date.today()
    due = RecurringOrder.objects.filter(status='active', next_order_date__lte=today)
    created = 0
    for rec in due:
        try:
            order = _create_order_from_recurring(rec)
            if order:
                _advance_next_date(rec)
                created += 1
                logger.info(f"Auto-created order #{order.id} for recurring #{rec.id} ({rec.customer.shop_name})")
        except Exception as e:
            logger.error(f"Failed to process recurring #{rec.id}: {e}")

    if created:
        logger.info(f"Scheduler: {created} recurring orders created for {today}")


def check_low_stock():
    """Send low stock alerts to admin when stock drops below threshold."""
    from apps.inventory.models import Stock
    from django.conf import settings
    from apps.billing.notifications import _send_email

    low_stocks = Stock.objects.select_related('product').filter(total_crates__lte=5)
    if not low_stocks.exists():
        return

    lines = []
    for s in low_stocks:
        lines.append(
            f"  • {s.product.brand} {s.product.product_name} ({s.product.bottle_size})"
            f" — {s.total_crates} crates + {s.total_bottles} bottles [{s.warehouse_name}]"
        )

    body = (
        "⚠️ LOW STOCK ALERT — ColdSync Pro\n\n"
        "The following products are running low:\n\n"
        + "\n".join(lines)
        + "\n\nPlease replenish stock soon.\n\n— ColdSync Pro"
    )

    admin_email = getattr(settings, 'ADMIN_EMAIL', '')
    _send_email(admin_email, f"⚠️ Low Stock Alert — {low_stocks.count()} products", body)
    logger.info(f"Low stock alert sent for {low_stocks.count()} products")


def check_expiry_alerts():
    """
    Send expiry alert to admin for products expiring within 30 days.
    Runs daily at 9 AM.
    """
    from apps.products.models import Product
    from django.conf import settings
    from apps.billing.notifications import _send_email
    from datetime import date, timedelta

    today = date.today()
    expiry_threshold = today + timedelta(days=30)

    expiring = Product.objects.filter(
        expiry_date__lte=expiry_threshold,
        expiry_date__gte=today,
    ).order_by('expiry_date')

    if not expiring.exists():
        return

    lines = []
    for p in expiring:
        days_left = (p.expiry_date - today).days
        urgency = '🔴 URGENT' if days_left <= 7 else '🟡 WARNING'
        lines.append(
            f"  {urgency} {p.brand} {p.product_name} ({p.bottle_size})"
            f" — Expires: {p.expiry_date.strftime('%d %b %Y')} ({days_left} days left)"
        )

    body = (
        "⏰ PRODUCT EXPIRY ALERT — ColdSync Pro\n\n"
        "The following products are expiring soon:\n\n"
        + "\n".join(lines)
        + "\n\nPlease take action immediately.\n\n— ColdSync Pro"
    )

    admin_email = getattr(settings, 'ADMIN_EMAIL', '')
    _send_email(admin_email, f"⏰ Expiry Alert — {expiring.count()} products expiring soon", body)
    logger.info(f"Expiry alert sent for {expiring.count()} products")


def send_payment_reminders():
    """
    Send WhatsApp/SMS payment reminders to customers with pending dues > 7 days.
    Runs daily at 10 AM.
    """
    from apps.orders.models import Order
    from apps.customers.models import Customer
    from apps.billing.notifications import _twilio_client, _send_whatsapp, _send_sms
    from django.db.models import Sum
    from datetime import timedelta
    from django.utils import timezone

    cutoff = timezone.now() - timedelta(days=7)
    client = _twilio_client()
    sent = 0

    # Find customers with pending orders older than 7 days
    customers_with_dues = Customer.objects.filter(
        orders__payment_status__in=['Pending', 'Partial'],
        orders__order_date__lte=cutoff,
    ).distinct()

    for customer in customers_with_dues:
        outstanding = Order.objects.filter(
            customer=customer,
            payment_status__in=['Pending', 'Partial'],
        ).aggregate(total=Sum('total_amount'))['total'] or 0

        if float(outstanding) <= 0:
            continue

        phone = customer.phone or ''
        if not phone:
            continue

        msg = (
            f"💰 *Payment Reminder — Shree Ganesh Agency*\n\n"
            f"Dear *{customer.owner_name}*,\n\n"
            f"You have an outstanding balance of *₹{float(outstanding):,.0f}*.\n\n"
            f"Please clear your dues to continue ordering.\n\n"
            f"Pay via UPI: Visit your ColdSync Pro dashboard → Pay Now\n\n"
            f"— Shree Ganesh Agency 🙏"
        )

        try:
            ok = _send_whatsapp(client, phone, msg)
            if not ok:
                _send_sms(client, phone, msg)
            sent += 1
        except Exception as e:
            logger.error(f"Payment reminder failed for {customer.shop_name}: {e}")

    if sent:
        logger.info(f"Payment reminders sent to {sent} customers")


def start():
    global _scheduler
    if _scheduler and _scheduler.running:
        return

    # Dev server --reload madhe doni vela start hoto — RUN_MAIN check karo
    import os
    if os.environ.get('RUN_MAIN') == 'true':
        # Django autoreloader child process — skip, parent already started
        return

    _scheduler = BackgroundScheduler(timezone="Asia/Kolkata")
    _scheduler.add_jobstore(DjangoJobStore(), "default")

    # Run recurring order check every day at midnight
    _scheduler.add_job(
        process_recurring_orders,
        trigger=CronTrigger(hour=0, minute=0),
        id="process_recurring_orders",
        name="Auto-generate recurring orders",
        replace_existing=True,
    )

    # Run low stock check every day at 8 AM
    _scheduler.add_job(
        check_low_stock,
        trigger=CronTrigger(hour=8, minute=0),
        id="check_low_stock",
        name="Low stock email alert",
        replace_existing=True,
    )

    # Run expiry alert every day at 9 AM
    _scheduler.add_job(
        check_expiry_alerts,
        trigger=CronTrigger(hour=9, minute=0),
        id="check_expiry_alerts",
        name="Product expiry email alert",
        replace_existing=True,
    )

    # Run payment reminders every day at 10 AM
    _scheduler.add_job(
        send_payment_reminders,
        trigger=CronTrigger(hour=10, minute=0),
        id="send_payment_reminders",
        name="Payment reminder WhatsApp/SMS",
        replace_existing=True,
    )

    _scheduler.start()
    logger.info("ColdSync scheduler started (recurring orders + low stock + expiry + payment reminders)")
