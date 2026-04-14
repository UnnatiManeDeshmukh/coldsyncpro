"""
Shree Ganesh Assistant — Advanced AI-Powered Chatbot Engine
Supports: English, Hindi, Marathi | Live DB queries | AI fallback via Groq
"""
import re
import os
from .language_utils import (
    detect_language, GREETINGS, FALLBACK, THANKS, BYE,
    HOW_TO_ORDER, HOW_TO_PAY, HOW_TO_TRACK, HELP_MENU,
)

# ── Agency Knowledge Base ─────────────────────────────────────────────────────

AGENCY_INFO = {
    'en': (
        "🏢 **Shree Ganesh Agency** — ColdSync Pro\n\n"
        "📍 Address  : Modnimb, Solapur District, Maharashtra - 413226\n"
        "📱 Phone    : +91 9822851017\n"
        "📧 Email    : contact@shreeganesha.com\n"
        "⏰ Hours    : Monday–Saturday, 9 AM – 7 PM\n\n"
        "Authorized cold drink distributor since 2010.\n"
        "Brands: Coca-Cola, Sprite, Fanta, Thums Up, Limca, Kinley, Pepsi, Mirinda, Maaza, Frooti, Sting"
    ),
    'hi': (
        "🏢 **श्री गणेश एजेंसी** — ColdSync Pro\n\n"
        "📍 पता     : 123 मेन स्ट्रीट, शहर, महाराष्ट्र\n"
        "📱 फोन    : +91 9822851017\n"
        "📧 ईमेल   : contact@shreeganesha.com\n"
        "⏰ समय    : सोमवार–शनिवार, सुबह 9 – शाम 7\n\n"
        "2010 से अधिकृत कोल्ड ड्रिंक वितरक।\n"
        "ब्रांड: Coca-Cola, Sprite, Fanta, Thums Up, Limca, Kinley, Pepsi, Mirinda, Maaza, Frooti, Sting"
    ),
    'mr': (
        "🏢 **श्री गणेश एजन्सी** — ColdSync Pro\n\n"
        "📍 पत्ता   : 123 मेन स्ट्रीट, शहर, महाराष्ट्र\n"
        "📱 फोन    : +91 9822851017\n"
        "📧 ईमेल   : contact@shreeganesha.com\n"
        "⏰ वेळ    : सोमवार–शनिवार, सकाळी 9 – संध्याकाळी 7\n\n"
        "2010 पासून अधिकृत कोल्ड ड्रिंक वितरक।\n"
        "ब्रँड: Coca-Cola, Sprite, Fanta, Thums Up, Limca, Kinley, Pepsi, Mirinda, Maaza, Frooti, Sting"
    ),
}

CONTACT_INFO = {
    'en': (
        "📞 **Contact Shree Ganesh Agency**\n\n"
        "• 📱 Phone: +91 9822851017\n"
        "• 📧 Email: contact@shreeganesha.com\n"
        "• 📍 Address: Modnimb, Solapur District, Maharashtra - 413226\n"
        "• ⏰ Hours: Monday–Saturday, 9 AM – 7 PM\n\n"
        "📝 Use the **Contact Form** on our homepage!"
    ),
    'hi': (
        "📞 **श्री गणेश एजेंसी से संपर्क करें**\n\n"
        "• 📱 फोन: +91 9822851017\n"
        "• 📧 ईमेल: contact@shreeganesha.com\n"
        "• 📍 पता: 123 मेन स्ट्रीट, शहर, महाराष्ट्र\n"
        "• ⏰ समय: सोमवार–शनिवार, सुबह 9 – शाम 7\n\n"
        "📝 होमपेज पर **Contact Form** का उपयोग करें!"
    ),
    'mr': (
        "📞 **श्री गणेश एजन्सीशी संपर्क करा**\n\n"
        "• 📱 फोन: +91 9822851017\n"
        "• 📧 ईमेल: contact@shreeganesha.com\n"
        "• 📍 पत्ता: 123 मेन स्ट्रीट, शहर, महाराष्ट्र\n"
        "• ⏰ वेळ: सोमवार–शनिवार, सकाळी 9 – संध्याकाळी 7\n\n"
        "📝 होमपेजवर **Contact Form** वापरा!"
    ),
}

# ── Keyword Pattern Maps (multilingual) ──────────────────────────────────────

