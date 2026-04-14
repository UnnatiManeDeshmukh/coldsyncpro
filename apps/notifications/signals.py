"""
Auto-create notifications when orders/payments change or stock is low.
Fires for both the customer user AND all admin/staff users.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User


def _get_admins():
    """Return all staff/superuser accounts."""
    return User.objects.filter(is_staff=True)


def _notify_admins(type_, title, message, order_id=None):
    from .models import Notification
    for admin in _get_admins():
        Notification.objects.create(
            user=admin, type=type_, title=title,
            message=message, order_id=order_id,
        )


# ── Order signals ─────────────────────────────────────────────

@receiver(post_save, sender='orders.Order')
def order_notification(sender, instance, created, **kwargs):
    from .models import Notification
    customer_user = getattr(instance.customer, 'user', None)

    if created:
        # Notify customer
        if customer_user:
            Notification.objects.create(
                user=customer_user,
                type='order_placed',
                title=f'Order #{instance.id} Placed',
                message=f'Your order of ₹{instance.total_amount} has been placed successfully.',
                order_id=instance.id,
            )
        # Notify admins
        _notify_admins(
            'new_order_admin',
            f'New Order #{instance.id}',
            f'{instance.customer.shop_name} placed an order worth ₹{instance.total_amount}.',
            order_id=instance.id,
        )
        return

    # Status-change notifications (update only)
    delivery = instance.delivery_status
    if delivery == 'Out for Delivery' and customer_user:
        if not Notification.objects.filter(user=customer_user, type='order_shipped', order_id=instance.id).exists():
            Notification.objects.create(
                user=customer_user,
                type='order_shipped',
                title=f'Order #{instance.id} Out for Delivery',
                message='Your order is on the way! Expect delivery soon.',
                order_id=instance.id,
            )
    elif delivery == 'Delivered' and customer_user:
        if not Notification.objects.filter(user=customer_user, type='order_delivered', order_id=instance.id).exists():
            Notification.objects.create(
                user=customer_user,
                type='order_delivered',
                title=f'Order #{instance.id} Delivered',
                message=f'Order delivered successfully. Total: ₹{instance.total_amount}.',
                order_id=instance.id,
            )


# ── Payment signals ───────────────────────────────────────────

@receiver(post_save, sender='billing.Payment')
def payment_notification(sender, instance, created, **kwargs):
    if not created:
        return
    from .models import Notification
    customer_user = getattr(instance.customer, 'user', None)

    # Notify customer
    if customer_user:
        Notification.objects.create(
            user=customer_user,
            type='payment_received',
            title='Payment Received',
            message=f'₹{instance.amount} received via {instance.payment_method}. Thank you!',
            order_id=instance.order_id,
        )

    # Notify admins
    _notify_admins(
        'payment_received',
        f'Payment Received — ₹{instance.amount}',
        f'{instance.customer.shop_name} paid ₹{instance.amount} via {instance.payment_method}.',
        order_id=instance.order_id,
    )


# ── Inventory signals ─────────────────────────────────────────

@receiver(post_save, sender='inventory.Stock')
def low_stock_notification(sender, instance, **kwargs):
    from .models import Notification
    from django.utils import timezone
    from datetime import timedelta

    LOW_CRATES  = 5
    LOW_BOTTLES = 50

    if instance.total_crates > LOW_CRATES or instance.total_bottles > LOW_BOTTLES:
        return

    # Deduplicate: only one low-stock alert per product per 6 hours
    cutoff = timezone.now() - timedelta(hours=6)
    already = Notification.objects.filter(
        type='low_stock',
        title__icontains=instance.product.product_name,
        created_at__gte=cutoff,
    ).exists()
    if already:
        return

    level = 'Out of Stock' if instance.total_crates == 0 and instance.total_bottles == 0 else 'Low Stock'
    _notify_admins(
        'low_stock',
        f'{level}: {instance.product.product_name}',
        f'{instance.product.product_name} ({instance.product.brand}) at {instance.warehouse_name} — '
        f'{instance.total_crates} crates, {instance.total_bottles} bottles remaining.',
    )

    # Send admin email for low stock
    try:
        from django.core.mail import send_mail
        from django.conf import settings
        admin_email = getattr(settings, 'ADMIN_EMAIL', 'shreeganeshagency1517@gmail.com')
        send_mail(
            f"⚠️ {level}: {instance.product.product_name} — ColdSync Pro",
            f"""{level} Alert — ColdSync Pro

  Product      : {instance.product.product_name}
  Brand        : {instance.product.brand}
  Warehouse    : {instance.warehouse_name}
  Crates Left  : {instance.total_crates}
  Bottles Left : {instance.total_bottles}

Please restock immediately.
""",
            settings.DEFAULT_FROM_EMAIL,
            [admin_email],
            fail_silently=True,
        )
    except Exception:
        pass
