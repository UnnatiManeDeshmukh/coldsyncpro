"""
Multi-language detection and response utilities for Shree Ganesh Assistant.
Supports: English, Hindi, Marathi
"""

import re

# ── Language Detection Patterns ───────────────────────────────────────────────

HINDI_PATTERNS = [
    r'[\u0900-\u097F]',          # Devanagari Unicode block (covers Hindi & Marathi)
    r'\b(kya|hai|hain|kaise|karo|karta|karte|mujhe|mera|meri|aap|tum|hum|yeh|woh|nahi|nahin|accha|theek|bolo|batao|chahiye|milega|kitna|kab|kahan|kyun|kaun|kuch|sab|bahut|zyada|kam|abhi|kal|aaj|order|dena|lena|paisa|rupee|rupaye|udhar|udhari|stock|maal|saman)\b',
]

MARATHI_PATTERNS = [
    r'\b(kay|aahe|ahe|nahi|naahi|kasa|kashi|kase|mala|mazha|mazhi|tumhi|amhi|he|te|nako|hove|milel|kiti|keva|kuthe|ka|kon|kahi|sagla|khup|jast|kami|aata|udya|aaj|order|dya|ghya|paisa|rupaye|udhari|stock|maal|saman|sangaa|sanga|bola|kara|karta|karte|aahe|ahe|asel|aseel|hoil|hoeel)\b',
    r'\b(namaskaar|namaskar|dhanyavaad|dhanyawad|shukriya|bara|bara aahe|thik aahe)\b',
]

ENGLISH_PATTERNS = [
    r'\b(the|is|are|was|were|have|has|had|will|would|can|could|should|may|might|do|does|did|what|how|when|where|why|who|which|this|that|these|those|and|or|but|if|then|because|so|also|just|very|more|most|some|any|all|no|not|yes|please|thank|hello|hi|hey|bye|good|great|help|need|want|get|give|show|tell|know|see|look|find|check|order|product|stock|price|delivery|payment|customer|supplier|report|invoice|billing)\b',
]


def detect_language(text: str) -> str:
    """
    Detect language from text.
    Returns: 'hi' (Hindi), 'mr' (Marathi), 'en' (English)
    """
    text_lower = text.lower()

    # Check for Devanagari script first (both Hindi and Marathi use it)
    if re.search(r'[\u0900-\u097F]', text):
        # Distinguish Marathi vs Hindi by specific words
        marathi_specific = re.search(
            r'\b(aahe|ahe|kasa|kashi|kase|mala|mazha|mazhi|tumhi|amhi|milel|kiti|keva|kuthe|sangaa|sanga|bola|kara|naahi|nako|hove|asel|hoil|hoeel|bara aahe|thik aahe)\b',
            text_lower
        )
        if marathi_specific:
            return 'mr'
        return 'hi'

    # Check romanized Hindi/Marathi
    marathi_score = sum(1 for p in MARATHI_PATTERNS if re.search(p, text_lower))
    hindi_score = sum(1 for p in HINDI_PATTERNS if re.search(p, text_lower))
    english_score = sum(1 for p in ENGLISH_PATTERNS if re.search(p, text_lower))

    if marathi_score > english_score and marathi_score >= hindi_score:
        return 'mr'
    if hindi_score > english_score:
        return 'hi'
    return 'en'


# ── Greeting Templates ────────────────────────────────────────────────────────