PATTERNS = {
    'greeting':  r'\b(hi|hello|hey|namaste|namaskar|namaskaar|hy|helo|hii|sup|howdy|नमस्ते|नमस्कार|हेलो)\b',
    'about':     r'\b(about|agency|company|shree|ganesh|coldsync|cold sync|एजेंसी|एजन्सी|कंपनी|बद्दल|के बारे)\b',
    'products':  r'\b(product|products|drink|drinks|brand|brands|coca|sprite|fanta|thums|limca|kinley|pepsi|mirinda|maaza|frooti|sting|प्रोडक्ट|ड्रिंक|ब्रांड|ब्रँड)\b',
    'stock':     r'\b(stock|inventory|warehouse|godown|available|availability|स्टॉक|माल|सामान|उपलब्ध)\b',
    'order':     r'\b(order|place order|buy|purchase|cart|kharedi|ऑर्डर|खरेदी|खरीद)\b',
    'order_hist':r'\b(history|past|previous|recent|my order|हिस्ट्री|पिछले|मागील)\b',
    'track':     r'\b(track|tracking|status|where|kuth|kuthe|ट्रैक|ट्रॅक|स्टेटस|कुठे|कहाँ)\b',
    'payment':   r'\b(pay|payment|upi|due|pending|balance|paise|rupee|rupaye|baki|hisab|पेमेंट|पैसे|रुपये|बाकी|हिसाब)\b',
    'udhari':    r'\b(udhari|udhar|credit|due|उधारी|उधार|क्रेडिट)\b',
    'price':     r'\b(price|rate|cost|kitna|kimat|bhav|किमत|भाव|रेट|दर|किती)\b',
    'delivery':  r'\b(delivery|deliver|dispatch|driver|डिलीवरी|डिलिव्हरी|ड्राइवर)\b',
    'supplier':  r'\b(supplier|suppliers|vendor|purchase order|सप्लायर|विक्रेता)\b',
    'billing':   r'\b(billing|invoice|bill|बिलिंग|इनवॉइस|बिल)\b',
    'inventory': r'\b(inventory|stock|warehouse|godown|इन्वेंटरी|स्टॉक|गोदाम)\b',
    'report':    r'\b(report|reports|analytics|chart|graph|revenue|रिपोर्ट|विश्लेषण)\b',
    'contact':   r'\b(contact|support|help|phone|number|address|location|संपर्क|मदद|फोन|पता)\b',
    'language':  r'\b(language|bhasha|hindi|marathi|english|भाषा|हिंदी|मराठी)\b',
    'thanks':    r'\b(thanks|thank you|dhanyawad|dhanyavaad|ok|okay|great|accha|theek|thik|धन्यवाद|ठीक|बरं)\b',
    'help':      r'\b(help|menu|options|मदद|हेल्प|मेनू)\b',
    'bye':       r'\b(bye|goodbye|alvida|tata|see you|nirop|jato|अलविदा|निरोप|जातो)\b',
    'register':  r'\b(register|signup|sign up|new account|account bana|रजिस्टर|नोंदणी)\b',
    'login':     r'\b(login|sign in|signin|log in|लॉगिन)\b',
    'dashboard': r'\b(dashboard|डैशबोर्ड|डॅशबोर्ड)\b',
    'returns':   r'\b(return|returns|refund|wapas|परत|रिफंड)\b',
    'catalog':   r'\b(catalog|catalogue|browse|कैटलॉग|कॅटलॉग)\b',
    'website':   r'\b(website|site|pages|navigation|features|वेबसाइट|साइट)\b',
    'notification': r'\b(notification|alert|bell|नोटिफिकेशन|अलर्ट)\b',
    'settings':  r'\b(setting|settings|profile|config|सेटिंग|प्रोफाइल)\b',
}


# ── Live DB Helpers ───────────────────────────────────────────────────────────

def _get_live_products(lang='en'):
    try:
        from apps.products.models import Product
        from apps.inventory.models import Stock
        products = Product.objects.all()[:10]
        if not products:
            return None
        labels = {'en': ('Available Cold Drinks', 'bottle', 'crates', 'Out of stock', 'Browse full catalog'),
                  'hi': ('उपलब्ध कोल्ड ड्रिंक्स', 'बोतल', 'क्रेट', 'स्टॉक नहीं', 'पूरा कैटलॉग देखें'),
                  'mr': ('उपलब्ध कोल्ड ड्रिंक्स', 'बाटली', 'क्रेट', 'स्टॉक नाही', 'संपूर्ण कॅटलॉग पहा')}
        L = labels.get(lang, labels['en'])
        lines = [f"🥤 **{L[0]}:**\n"]
        for p in products:
            try:
                stocks = p.stocks.all()
                total_crates = sum(s.total_crates for s in stocks)
                total_bottles = sum(s.total_bottles for s in stocks)
                total = total_crates * p.crate_size + total_bottles
                stock_info = f"✅ {total_crates} {L[2]}" if total > 0 else f"❌ {L[3]}"
            except Exception:
                stock_info = "📦 —"
            lines.append(f"• **{p.product_name}** ({p.brand}) — ₹{p.rate_per_bottle}/{L[1]} — {stock_info}")
        lines.append(f"\n🛍️ {L[4]}: `/catalog`")
        return "\n".join(lines)
    except Exception:
        return None


