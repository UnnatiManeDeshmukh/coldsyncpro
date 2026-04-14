"""
Payment notification helpers — Email + WhatsApp + SMS
Sends to: Customer (email/WA/SMS) + Admin (email/WA/SMS)
"""
import logging
import urllib.parse
import urllib.request
import json
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)

ADMIN_EMAIL  = getattr(settings, 'ADMIN_EMAIL', 'shreeganeshagency1517@gmail.com')
ADMIN_PHONE  = getattr(settings, 'AGENCY_WHATSAPP_NUMBER', '')


# ── Internal helpers ──────────────────────────────────────────────────────────

def _twilio_client():
    sid   = getattr(settings, 'TWILIO_ACCOUNT_SID', '')
    token = getattr(settings, 'TWILIO_AUTH_TOKEN', '')
    if sid and token:
        try:
            from twilio.rest import Client
            return Client(sid, token)
        except Exception as e:
            logger.error(f"Twilio init failed: {e}")
    return None


def _wa_from():
    return getattr(settings, 'TWILIO_WHATSAPP_FROM', 'whatsapp:+14155238886')


def _sms_from():
    return getattr(settings, 'TWILIO_SMS_FROM', '')


def _send_fast2sms(phone: str, message: str):
    """Send SMS via Fast2SMS (Indian free tier). Needs FAST2SMS_API_KEY in settings."""
    api_key = getattr(settings, 'FAST2SMS_API_KEY', '')
    if not api_key or not phone:
        return False
    try:
        phone = phone.strip().replace(' ', '').lstrip('+').lstrip('91')[-10:]
        payload = json.dumps({
            'route': 'q',
            'message': message[:160],
            'language': 'english',
            'flash': 0,
            'numbers': phone,
        }).encode('utf-8')
        req = urllib.request.Request(
            'https://www.fast2sms.com/dev/bulkV2',
            data=payload,
            headers={'authorization': api_key, 'Content-Type': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())
            if data.get('return'):
                logger.info(f"Fast2SMS sent to {phone}")
                return True
    except Exception as e:
        logger.error(f"Fast2SMS failed to {phone}: {e}")
    return False


def _send_whatsapp(client, to_phone: str, message: str):
    if not client or not to_phone:
        return False
    try:
        phone = to_phone.strip().replace(' ', '')
        if not phone.startswith('+'):
            phone = '+91' + phone.lstrip('0')
        client.messages.create(body=message, from_=_wa_from(), to=f"whatsapp:{phone}")
        logger.info(f"WhatsApp sent to {phone}")
        return True
    except Exception as e:
        logger.error(f"WhatsApp send failed to {to_phone}: {e}")
        return False


def _send_sms(client, to_phone: str, message: str):
    """Try Twilio SMS first, then Fast2SMS fallback."""
    sms_from = _sms_from()
    if client and to_phone and sms_from:
        try:
            phone = to_phone.strip().replace(' ', '')
            if not phone.startswith('+'):
                phone = '+91' + phone.lstrip('0')
            client.messages.create(body=message, from_=sms_from, to=phone)
            logger.info(f"Twilio SMS sent to {phone}")
            return True
        except Exception as e:
            logger.error(f"Twilio SMS failed to {to_phone}: {e}")
    # Fallback to Fast2SMS
    return _send_fast2sms(to_phone, message)


def _send_email(to: str, subject: str, body: str):
    if not to:
        return False
    try:
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [to], fail_silently=False)
        logger.info(f"Email sent to {to}: {subject}")
        return True
    except Exception as e:
        logger.error(f"Email failed to {to}: {e}")
        return False


def _wa_fallback_url(phone: str, message: str):
    if not phone:
        return None
    phone = phone.strip().lstrip('+').replace(' ', '')
    return f"https://wa.me/{phone}?text={urllib.parse.quote(message)}"


# ── Payment Notifications ─────────────────────────────────────────────────────