GREETINGS = {
    'en': lambda name: (
        f"🙏 Namaste{name}! Welcome to **Shree Ganesh Agency**.\n\n"
        "I'm **Shree Ganesh Assistant** — your ColdSync Pro guide!\n\n"
        "I can help you with:\n"
        "• 🛒 Placing orders\n"
        "• 📦 Products & stock availability\n"
        "• 💳 Payments & credit (udhari)\n"
        "• 🚚 Delivery tracking\n"
        "• 📊 Reports & admin features\n"
        "• 🏢 Agency information\n\n"
        "Type **help** to see all topics, or just ask me anything! 😊"
    ),
    'hi': lambda name: (
        f"🙏 नमस्ते{name}! **श्री गणेश एजेंसी** में आपका स्वागत है।\n\n"
        "मैं **श्री गणेश असिस्टेंट** हूँ — आपका ColdSync Pro गाइड!\n\n"
        "मैं इनमें मदद कर सकता हूँ:\n"
        "• 🛒 ऑर्डर देना\n"
        "• 📦 प्रोडक्ट और स्टॉक\n"
        "• 💳 पेमेंट और उधारी\n"
        "• 🚚 डिलीवरी ट्रैकिंग\n"
        "• 📊 रिपोर्ट और एडमिन\n\n"
        "**help** टाइप करें या कुछ भी पूछें! 😊"
    ),
    'mr': lambda name: (
        f"🙏 नमस्कार{name}! **श्री गणेश एजन्सी**मध्ये आपले स्वागत आहे।\n\n"
        "मी **श्री गणेश असिस्टंट** आहे — तुमचा ColdSync Pro मार्गदर्शक!\n\n"
        "मी यामध्ये मदत करू शकतो:\n"
        "• 🛒 ऑर्डर देणे\n"
        "• 📦 प्रोडक्ट आणि स्टॉक\n"
        "• 💳 पेमेंट आणि उधारी\n"
        "• 🚚 डिलिव्हरी ट्रॅकिंग\n"
        "• 📊 रिपोर्ट आणि अॅडमिन\n\n"
        "**help** टाइप करा किंवा काहीही विचारा! 😊"
    ),
}

FALLBACK = {
    'en': (
        "🤔 I didn't quite understand that. Here's what I can help with:\n\n"
        "• **products** — available drinks & stock\n"
        "• **order** — how to place an order\n"
        "• **track** — delivery status\n"
        "• **payment** — pay via UPI\n"
        "• **price** — current rates\n"
        "• **about** — about Shree Ganesh Agency\n"
        "• **contact** — reach our team\n"
        "• **help** — full topic list\n\n"
        "Or visit your **dashboard** for full access! 🚀"
    ),
    'hi': (
        "🤔 मुझे समझ नहीं आया। मैं इनमें मदद कर सकता हूँ:\n\n"
        "• **products** — उपलब्ध ड्रिंक्स और स्टॉक\n"
        "• **order** — ऑर्डर कैसे दें\n"
        "• **track** — डिलीवरी स्टेटस\n"
        "• **payment** — UPI से पेमेंट\n"
        "• **price** — मौजूदा रेट\n"
        "• **about** — एजेंसी के बारे में\n"
        "• **contact** — हमसे संपर्क करें\n"
        "• **help** — सभी विषयों की सूची\n\n"
        "या अपने **डैशबोर्ड** पर जाएं! 🚀"
    ),
    'mr': (
        "🤔 मला नीट समजले नाही. मी यामध्ये मदत करू शकतो:\n\n"
        "• **products** — उपलब्ध ड्रिंक्स आणि स्टॉक\n"
        "• **order** — ऑर्डर कसा द्यायचा\n"
        "• **track** — डिलिव्हरी स्टेटस\n"
        "• **payment** — UPI ने पेमेंट\n"
        "• **price** — सध्याचे दर\n"
        "• **about** — एजन्सीबद्दल\n"
        "• **contact** — आमच्याशी संपर्क करा\n"
        "• **help** — सर्व विषयांची यादी\n\n"
        "किंवा तुमच्या **डॅशबोर्ड**वर जा! 🚀"
    ),
}

THANKS = {
    'en': "😊 You're welcome! Anything else I can help you with?\n\nType **help** to see all topics! 🚀",
    'hi': "😊 आपका स्वागत है! क्या मैं और कुछ मदद कर सकता हूँ?\n\nसभी विषयों के लिए **help** टाइप करें! 🚀",
    'mr': "😊 आपले स्वागत आहे! आणखी काही मदत हवी आहे का?\n\nसर्व विषयांसाठी **help** टाइप करा! 🚀",
}

BYE = {
    'en': "👋 Goodbye! Have a great day.\n\nVisit **Shree Ganesh Agency** again anytime! 🥤🙏",
    'hi': "👋 अलविदा! आपका दिन शुभ हो।\n\n**श्री गणेश एजेंसी** पर फिर से आएं! 🥤🙏",
    'mr': "👋 निरोप! तुमचा दिवस चांगला जाओ।\n\n**श्री गणेश एजन्सी**ला पुन्हा भेट द्या! 🥤🙏",
}