def _get_live_prices(lang='en'):
    try:
        from apps.products.models import Product
        products = Product.objects.all()[:8]
        if not products:
            return None
        labels = {'en': ('Current Prices', 'bottle', 'Visit /catalog for full list'),
                  'hi': ('मौजूदा रेट', 'बोतल', 'पूरी सूची के लिए /catalog देखें'),
                  'mr': ('सध्याचे दर', 'बाटली', 'संपूर्ण यादीसाठी /catalog पहा')}
        L = labels.get(lang, labels['en'])
        lines = [f"💰 **{L[0]}:**\n"]
        for p in products:
            crate_total = float(p.rate_per_bottle) * p.crate_size
            lines.append(f"• {p.product_name} ({p.brand}) — ₹{p.rate_per_bottle}/{L[1]} | Crate ({p.crate_size}) = ₹{crate_total:,.0f}")
        lines.append(f"\n🛍️ {L[2]}")
        return "\n".join(lines)
    except Exception:
        return None


def _get_live_stock(lang='en'):
    try:
        from apps.inventory.models import Stock
        stocks = Stock.objects.select_related('product').all()[:8]
        if not stocks:
            return None
        labels = {'en': ('Current Stock Snapshot', 'crates', 'bottles'),
                  'hi': ('वर्तमान स्टॉक', 'क्रेट', 'बोतलें'),
                  'mr': ('सध्याचा स्टॉक', 'क्रेट', 'बाटल्या')}
        L = labels.get(lang, labels['en'])
        lines = [f"📦 **{L[0]}:**\n"]
        for s in stocks:
            lines.append(f"• {s.product.product_name} ({s.product.brand}) — {s.total_crates} {L[1]}, {s.total_bottles} {L[2]}")
        return "\n".join(lines)
    except Exception:
        return None


def _get_user_orders(user, lang='en'):
    try:
        from apps.orders.models import Order
        customer = user.customer_profile
        orders = Order.objects.filter(customer=customer).order_by('-order_date')[:5]
        if not orders:
            labels = {'en': 'No orders yet. Start shopping from your dashboard!',
                      'hi': 'अभी तक कोई ऑर्डर नहीं। डैशबोर्ड से शॉपिंग शुरू करें!',
                      'mr': 'अजून कोणताही ऑर्डर नाही. डॅशबोर्डवरून शॉपिंग सुरू करा!'}
            return labels.get(lang, labels['en'])
        labels = {'en': ('Your Last Orders', 'See full history'),
                  'hi': ('आपके पिछले ऑर्डर', 'पूरी हिस्ट्री देखें'),
                  'mr': ('तुमचे मागील ऑर्डर', 'संपूर्ण हिस्ट्री पहा')}
        L = labels.get(lang, labels['en'])
        lines = [f"📋 **{L[0]}:**\n"]
        for o in orders:
            lines.append(f"• Order #{o.id} — ₹{o.total_amount} — {o.delivery_status} — {o.order_date.strftime('%d %b %Y')}")
        lines.append(f"\n{L[1]}: `/customer-orders`")
        return "\n".join(lines)
    except Exception:
        return None


def _get_latest_order_status(user, lang='en'):
    try:
        from apps.orders.models import Order
        customer = user.customer_profile
        latest = Order.objects.filter(customer=customer).order_by('-order_date').first()
        if not latest:
            labels = {'en': 'No orders found yet. Place your first order from the dashboard!',
                      'hi': 'अभी तक कोई ऑर्डर नहीं। डैशबोर्ड से पहला ऑर्डर दें!',
                      'mr': 'अजून कोणताही ऑर्डर नाही. डॅशबोर्डवरून पहिला ऑर्डर द्या!'}
            return labels.get(lang, labels['en'])
        labels = {'en': ('Latest Order', 'Delivery', 'Payment', 'Amount', 'Date', 'Full tracking'),
                  'hi': ('नवीनतम ऑर्डर', 'डिलीवरी', 'पेमेंट', 'राशि', 'तारीख', 'पूरी ट्रैकिंग'),
                  'mr': ('नवीनतम ऑर्डर', 'डिलिव्हरी', 'पेमेंट', 'रक्कम', 'तारीख', 'संपूर्ण ट्रॅकिंग')}
        L = labels.get(lang, labels['en'])
        return (
            f"🚚 **{L[0]} #{latest.id}**\n\n"
            f"• {L[1]}: **{latest.delivery_status}**\n"
            f"• {L[2]}: {latest.payment_status}\n"
            f"• {L[3]}: ₹{latest.total_amount}\n"
            f"• {L[4]}: {latest.order_date.strftime('%d %b %Y')}\n\n"
            f"📍 {L[5]}: `/customer-orders`"
        )
    except Exception:
        return None


def _get_user_credit(user, lang='en'):
    try:
        customer = user.customer_profile
        labels = {'en': ('Your Account', 'Credit Limit', 'Check outstanding balance on your dashboard'),
                  'hi': ('आपका खाता', 'क्रेडिट लिमिट', 'डैशबोर्ड पर बकाया बैलेंस देखें'),
                  'mr': ('तुमचे खाते', 'क्रेडिट लिमिट', 'डॅशबोर्डवर थकबाकी बॅलन्स पहा')}
        L = labels.get(lang, labels['en'])
        return (
            f"💳 **{L[0]} — {customer.shop_name}**\n\n"
            f"• {L[1]}: ₹{customer.credit_limit:,.0f}\n"
            f"• {L[2]}\n\n"
            + HOW_TO_PAY[lang]
        )
    except Exception:
        return None