def send_payment_notifications(payment, customer, order=None):
    """
    Send payment confirmation to:
    - Customer: email + WhatsApp (if WA number) or SMS fallback
    - Admin: email + WhatsApp + SMS

    Returns dict with sent status flags + fallback URLs.
    """
    client = _twilio_client()
    order_info = f"Order #{order.id}" if order else "outstanding balance"
    amount_str = f"₹{payment.amount}"

    # ── Customer message ──────────────────────────────────────
    customer_email = getattr(customer.user, 'email', None) if customer.user else None
    customer_phone = getattr(customer, 'phone', '')

    customer_email_body = f"""Dear {customer.owner_name},

Your payment has been successfully received. 🎉

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PAYMENT CONFIRMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Payment ID   : #{payment.id}
  Amount       : {amount_str}
  Method       : {payment.payment_method}
  Reference    : {payment.reference_number or 'N/A'}
  For          : {order_info}
  Shop         : {customer.shop_name}
  Date         : {payment.payment_date.strftime('%d %b %Y, %I:%M %p')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Thank you for your payment! 🙏

— Shree Ganesh Agency
  ColdSync Pro
"""

    customer_wa_msg = (
        f"✅ *Payment Confirmed — Shree Ganesh Agency*\n\n"
        f"Dear *{customer.owner_name}*,\n"
        f"Your payment of *{amount_str}* has been received! 🎉\n\n"
        f"📋 *Details:*\n"
        f"• Payment ID : #{payment.id}\n"
        f"• Method     : {payment.payment_method}\n"
        f"• Reference  : {payment.reference_number or 'N/A'}\n"
        f"• For        : {order_info}\n"
        f"• Shop       : {customer.shop_name}\n"
        f"• Date       : {payment.payment_date.strftime('%d %b %Y, %I:%M %p')}\n\n"
        f"Thank you! 🙏\n— Shree Ganesh Agency"
    )

    # ── Admin message ─────────────────────────────────────────
    admin_email_body = f"""New payment received on ColdSync Pro! 💰

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PAYMENT RECEIVED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Payment ID   : #{payment.id}
  Shop         : {customer.shop_name}
  Owner        : {customer.owner_name}
  Phone        : {customer_phone or 'N/A'}
  Amount       : {amount_str}
  Method       : {payment.payment_method}
  Reference    : {payment.reference_number or 'N/A'}
  For          : {order_info}
  Date         : {payment.payment_date.strftime('%d %b %Y, %I:%M %p')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

    admin_wa_msg = (
        f"💰 *Payment Received — ColdSync Pro*\n\n"
        f"*{customer.shop_name}* ({customer.owner_name})\n"
        f"Amount: *{amount_str}*\n"
        f"Method: {payment.payment_method}\n"
        f"Ref: {payment.reference_number or 'N/A'}\n"
        f"For: {order_info}\n"
        f"Phone: {customer_phone or 'N/A'}\n"
        f"Date: {payment.payment_date.strftime('%d %b %Y, %I:%M %p')}"
    )

    # ── Send to Customer ──────────────────────────────────────
    cust_email_sent = _send_email(
        customer_email,
        f"✅ Payment Confirmed — {amount_str} | Shree Ganesh Agency",
        customer_email_body
    )

    # Try Twilio WhatsApp to customer
    cust_wa_sent  = _send_whatsapp(client, customer_phone, customer_wa_msg)
    cust_sms_sent = False
    # Always generate fallback link (customer can share to admin manually if needed)
    cust_wa_fallback = _wa_fallback_url(customer_phone, customer_wa_msg)

    if not cust_wa_sent:
        cust_sms_sent = _send_sms(client, customer_phone, customer_wa_msg)

    # ── Send to Admin ─────────────────────────────────────────
    admin_email_sent = _send_email(
        ADMIN_EMAIL,
        f"💰 Payment Received — {amount_str} from {customer.shop_name}",
        admin_email_body
    )

    admin_wa_sent  = _send_whatsapp(client, ADMIN_PHONE, admin_wa_msg)
    admin_sms_sent = False
    # Admin WhatsApp deep link — frontend will auto-open this
    admin_wa_link  = _wa_fallback_url('919822851017', admin_wa_msg)

    if not admin_wa_sent:
        admin_sms_sent = _send_sms(client, ADMIN_PHONE, admin_wa_msg)

    return {
        'email_sent':            cust_email_sent,
        'whatsapp_sent':         cust_wa_sent,
        'sms_sent':              cust_sms_sent,
        'whatsapp_fallback_url': cust_wa_fallback,
        'admin_email_sent':      admin_email_sent,
        'admin_wa_sent':         admin_wa_sent,
        'admin_sms_sent':        admin_sms_sent,
        # Frontend will auto-open this link to notify admin via WhatsApp
        'admin_wa_link':         admin_wa_link,
    }


# ── Keep old function names for backward compatibility ────────────────────────

def send_payment_email(payment, customer, order=None):
    """Legacy: send only email. Use send_payment_notifications() for full flow."""
    customer_email = getattr(customer.user, 'email', None) if customer.user else None
    order_info = f"Order #{order.id}" if order else "outstanding balance"
    body = f"""Dear {customer.owner_name},

Payment of ₹{payment.amount} confirmed.
Reference: {payment.reference_number or 'N/A'}
For: {order_info}