HOW_TO_ORDER = {
    'en': (
        "🛒 **How to Place an Order:**\n\n"
        "1. Login at `/login` with your credentials\n"
        "2. Go to **Customer Dashboard** (`/customer-dashboard`)\n"
        "3. Browse **Available Cold Drinks** section\n"
        "4. Select product → enter quantity → click **Add to Order**\n"
        "5. Review your cart in **Order Summary** panel\n"
        "6. Click **Place Order** ✅\n\n"
        "📱 Browse full catalog at `/catalog`"
    ),
    'hi': (
        "🛒 **ऑर्डर कैसे दें:**\n\n"
        "1. `/login` पर अपने credentials से लॉगिन करें\n"
        "2. **Customer Dashboard** (`/customer-dashboard`) पर जाएं\n"
        "3. **Available Cold Drinks** सेक्शन में ब्राउज़ करें\n"
        "4. प्रोडक्ट चुनें → मात्रा डालें → **Add to Order** क्लिक करें\n"
        "5. **Order Summary** पैनल में कार्ट देखें\n"
        "6. **Place Order** क्लिक करें ✅\n\n"
        "📱 पूरा कैटलॉग `/catalog` पर देखें"
    ),
    'mr': (
        "🛒 **ऑर्डर कसा द्यायचा:**\n\n"
        "1. `/login` वर तुमच्या credentials ने लॉगिन करा\n"
        "2. **Customer Dashboard** (`/customer-dashboard`) वर जा\n"
        "3. **Available Cold Drinks** विभागात ब्राउज करा\n"
        "4. प्रोडक्ट निवडा → प्रमाण टाका → **Add to Order** क्लिक करा\n"
        "5. **Order Summary** पॅनेलमध्ये कार्ट पहा\n"
        "6. **Place Order** क्लिक करा ✅\n\n"
        "📱 संपूर्ण कॅटलॉग `/catalog` वर पहा"
    ),
}

HOW_TO_PAY = {
    'en': (
        "💳 **How to Make a Payment:**\n\n"
        "1. Go to **Customer Dashboard** (`/customer-dashboard`)\n"
        "2. Click **Pay Now** button\n"
        "3. Scan the **UPI QR Code** shown\n"
        "4. Complete payment on GPay / PhonePe / Paytm\n"
        "5. Enter the **UTR/Transaction number**\n"
        "6. Click **Confirm Payment** ✅\n\n"
        "📋 View payment history at `/payment-history`"
    ),
    'hi': (
        "💳 **पेमेंट कैसे करें:**\n\n"
        "1. **Customer Dashboard** (`/customer-dashboard`) पर जाएं\n"
        "2. **Pay Now** बटन क्लिक करें\n"
        "3. दिखाया गया **UPI QR Code** स्कैन करें\n"
        "4. GPay / PhonePe / Paytm पर पेमेंट पूरा करें\n"
        "5. **UTR/Transaction नंबर** डालें\n"
        "6. **Confirm Payment** क्लिक करें ✅\n\n"
        "📋 पेमेंट हिस्ट्री `/payment-history` पर देखें"
    ),
    'mr': (
        "💳 **पेमेंट कसे करायचे:**\n\n"
        "1. **Customer Dashboard** (`/customer-dashboard`) वर जा\n"
        "2. **Pay Now** बटण क्लिक करा\n"
        "3. दाखवलेला **UPI QR Code** स्कॅन करा\n"
        "4. GPay / PhonePe / Paytm वर पेमेंट पूर्ण करा\n"
        "5. **UTR/Transaction नंबर** टाका\n"
        "6. **Confirm Payment** क्लिक करा ✅\n\n"
        "📋 पेमेंट हिस्ट्री `/payment-history` वर पहा"
    ),
}