# ── AI Fallback via Groq (free, fast) ────────────────────────────────────────

SYSTEM_PROMPT = """You are "Shree Ganesh Assistant", the AI chatbot for Shree Ganesh Agency — a cold drink distribution agency in Maharashtra, India. You use ColdSync Pro management system.

Agency details:
- Name: Shree Ganesh Agency
- Products: Coca-Cola, Sprite, Fanta, Thums Up, Limca, Kinley, Pepsi, Mirinda, Maaza, Frooti, Sting
- Address: Modnimb, Solapur District, Maharashtra - 413226 | Phone: +91 9822851017
- Hours: Monday-Saturday, 9 AM - 7 PM

You ONLY help with: orders, products, stock, delivery, payments, billing, suppliers, reports, inventory, credits/udhari, and ColdSync Pro website features.

STRICT RULES:
1. CRITICAL: Always respond in the SAME language the user writes in (English/Hindi/Marathi)
2. If the user writes in Hindi, respond ONLY in Hindi. If Marathi, respond ONLY in Marathi.
3. Be friendly, professional, and concise. Use emojis appropriately.
4. Keep responses under 200 words.
5. STRICTLY REFUSE any question NOT related to this agency, its products, orders, payments, delivery, or ColdSync Pro features.
6. For off-topic questions (weather, news, general knowledge, coding, etc.), politely say you can only help with agency-related topics — in the user's language.
7. Never answer general knowledge, science, politics, entertainment, or any non-agency topic."""


def _ai_reply(message: str, lang: str, conversation_history: list = None) -> str:
    """
    Try Groq AI for intelligent response.
    - Retries once on transient errors (timeout/connection)
    - 8s timeout (up from 5s)
    - Strips markdown if response is too long
    - Returns None if unavailable so rule-based fallback kicks in
    """
    api_key = os.environ.get('GROQ_API_KEY', '')
    if not api_key:
        return None

    import urllib.request
    import urllib.error
    import json as _json

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if conversation_history:
        # Last 6 messages = 3 exchanges of context
        messages.extend(conversation_history[-6:])
    messages.append({"role": "user", "content": message})

    payload = _json.dumps({
        "model": "llama3-8b-8192",
        "messages": messages,
        "max_tokens": 350,
        "temperature": 0.65,
        "stop": None,
    }).encode('utf-8')

    def _call():
        req = urllib.request.Request(
            'https://api.groq.com/openai/v1/chat/completions',
            data=payload,
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json',
            },
            method='POST',
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = _json.loads(resp.read())
            return data['choices'][0]['message']['content'].strip()

    # Try once, retry once on timeout/connection error
    for attempt in range(2):
        try:
            reply = _call()
            # Trim if too long (> 600 chars) to keep chat readable
            if len(reply) > 600:
                reply = reply[:597] + '...'
            return reply
        except urllib.error.HTTPError as e:
            # 429 rate limit or 503 — don't retry, fall through to rule-based
            if e.code in (429, 503):
                break
            if attempt == 0:
                continue
        except (TimeoutError, OSError):
            if attempt == 0:
                continue
        except Exception:
            break

    return None


# ── Main Bot Reply Function ───────────────────────────────────────────────────