— Shree Ganesh Agency"""
    return _send_email(customer_email, f"✅ Payment ₹{payment.amount} Confirmed", body)


def send_payment_whatsapp(payment, customer, order=None):
    """Legacy: returns (success, fallback_url). Use send_payment_notifications() instead."""
    client = _twilio_client()
    order_info = f"Order #{order.id}" if order else "outstanding balance"
    msg = (
        f"✅ *Payment Confirmed*\n"
        f"₹{payment.amount} received from {customer.shop_name}\n"
        f"Ref: {payment.reference_number or 'N/A'}\n"
        f"For: {order_info}"
    )
    phone = getattr(customer, 'phone', '')
    sent = _send_whatsapp(client, phone, msg)
    fallback = _wa_fallback_url(phone, msg) if not sent else None
    return sent, fallback


# ── Order Notifications ───────────────────────────────────────────────────────

def send_order_notification(order, customer):
    """Send order placed confirmation via email + WhatsApp + SMS to customer & admin."""
    client = _twilio_client()
    customer_email = getattr(customer.user, 'email', None) if customer.user else None
    customer_phone = getattr(customer, 'phone', '')

    items_text = '\n'.join(
        f"  • {item.product.product_name} ({item.product.brand}) — {item.get_total_bottles()} bottles"
        for item in order.items.all()
    )

    email_body = f"""Dear {customer.owner_name},

Your order has been placed successfully! 🛒

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ORDER CONFIRMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Order ID     : #{order.id}
  Total Amount : ₹{order.total_amount}
  Status       : {order.delivery_status}
  Payment      : {order.payment_status}
  Shop         : {customer.shop_name}

  Items:
{items_text}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

We will process your order shortly.

— Shree Ganesh Agency"""

    wa_msg = (
        f"🛒 *Order Placed — Shree Ganesh Agency*\n\n"
        f"Dear *{customer.owner_name}*,\n"
        f"Order *#{order.id}* placed successfully!\n\n"
        f"Amount: *₹{order.total_amount}*\n"
        f"Status: {order.delivery_status}\n\n"
        f"Items:\n{items_text}\n\n"
        f"We'll process it shortly. 🙏"
    )

    admin_body = f"""New order placed on ColdSync Pro! 🛒

  Order ID     : #{order.id}
  Shop         : {customer.shop_name}
  Owner        : {customer.owner_name}
  Phone        : {customer_phone or 'N/A'}
  Total Amount : ₹{order.total_amount}
  Payment      : {order.payment_status}
  Status       : {order.delivery_status}

  Items:
{items_text}"""

    admin_wa = (
        f"🛒 *New Order #{order.id} — ColdSync Pro*\n\n"
        f"*{customer.shop_name}* ({customer.owner_name})\n"
        f"Amount: *₹{order.total_amount}*\n"
        f"Phone: {customer_phone or 'N/A'}\n\n"
        f"Items:\n{items_text}"
    )

    # Customer notifications
    _send_email(customer_email, f"🛒 Order #{order.id} Placed — Shree Ganesh Agency", email_body)
    if not _send_whatsapp(client, customer_phone, wa_msg):
        _send_sms(client, customer_phone, wa_msg)

    # Admin notifications
    _send_email(ADMIN_EMAIL, f"🛒 New Order #{order.id} — {customer.shop_name} — ₹{order.total_amount}", admin_body)
    if not _send_whatsapp(client, ADMIN_PHONE, admin_wa):
        _send_sms(client, ADMIN_PHONE, admin_wa)


# ── Driver Assignment Notifications ──────────────────────────────────────────

def send_driver_assignment_notification(order, driver):
    """
    Called when admin assigns a driver to an order.
    
    Sends:
    1. Driver  → Email + WhatsApp: Delivery card (what to deliver, where, when)
    2. Customer → Email + WhatsApp: Driver card (who is coming, phone, vehicle, ETA)
    """
    client = _twilio_client()
    customer = order.customer
    customer_email = getattr(customer.user, 'email', None) if customer.user else None
    customer_phone = customer.phone or ''

    driver_email = driver.email or ''
    driver_phone = driver.phone or ''

    est = order.estimated_delivery.strftime('%d %b %Y, %I:%M %p') if order.estimated_delivery else 'Today'

    # Build items text
    items_text = '\n'.join(
        f"  • {item.product.product_name} ({item.product.brand}) — "
        f"{item.quantity_crates} crates + {item.quantity_bottles} bottles"
        for item in order.items.select_related('product').all()
    )

    # ── 1. DRIVER EMAIL ───────────────────────────────────────
    driver_email_body = f"""Hello {driver.name},