HOW_TO_TRACK = {
    'en': (
        "🚚 **How to Track Your Order:**\n\n"
        "1. Login and go to **Customer Dashboard**\n"
        "2. Check **Recent Orders** section for latest status\n"
        "3. Go to **My Orders** (`/customer-orders`) for full history\n\n"
        "**Delivery Statuses:**\n"
        "📋 Order Placed → ⚙️ Processing → 🚚 Out for Delivery → ✅ Delivered"
    ),
    'hi': (
        "🚚 **ऑर्डर ट्रैक कैसे करें:**\n\n"
        "1. लॉगिन करें और **Customer Dashboard** पर जाएं\n"
        "2. **Recent Orders** सेक्शन में लेटेस्ट स्टेटस देखें\n"
        "3. पूरी हिस्ट्री के लिए **My Orders** (`/customer-orders`) पर जाएं\n\n"
        "**डिलीवरी स्टेटस:**\n"
        "📋 ऑर्डर दिया → ⚙️ प्रोसेसिंग → 🚚 डिलीवरी पर → ✅ डिलीवर हुआ"
    ),
    'mr': (
        "🚚 **ऑर्डर ट्रॅक कसा करायचा:**\n\n"
        "1. लॉगिन करा आणि **Customer Dashboard** वर जा\n"
        "2. **Recent Orders** विभागात नवीनतम स्टेटस पहा\n"
        "3. संपूर्ण हिस्ट्रीसाठी **My Orders** (`/customer-orders`) वर जा\n\n"
        "**डिलिव्हरी स्टेटस:**\n"
        "📋 ऑर्डर दिला → ⚙️ प्रोसेसिंग → 🚚 डिलिव्हरीवर → ✅ डिलिव्हर झाला"
    ),
}

HELP_MENU = {
    'en': (
        "🤖 **Shree Ganesh Assistant — Help Menu:**\n\n"
        "🏢 **Agency**\n"
        "• `about` — About Shree Ganesh Agency\n"
        "• `contact` — Phone, email, address\n\n"
        "🛒 **Shopping**\n"
        "• `products` — Available drinks & stock\n"
        "• `price` — Current rates\n"
        "• `order` — How to place an order\n"
        "• `catalog` — Browse all products\n\n"
        "📦 **Orders & Delivery**\n"
        "• `track` — Track your delivery\n"
        "• `my orders` — Order history\n\n"
        "💳 **Payments**\n"
        "• `payment` — How to pay via UPI\n"
        "• `udhari` — Credit/due balance\n\n"
        "🌐 **Website**\n"
        "• `dashboard` — Dashboard info\n"
        "• `reports` — Reports & analytics\n"
        "• `inventory` — Stock management\n"
        "• `billing` — Invoices & billing\n"
        "• `suppliers` — Supplier management\n\n"
        "Just type any keyword above! 👆"
    ),
    'hi': (
        "🤖 **श्री गणेश असिस्टेंट — हेल्प मेनू:**\n\n"
        "🏢 **एजेंसी**\n"
        "• `about` — एजेंसी के बारे में\n"
        "• `contact` — फोन, ईमेल, पता\n\n"
        "🛒 **शॉपिंग**\n"
        "• `products` — उपलब्ध ड्रिंक्स और स्टॉक\n"
        "• `price` — मौजूदा रेट\n"
        "• `order` — ऑर्डर कैसे दें\n\n"
        "📦 **ऑर्डर और डिलीवरी**\n"
        "• `track` — डिलीवरी ट्रैक करें\n"
        "• `my orders` — ऑर्डर हिस्ट्री\n\n"
        "💳 **पेमेंट**\n"
        "• `payment` — UPI से पेमेंट\n"
        "• `udhari` — उधारी बैलेंस\n\n"
        "ऊपर कोई भी keyword टाइप करें! 👆"
    ),
    'mr': (
        "🤖 **श्री गणेश असिस्टंट — हेल्प मेनू:**\n\n"
        "🏢 **एजन्सी**\n"
        "• `about` — एजन्सीबद्दल\n"
        "• `contact` — फोन, ईमेल, पत्ता\n\n"
        "🛒 **शॉपिंग**\n"
        "• `products` — उपलब्ध ड्रिंक्स आणि स्टॉक\n"
        "• `price` — सध्याचे दर\n"
        "• `order` — ऑर्डर कसा द्यायचा\n\n"
        "📦 **ऑर्डर आणि डिलिव्हरी**\n"
        "• `track` — डिलिव्हरी ट्रॅक करा\n"
        "• `my orders` — ऑर्डर हिस्ट्री\n\n"
        "💳 **पेमेंट**\n"
        "• `payment` — UPI ने पेमेंट\n"
        "• `udhari` — उधारी बॅलन्स\n\n"
        "वरील कोणताही keyword टाइप करा! 👆"
    ),
}