def get_bot_reply(message: str, user=None, conversation_history: list = None, lang_hint: str = None) -> str:
    """
    Main entry point. Detects language, matches intent, queries DB, falls back to AI.
    lang_hint: UI language code from frontend (en/hi/mr/es/fr/de/zh) — takes priority over auto-detection.
    """
    msg = message.strip()
    msg_lower = msg.lower()

    # Map unsupported codes to English
    _lang_map = {'es': 'en', 'fr': 'en', 'de': 'en', 'zh': 'en'}
    if lang_hint:
        base = lang_hint[:2]
        lang = _lang_map.get(base, base) if base not in ('en', 'hi', 'mr') else base
    else:
        lang = detect_language(msg)

    def match(pattern_key):
        return bool(re.search(PATTERNS[pattern_key], msg_lower, re.IGNORECASE))

    # ── Greetings ─────────────────────────────────────────────────────────────
    if match('greeting'):
        name = ''
        if user:
            name = f" {user.first_name or user.username}"
        return GREETINGS[lang](name)

    # ── Bye ───────────────────────────────────────────────────────────────────
    if match('bye'):
        return BYE[lang]

    # ── Thanks ────────────────────────────────────────────────────────────────
    if match('thanks'):
        return THANKS[lang]

    # ── Help ──────────────────────────────────────────────────────────────────
    if match('help'):
        return HELP_MENU[lang]

    # ── About Agency ──────────────────────────────────────────────────────────
    if match('about'):
        return AGENCY_INFO[lang]

    # ── Contact ───────────────────────────────────────────────────────────────
    if match('contact'):
        return CONTACT_INFO[lang]

    # ── Products / Brands ─────────────────────────────────────────────────────
    if match('products'):
        result = _get_live_products(lang)
        if result:
            return result
        brands = "Coca-Cola, Sprite, Fanta, Thums Up, Limca, Kinley, Pepsi, Mirinda, Maaza, Frooti, Sting"
        msgs = {
            'en': f"🥤 **Our Brands:**\n\n{brands}\n\nVisit `/catalog` or your **Customer Dashboard** for live prices & stock!",
            'hi': f"🥤 **हमारे ब्रांड:**\n\n{brands}\n\nलाइव कीमत और स्टॉक के लिए `/catalog` या **Customer Dashboard** देखें!",
            'mr': f"🥤 **आमचे ब्रँड:**\n\n{brands}\n\nलाइव किंमत आणि स्टॉकसाठी `/catalog` किंवा **Customer Dashboard** पहा!",
        }
        return msgs[lang]

    # ── Stock / Inventory ─────────────────────────────────────────────────────
    if match('stock') or match('inventory'):
        result = _get_live_stock(lang)
        msgs = {
            'en': "📦 Visit `/app/inventory` to see full warehouse-wise stock levels and low stock alerts.",
            'hi': "📦 पूरे वेयरहाउस-वाइज स्टॉक और लो स्टॉक अलर्ट के लिए `/app/inventory` देखें।",
            'mr': "📦 संपूर्ण वेअरहाउस-वाइज स्टॉक आणि लो स्टॉक अलर्टसाठी `/app/inventory` पहा।",
        }
        return (result + "\n\n" + msgs[lang]) if result else msgs[lang]

    # ── Price ─────────────────────────────────────────────────────────────────
    if match('price'):
        result = _get_live_prices(lang)
        if result:
            return result
        msgs = {
            'en': "💰 Visit `/catalog` or your **Customer Dashboard** to see current prices for all brands!",
            'hi': "💰 सभी ब्रांड की मौजूदा कीमतें देखने के लिए `/catalog` या **Customer Dashboard** पर जाएं!",
            'mr': "💰 सर्व ब्रँडच्या सध्याच्या किंमती पाहण्यासाठी `/catalog` किंवा **Customer Dashboard** वर जा!",
        }
        return msgs[lang]

    # ── Order History ─────────────────────────────────────────────────────────
    if match('order') and match('order_hist'):
        if user:
            result = _get_user_orders(user, lang)
            if result:
                return result
        msgs = {
            'en': "📋 Login and go to `/customer-orders` to see your full order history!",
            'hi': "📋 लॉगिन करें और अपनी पूरी ऑर्डर हिस्ट्री देखने के लिए `/customer-orders` पर जाएं!",
            'mr': "📋 लॉगिन करा आणि संपूर्ण ऑर्डर हिस्ट्रीसाठी `/customer-orders` वर जा!",
        }
        return msgs[lang]

    # ── Place Order ───────────────────────────────────────────────────────────
    if match('order'):
        return HOW_TO_ORDER[lang]

    # ── Track Delivery ────────────────────────────────────────────────────────
    if match('track') or match('delivery'):
        if user:
            result = _get_latest_order_status(user, lang)
            if result:
                return result
        return HOW_TO_TRACK[lang]

    # ── Payment / Udhari ──────────────────────────────────────────────────────
    if match('payment') or match('udhari'):
        if user:
            result = _get_user_credit(user, lang)
            if result:
                return result
        return HOW_TO_PAY[lang]

    # ── Billing ───────────────────────────────────────────────────────────────
    if match('billing'):
        msgs = {
            'en': "🧾 **Billing** — `/app/billing`\n\n• Generate & download PDF invoices\n• Record payments\n• UPI payment configuration\n• View billing summary",
            'hi': "🧾 **बिलिंग** — `/app/billing`\n\n• PDF इनवॉइस बनाएं और डाउनलोड करें\n• पेमेंट रिकॉर्ड करें\n• UPI पेमेंट कॉन्फिग\n• बिलिंग सारांश देखें",
            'mr': "🧾 **बिलिंग** — `/app/billing`\n\n• PDF इनवॉइस तयार करा आणि डाउनलोड करा\n• पेमेंट रेकॉर्ड करा\n• UPI पेमेंट कॉन्फिग\n• बिलिंग सारांश पहा",
        }
        return msgs[lang]

    # ── Supplier ──────────────────────────────────────────────────────────────
    if match('supplier'):
        try:
            from apps.suppliers.models import Supplier
            suppliers = Supplier.objects.all()[:5]
            if suppliers:
                labels = {'en': 'Our Suppliers', 'hi': 'हमारे सप्लायर', 'mr': 'आमचे सप्लायर'}
                lines = [f"🏗️ **{labels.get(lang, 'Our Suppliers')}:**\n"]
                for s in suppliers:
                    lines.append(f"• {s.name} — 📱 {s.phone}")
                lines.append("\nManage at `/app/suppliers`")
                return "\n".join(lines)
        except Exception:
            pass
        msgs = {
            'en': "🏗️ **Suppliers** — `/app/suppliers`\n\n• Manage supplier database\n• Create & track purchase orders\n• Auto stock update on receipt",
            'hi': "🏗️ **सप्लायर** — `/app/suppliers`\n\n• सप्लायर डेटाबेस मैनेज करें\n• परचेज ऑर्डर बनाएं और ट्रैक करें\n• रसीद पर ऑटो स्टॉक अपडेट",
            'mr': "🏗️ **सप्लायर** — `/app/suppliers`\n\n• सप्लायर डेटाबेस मॅनेज करा\n• परचेज ऑर्डर तयार करा आणि ट्रॅक करा\n• पावतीवर ऑटो स्टॉक अपडेट",
        }
        return msgs[lang]

    # ── Reports ───────────────────────────────────────────────────────────────
    if match('report'):
        msgs = {
            'en': "📊 **Reports** — `/app/reports`\n\n• Monthly revenue chart\n• Orders per month\n• Top products by revenue\n• Low stock alerts\n• Top customers\n• Download PDF & Excel\n• Filter by 7 / 30 / 90 days",
            'hi': "📊 **रिपोर्ट** — `/app/reports`\n\n• मासिक राजस्व चार्ट\n• प्रति माह ऑर्डर\n• टॉप प्रोडक्ट\n• लो स्टॉक अलर्ट\n• टॉप कस्टमर\n• PDF और Excel डाउनलोड",
            'mr': "📊 **रिपोर्ट** — `/app/reports`\n\n• मासिक महसूल चार्ट\n• प्रति महिना ऑर्डर\n• टॉप प्रोडक्ट\n• लो स्टॉक अलर्ट\n• टॉप कस्टमर\n• PDF आणि Excel डाउनलोड",
        }
        return msgs[lang]

    # ── Returns ───────────────────────────────────────────────────────────────
    if match('returns'):
        msgs = {
            'en': "↩️ **Returns** — `/app/returns`\n\n• Manage product returns\n• Track return reasons & status\n• Refund processing",
            'hi': "↩️ **रिटर्न** — `/app/returns`\n\n• प्रोडक्ट रिटर्न मैनेज करें\n• रिटर्न कारण और स्टेटस ट्रैक करें\n• रिफंड प्रोसेसिंग",
            'mr': "↩️ **रिटर्न** — `/app/returns`\n\n• प्रोडक्ट रिटर्न मॅनेज करा\n• रिटर्न कारण आणि स्टेटस ट्रॅक करा\n• रिफंड प्रोसेसिंग",
        }
        return msgs[lang]

    # ── Dashboard ─────────────────────────────────────────────────────────────
    if match('dashboard'):
        msgs = {
            'en': "📊 **Dashboards:**\n\n👤 **Customer Dashboard** (`/customer-dashboard`)\n• Browse products, place orders, pay dues, track delivery\n\n📈 **Admin Dashboard** (`/app/dashboard`)\n• Revenue overview, charts, top customers, low stock alerts",
            'hi': "📊 **डैशबोर्ड:**\n\n👤 **Customer Dashboard** (`/customer-dashboard`)\n• प्रोडक्ट ब्राउज करें, ऑर्डर दें, बकाया चुकाएं, डिलीवरी ट्रैक करें\n\n📈 **Admin Dashboard** (`/app/dashboard`)\n• राजस्व अवलोकन, चार्ट, टॉप कस्टमर, लो स्टॉक अलर्ट",
            'mr': "📊 **डॅशबोर्ड:**\n\n👤 **Customer Dashboard** (`/customer-dashboard`)\n• प्रोडक्ट ब्राउज करा, ऑर्डर द्या, थकबाकी भरा, डिलिव्हरी ट्रॅक करा\n\n📈 **Admin Dashboard** (`/app/dashboard`)\n• महसूल आढावा, चार्ट, टॉप कस्टमर, लो स्टॉक अलर्ट",
        }
        return msgs[lang]

    # ── Login ─────────────────────────────────────────────────────────────────
    if match('login'):
        msgs = {
            'en': "🔐 **Login** — `/login`\n\nEnter your username & password to access your dashboard.\nNew user? Register at `/register`",
            'hi': "🔐 **लॉगिन** — `/login`\n\nअपने डैशबोर्ड तक पहुंचने के लिए username और password डालें।\nनए यूजर? `/register` पर रजिस्टर करें",
            'mr': "🔐 **लॉगिन** — `/login`\n\nतुमच्या डॅशबोर्डमध्ये प्रवेश करण्यासाठी username आणि password टाका।\nनवीन वापरकर्ता? `/register` वर नोंदणी करा",
        }
        return msgs[lang]

    # ── Register ──────────────────────────────────────────────────────────────
    if match('register'):
        msgs = {
            'en': "📝 **Register** — `/register`\n\n1. Enter shop name, owner name, phone, address\n2. Create username & password\n3. Submit — start ordering immediately! ✅",
            'hi': "📝 **रजिस्टर** — `/register`\n\n1. दुकान का नाम, मालिक का नाम, फोन, पता डालें\n2. username और password बनाएं\n3. सबमिट करें — तुरंत ऑर्डर शुरू करें! ✅",
            'mr': "📝 **नोंदणी** — `/register`\n\n1. दुकानाचे नाव, मालकाचे नाव, फोन, पत्ता टाका\n2. username आणि password तयार करा\n3. सबमिट करा — लगेच ऑर्डर सुरू करा! ✅",
        }
        return msgs[lang]

    # ── Language ──────────────────────────────────────────────────────────────
    if match('language'):
        msgs = {
            'en': "🌐 **Multi-Language Support**\n\nColdSync Pro supports 7 languages:\n🇬🇧 English | 🇮🇳 Hindi | 🇮🇳 Marathi | 🇪🇸 Spanish | 🇫🇷 French | 🇩🇪 German | 🇨🇳 Chinese\n\nClick the 🌐 **Globe icon** in the top navigation to switch!",
            'hi': "🌐 **बहु-भाषा समर्थन**\n\nColdSync Pro 7 भाषाओं को सपोर्ट करता है:\n🇬🇧 English | 🇮🇳 Hindi | 🇮🇳 Marathi | 🇪🇸 Spanish | 🇫🇷 French | 🇩🇪 German | 🇨🇳 Chinese\n\nस्विच करने के लिए टॉप नेविगेशन में 🌐 **Globe icon** क्लिक करें!",
            'mr': "🌐 **बहु-भाषा समर्थन**\n\nColdSync Pro 7 भाषांना समर्थन देते:\n🇬🇧 English | 🇮🇳 Hindi | 🇮🇳 Marathi | 🇪🇸 Spanish | 🇫🇷 French | 🇩🇪 German | 🇨🇳 Chinese\n\nस्विच करण्यासाठी टॉप नेव्हिगेशनमध्ये 🌐 **Globe icon** क्लिक करा!",
        }
        return msgs[lang]

    # ── Website overview ──────────────────────────────────────────────────────
    if match('website'):
        msgs = {
            'en': (
                "🌐 **ColdSync Pro — Website Overview**\n\n"
                "**Public:** Homepage | Login `/login` | Register `/register` | Catalog `/catalog`\n\n"
                "**Customer Portal:** Dashboard `/customer-dashboard` | My Orders `/customer-orders` | Payment History `/payment-history`\n\n"
                "**Admin Panel (`/app/...`):** Dashboard | Customers | Products | Inventory | Orders | Delivery | Suppliers | Returns | Billing | Credits | Reports | Settings"
            ),
            'hi': (
                "🌐 **ColdSync Pro — वेबसाइट अवलोकन**\n\n"
                "**पब्लिक:** होमपेज | लॉगिन `/login` | रजिस्टर `/register` | कैटलॉग `/catalog`\n\n"
                "**Customer Portal:** डैशबोर्ड | My Orders | Payment History\n\n"
                "**Admin Panel:** डैशबोर्ड | कस्टमर | प्रोडक्ट | इन्वेंटरी | ऑर्डर | डिलीवरी | सप्लायर | रिटर्न | बिलिंग | क्रेडिट | रिपोर्ट"
            ),
            'mr': (
                "🌐 **ColdSync Pro — वेबसाइट आढावा**\n\n"
                "**पब्लिक:** होमपेज | लॉगिन `/login` | नोंदणी `/register` | कॅटलॉग `/catalog`\n\n"
                "**Customer Portal:** डॅशबोर्ड | My Orders | Payment History\n\n"
                "**Admin Panel:** डॅशबोर्ड | कस्टमर | प्रोडक्ट | इन्व्हेंटरी | ऑर्डर | डिलिव्हरी | सप्लायर | रिटर्न | बिलिंग | क्रेडिट | रिपोर्ट"
            ),
        }
        return msgs[lang]

    # ── Notification ──────────────────────────────────────────────────────────
    if match('notification'):
        msgs = {
            'en': "🔔 **Notifications** — Real-time alerts in the top bar for:\n• Low stock warnings\n• New order alerts\n• Payment received\n• Delivery updates\n\nClick the bell 🔔 icon to view and mark as read.",
            'hi': "🔔 **नोटिफिकेशन** — टॉप बार में रियल-टाइम अलर्ट:\n• लो स्टॉक चेतावनी\n• नए ऑर्डर अलर्ट\n• पेमेंट प्राप्त\n• डिलीवरी अपडेट\n\nदेखने के लिए 🔔 बेल आइकन क्लिक करें।",
            'mr': "🔔 **नोटिफिकेशन** — टॉप बारमध्ये रियल-टाइम अलर्ट:\n• लो स्टॉक इशारा\n• नवीन ऑर्डर अलर्ट\n• पेमेंट प्राप्त\n• डिलिव्हरी अपडेट\n\nपाहण्यासाठी 🔔 बेल आयकॉन क्लिक करा।",
        }
        return msgs[lang]

    # ── Settings ──────────────────────────────────────────────────────────────
    if match('settings'):
        msgs = {
            'en': "⚙️ **Settings** — `/app/settings`\n\n• Agency profile\n• UPI payment configuration\n• User preferences",
            'hi': "⚙️ **सेटिंग** — `/app/settings`\n\n• एजेंसी प्रोफाइल\n• UPI पेमेंट कॉन्फिगरेशन\n• यूजर प्रेफरेंस",
            'mr': "⚙️ **सेटिंग** — `/app/settings`\n\n• एजन्सी प्रोफाइल\n• UPI पेमेंट कॉन्फिगरेशन\n• वापरकर्ता प्राधान्ये",
        }
        return msgs[lang]

    # ── Catalog ───────────────────────────────────────────────────────────────
    if match('catalog'):
        msgs = {
            'en': "🛍️ **Product Catalog** — `/catalog`\n\nBrowse all available cold drinks, filter by brand, see prices & bottle sizes, and add to order directly!",
            'hi': "🛍️ **प्रोडक्ट कैटलॉग** — `/catalog`\n\nसभी उपलब्ध कोल्ड ड्रिंक्स ब्राउज करें, ब्रांड से फिल्टर करें, कीमत और बोतल साइज देखें!",
            'mr': "🛍️ **प्रोडक्ट कॅटलॉग** — `/catalog`\n\nसर्व उपलब्ध कोल्ड ड्रिंक्स ब्राउज करा, ब्रँडनुसार फिल्टर करा, किंमत आणि बाटली साइज पहा!",
        }
        return msgs[lang]

    # ── Off-topic guard (before AI) ──────────────────────────────────────────
    # Strictly allow only agency/website related queries
    website_keywords = (
        r'\b(order|orders|product|products|drink|drinks|stock|price|prices|rate|pay|payment|'
        r'delivery|deliver|track|tracking|credit|udhari|agency|shree|ganesh|coldsync|brand|brands|'
        r'invoice|billing|bill|report|reports|supplier|suppliers|inventory|catalog|catalogue|'
        r'register|login|dashboard|return|returns|offer|offers|notification|help|contact|about|'
        r'ऑर्डर|प्रोडक्ट|ड्रिंक|स्टॉक|किमत|भाव|पेमेंट|डिलिव्हरी|ट्रॅक|क्रेडिट|उधारी|'
        r'एजन्सी|ब्रँड|बिलिंग|रिपोर्ट|इन्व्हेंटरी|कॅटलॉग|नोंदणी|लॉगिन|डॅशबोर्ड|परत|ऑफर|'
        r'ऑर्डर|प्रोडक्ट|ड्रिंक|स्टॉक|कीमत|भाव|पेमेंट|डिलीवरी|ट्रैक|क्रेडिट|उधारी|'
        r'एजेंसी|ब्रांड|बिलिंग|रिपोर्ट|इन्वेंटरी|कैटलॉग|रजिस्टर|लॉगिन|डैशबोर्ड|वापसी|ऑफर)\b'
    )
    if not re.search(website_keywords, msg_lower, re.IGNORECASE):
        off_topic = {
            'en': (
                "🙏 I can only answer questions about **Shree Ganesh Agency** and ColdSync Pro — "
                "such as products, orders, payments, delivery, stock, billing, and website features.\n\n"
                "Please ask something related to our services!"
            ),
            'hi': (
                "🙏 मैं केवल **श्री गणेश एजेंसी** और ColdSync Pro से संबंधित प्रश्नों में मदद कर सकता हूँ — "
                "जैसे प्रोडक्ट, ऑर्डर, पेमेंट, डिलीवरी, स्टॉक, बिलिंग।\n\n"
                "कृपया हमारी सेवाओं से संबंधित कुछ पूछें!"
            ),
            'mr': (
                "🙏 मी फक्त **श्री गणेश एजन्सी** आणि ColdSync Pro शी संबंधित प्रश्नांमध्ये मदत करू शकतो — "
                "जसे प्रोडक्ट, ऑर्डर, पेमेंट, डिलिव्हरी, स्टॉक, बिलिंग.\n\n"
                "कृपया आमच्या सेवांशी संबंधित काहीतरी विचारा!"
            ),
        }
        return off_topic.get(lang, off_topic['en'])

    # ── AI Fallback ───────────────────────────────────────────────────────────
    ai_response = _ai_reply(msg, lang_hint or lang, conversation_history)
    if ai_response:
        return ai_response

    # ── Rule-based Fallback ───────────────────────────────────────────────────
    return FALLBACK[lang]