You have been assigned a new delivery! 🚚

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  DELIVERY ASSIGNMENT — Order #{order.id}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  📦 ORDER DETAILS
  ─────────────────
  Order ID     : #{order.id}
  Total Amount : ₹{order.total_amount}
  Payment      : {order.payment_status}

  📦 ITEMS TO DELIVER
  ─────────────────────
{items_text}

  📍 DELIVERY ADDRESS
  ─────────────────────
  Shop         : {customer.shop_name}
  Owner        : {customer.owner_name}
  Phone        : {customer_phone}
  Address      : {customer.address}
  Village      : {customer.village}

  ⏰ SCHEDULE
  ─────────────
  ETA          : {est}
  Vehicle      : {driver.vehicle_number or 'N/A'} ({driver.vehicle_type or 'N/A'})

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📞 Call customer: {customer_phone}

— Shree Ganesh Agency
  ColdSync Pro
"""

    driver_wa_msg = (
        f"🚚 *New Delivery Assigned — Shree Ganesh Agency*\n\n"
        f"Hello *{driver.name}*!\n\n"
        f"━━━━━━━━━━━━━━━━━━━━━━\n"
        f"📦 *Order #{order.id}*\n"
        f"━━━━━━━━━━━━━━━━━━━━━━\n\n"
        f"🏪 *Deliver To:*\n"
        f"• Shop: {customer.shop_name}\n"
        f"• Owner: {customer.owner_name}\n"
        f"• 📱 Phone: {customer_phone}\n"
        f"• 📍 Address: {customer.address}, {customer.village}\n\n"
        f"📦 *Items:*\n{items_text}\n\n"
        f"💰 Amount: ₹{order.total_amount} ({order.payment_status})\n"
        f"⏰ ETA: {est}\n"
        f"🚗 Vehicle: {driver.vehicle_number or 'N/A'}\n\n"
        f"📞 Customer: {customer_phone}\n\n"
        f"— Shree Ganesh Agency 🙏"
    )

    # ── 2. CUSTOMER EMAIL ─────────────────────────────────────
    customer_email_body = f"""Dear {customer.owner_name},

Great news! Your order is being prepared for delivery. 🎉

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  YOUR DELIVERY DRIVER — Order #{order.id}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  🧑‍✈️ DRIVER DETAILS
  ─────────────────────
  Name         : {driver.name}
  Phone        : {driver_phone}
  Vehicle No.  : {driver.vehicle_number or 'N/A'}
  Vehicle Type : {driver.vehicle_type or 'N/A'}

  📦 YOUR ORDER
  ─────────────────────
  Order ID     : #{order.id}
  Total Amount : ₹{order.total_amount}
  Payment      : {order.payment_status}

  ⏰ ESTIMATED DELIVERY
  ─────────────────────
  ETA          : {est}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📞 You can call your driver directly: {driver_phone}

— Shree Ganesh Agency
  ColdSync Pro
"""

    customer_wa_msg = (
        f"🚚 *Your Delivery Driver is Assigned!*\n\n"
        f"Dear *{customer.owner_name}*,\n"
        f"Order *#{order.id}* is on its way soon!\n\n"
        f"━━━━━━━━━━━━━━━━━━━━━━\n"
        f"🧑‍✈️ *Your Driver:*\n"
        f"━━━━━━━━━━━━━━━━━━━━━━\n"
        f"• Name    : *{driver.name}*\n"
        f"• 📱 Phone: {driver_phone}\n"
        f"• 🚗 Vehicle: {driver.vehicle_number or 'N/A'} ({driver.vehicle_type or 'N/A'})\n\n"
        f"💰 Amount: ₹{order.total_amount}\n"
        f"⏰ ETA: {est}\n\n"
        f"📞 Call driver: {driver_phone}\n\n"
        f"— Shree Ganesh Agency 🙏"
    )

    results = {
        'driver_email': False,
        'driver_whatsapp': False,
        'customer_email': False,
        'customer_whatsapp': False,
    }

    # Send to Driver
    if driver_email:
        results['driver_email'] = _send_email(
            driver_email,
            f"🚚 New Delivery Assigned — Order #{order.id} | Shree Ganesh Agency",
            driver_email_body
        )
    if driver_phone:
        results['driver_whatsapp'] = _send_whatsapp(client, driver_phone, driver_wa_msg)
        if not results['driver_whatsapp']:
            _send_sms(client, driver_phone, driver_wa_msg)

    # Send to Customer
    if customer_email:
        results['customer_email'] = _send_email(
            customer_email,
            f"🚚 Driver Assigned for Order #{order.id} — {driver.name} | Shree Ganesh Agency",
            customer_email_body
        )
    if customer_phone:
        results['customer_whatsapp'] = _send_whatsapp(client, customer_phone, customer_wa_msg)
        if not results['customer_whatsapp']:
            _send_sms(client, customer_phone, customer_wa_msg)

    logger.info(f"Driver assignment notifications sent for Order #{order.id}: {results}")
    return results
