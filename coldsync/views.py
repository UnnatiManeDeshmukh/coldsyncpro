from django.http import HttpResponse, JsonResponse
from django.core.mail import send_mail
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

_HOME_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ColdSync Pro - API Backend</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',sans-serif;background:linear-gradient(135deg,#0A1A2F,#1a2332,#0A1A2F);color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
    .container{max-width:900px;background:rgba(255,255,255,.1);backdrop-filter:blur(10px);border-radius:20px;padding:40px;box-shadow:0 8px 32px rgba(31,38,135,.37);border:1px solid rgba(255,255,255,.18)}
    .header{text-align:center;margin-bottom:40px}
    .logo{font-size:48px;margin-bottom:10px}
    h1{font-size:36px;margin-bottom:10px;background:linear-gradient(135deg,#C00000,#F5B400);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
    .subtitle{font-size:18px;color:rgba(255,255,255,.8);margin-bottom:20px}
    .status{display:inline-block;background:rgba(0,255,0,.2);color:#0f0;padding:8px 16px;border-radius:20px;font-size:14px;font-weight:700;border:1px solid rgba(0,255,0,.3)}
    .section{margin:30px 0}
    .section h2{font-size:24px;margin-bottom:15px;color:#F5B400}
    .note{background:rgba(255,193,7,.1);border-left:4px solid #F5B400;padding:15px;margin:15px 0;border-radius:5px}
    .note-title{font-weight:700;color:#F5B400;margin-bottom:8px}
    .endpoints{background:rgba(0,0,0,.3);border-radius:10px;padding:20px;margin-top:15px}
    .endpoint{display:flex;align-items:center;padding:10px;margin:8px 0;background:rgba(255,255,255,.05);border-radius:8px;border-left:3px solid #F5B400}
    .method{display:inline-block;padding:4px 12px;border-radius:4px;font-weight:700;font-size:12px;margin-right:15px;min-width:60px;text-align:center}
    .get{background:#61affe;color:#fff}.post{background:#49cc90;color:#fff}
    .path{font-family:'Courier New',monospace;color:rgba(255,255,255,.9)}
    .lock{margin-left:auto;color:#F5B400;font-size:12px}
    .links{display:flex;gap:15px;justify-content:center;flex-wrap:wrap;margin-top:30px}
    .btn{display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#C00000,#F5B400);color:#fff;text-decoration:none;border-radius:8px;font-weight:700;transition:transform .3s,box-shadow .3s}
    .btn:hover{transform:translateY(-2px);box-shadow:0 5px 20px rgba(192,0,0,.4)}
    .btn-sec{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.3)}
    .info-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;margin-top:20px}
    .info-card{background:rgba(255,255,255,.05);padding:15px;border-radius:10px;text-align:center}
    .info-card .label{font-size:12px;color:rgba(255,255,255,.6);margin-bottom:5px}
    .info-card .value{font-size:20px;font-weight:700;color:#F5B400}
    @media(max-width:768px){.container{padding:20px}h1{font-size:28px}.endpoint{flex-direction:column;align-items:flex-start}.method{margin-bottom:8px}}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🥤</div>
      <h1>ColdSync Pro</h1>
      <p class="subtitle">Cold Drink Agency Management System — API Backend</p>
      <span class="status">🟢 API Server Running</span>
    </div>
    <div class="note">
      <div class="note-title">🔒 Authentication Required</div>
      <p style="color:rgba(255,255,255,.8);font-size:14px">
        Most API endpoints require JWT authentication.<br>
        1. Login via frontend: <a href="http://localhost:3000/login" style="color:#F5B400">http://localhost:3000/login</a><br>
        2. Or POST /api/auth/login/ with credentials<br>
        3. Include JWT token in Authorization header
      </p>
    </div>
    <div class="section">
      <h2>📊 System Information</h2>
      <div class="info-grid">
        <div class="info-card"><div class="label">Framework</div><div class="value">Django</div></div>
        <div class="info-card"><div class="label">API Type</div><div class="value">REST</div></div>
        <div class="info-card"><div class="label">Auth</div><div class="value">JWT</div></div>
        <div class="info-card"><div class="label">Database</div><div class="value">SQLite</div></div>
      </div>
    </div>
    <div class="section">
      <h2>🔗 API Endpoints</h2>
      <div class="endpoints">
        <div class="endpoint"><span class="method post">POST</span><span class="path">/api/auth/login/</span><span class="lock">🔓 Public</span></div>
        <div class="endpoint"><span class="method post">POST</span><span class="path">/api/auth/refresh/</span><span class="lock">🔓 Public</span></div>
        <div class="endpoint"><span class="method get">GET</span><span class="path">/api/customers/</span><span class="lock">🔒 Auth</span></div>
        <div class="endpoint"><span class="method get">GET</span><span class="path">/api/products/</span><span class="lock">🔒 Auth</span></div>
        <div class="endpoint"><span class="method get">GET</span><span class="path">/api/inventory/</span><span class="lock">🔒 Auth</span></div>
        <div class="endpoint"><span class="method get">GET</span><span class="path">/api/orders/</span><span class="lock">🔒 Auth</span></div>
        <div class="endpoint"><span class="method get">GET</span><span class="path">/api/billing/</span><span class="lock">🔒 Auth</span></div>
        <div class="endpoint"><span class="method get">GET</span><span class="path">/api/analytics/</span><span class="lock">🔒 Auth</span></div>
        <div class="endpoint"><span class="method get">GET</span><span class="path">/api/reports/</span><span class="lock">🔒 Auth</span></div>
      </div>
    </div>
    <div class="section">
      <h2>🚀 Quick Links</h2>
      <div class="links">
        <a href="/admin/" class="btn">Admin Panel</a>
        <a href="http://localhost:3000/" class="btn btn-sec" target="_blank">Frontend App</a>
        <a href="/api/health/" class="btn btn-sec">Health Check</a>
      </div>
    </div>
    <div class="section" style="text-align:center;margin-top:40px;padding-top:20px;border-top:1px solid rgba(255,255,255,.1)">
      <p style="color:rgba(255,255,255,.6);font-size:14px">ColdSync Pro v2.0.0 — Backend API Server | Port 8000</p>
    </div>
  </div>
</body>
</html>"""


def home(request):
    return HttpResponse(_HOME_HTML)


def api_info(request):
    return JsonResponse({
        "name": "ColdSync Pro API",
        "version": "2.0.0",
        "status": "running",
        "framework": "Django REST Framework",
        "authentication": "JWT",
        "database": "SQLite",
        "frontend_url": "http://localhost:3000/",
        "admin_url": "/admin/",
    }, json_dumps_params={'indent': 2})


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({
        "status": "healthy",
        "message": "ColdSync Pro API is running",
        "version": "2.0.0",
        "database": "connected",
        "authentication": "JWT enabled",
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def contact_us(request):
    name    = request.data.get('name', '').strip()[:100]
    email   = request.data.get('email', '').strip()[:200]
    message = request.data.get('message', '').strip()[:2000]

    if not name or not email or not message:
        return Response({'error': 'Name, email and message are required.'}, status=400)

    # Basic email format check
    import re
    if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]{2,}$', email):
        return Response({'error': 'Enter a valid email address.'}, status=400)

    body = (
        f"New Contact Us message — ColdSync Pro\n\n"
        f"Name    : {name}\n"
        f"Email   : {email}\n"
        f"Message :\n{message}\n"
    )
    try:
        send_mail(
            subject=f"ColdSync Pro — Contact from {name}",
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[getattr(settings, 'ADMIN_EMAIL', 'shreeganeshagency1517@gmail.com')],
            fail_silently=False,
        )
        return Response({'success': True, 'message': 'Your message has been sent successfully!'})
    except Exception as e:
        return Response({'error': f'Failed to send email: {str(e)}'}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_stats(request):
    """Public endpoint — live agency stats for landing page."""
    from apps.orders.models import Order
    from apps.customers.models import Customer
    from apps.products.models import Product
    from django.db.models import Sum

    return Response({
        'total_orders':    Order.objects.count(),
        'total_customers': Customer.objects.count(),
        'total_products':  Product.objects.count(),
        'total_revenue':   float(Order.objects.aggregate(t=Sum('total_amount'))['t'] or 0),
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def test_notifications(request):
    """
    POST /api/test-notifications/
    Admin-only test endpoint to verify Email + WhatsApp are working.
    Body: { secret, test_email, test_phone }
    secret must match settings.SECRET_KEY first 8 chars (simple guard).
    """
    secret = request.data.get('secret', '')
    if secret != settings.SECRET_KEY[:8]:
        return Response({'error': 'Unauthorized'}, status=403)

    test_email = request.data.get('test_email', getattr(settings, 'ADMIN_EMAIL', ''))
    test_phone = request.data.get('test_phone', getattr(settings, 'AGENCY_WHATSAPP_NUMBER', ''))

    results = {}

    # Test Email
    try:
        send_mail(
            subject='✅ ColdSync Pro — Email Test',
            message='This is a test email from ColdSync Pro. Email is working correctly! 🎉',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[test_email],
            fail_silently=False,
        )
        results['email'] = {'status': 'sent', 'to': test_email}
    except Exception as e:
        results['email'] = {'status': 'failed', 'error': str(e)}

    # Test WhatsApp
    try:
        from apps.billing.notifications import _twilio_client, _send_whatsapp
        client = _twilio_client()
        if client and test_phone:
            sent = _send_whatsapp(client, test_phone, '✅ ColdSync Pro — WhatsApp test message. Working! 🎉')
            results['whatsapp'] = {'status': 'sent' if sent else 'failed', 'to': test_phone}
        else:
            results['whatsapp'] = {'status': 'skipped', 'reason': 'Twilio not configured or no phone'}
    except Exception as e:
        results['whatsapp'] = {'status': 'failed', 'error': str(e)}

    # Config status
    results['config'] = {
        'email_configured':     bool(getattr(settings, 'EMAIL_HOST_USER', '')),
        'twilio_configured':    bool(getattr(settings, 'TWILIO_ACCOUNT_SID', '')),
        'whatsapp_number_set':  bool(getattr(settings, 'AGENCY_WHATSAPP_NUMBER', '')),
        'groq_configured':      bool(getattr(settings, 'GROQ_API_KEY', '')),
        'debug_mode':           settings.DEBUG,
    }

    return Response(results)
