from pathlib import Path
from datetime import timedelta
import os
from decouple import config, Csv

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY', default='django-insecure-coldsync-pro-secret-key-change-in-production')
DEBUG = config('DEBUG', default=True, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='*', cast=Csv())

# Production madhe SECRET_KEY change kela nahi tar warning
import warnings as _early_warn
if 'insecure' in SECRET_KEY:
    _early_warn.warn(
        "SECRET_KEY is insecure! Set a strong SECRET_KEY in .env before deploying to production. "
        "Generate one: python -c \"from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())\"",
        RuntimeWarning, stacklevel=2
    )

INSTALLED_APPS = [
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    'drf_spectacular',
    
    'apps.customers',
    'apps.products',
    'apps.inventory',
    'apps.orders',
    'apps.billing',
    'apps.expenses',
    'apps.analytics',
    'apps.reports',
    'apps.chatbot',
    'apps.notifications',
    'apps.suppliers',
    'apps.returns',
    'apps.subscriptions',
    'apps.loyalty',
    'apps.audit',
    'apps.cart',
    'django_apscheduler',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'coldsync.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'frontend' / 'dist'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'coldsync.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# ── DATABASE_URL override (Render/Heroku/Railway) ─────────────
import dj_database_url as _dj_db
_database_url = os.environ.get('DATABASE_URL', '')
if _database_url:
    DATABASES['default'] = _dj_db.config(
        default=_database_url,
        conn_max_age=600,
        conn_health_checks=True,
    )

# ── PostgreSQL override (set DB_ENGINE=django.db.backends.postgresql in .env) ──
_db_engine = config('DB_ENGINE', default='')
if _db_engine == 'django.db.backends.postgresql' and not _database_url:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME':     config('DB_NAME',     default='coldsync_db'),
            'USER':     config('DB_USER',     default='postgres'),
            'PASSWORD': config('DB_PASSWORD', default=''),
            'HOST':     config('DB_HOST',     default='localhost'),
            'PORT':     config('DB_PORT',     default='5432'),
            'OPTIONS':  {'connect_timeout': 10},
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Only include frontend/dist/assets if it exists (requires `npm run build` first)
_frontend_assets = BASE_DIR / 'frontend' / 'dist' / 'assets'
STATICFILES_DIRS = [
    BASE_DIR / 'coldsync' / 'static',
    *([_frontend_assets] if _frontend_assets.exists() else []),
]
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ── Email Configuration ──────────────────────────────────────
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = True
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='ColdSync Pro <noreply@coldsync.com>')

# ── Admin Email (Server errors & notifications) ───────────────
ADMINS = [
    ('Shree Ganesh Agency', config('ADMIN_EMAIL', default='shreeganeshagency1517@gmail.com')),
]
SERVER_EMAIL = config('EMAIL_HOST_USER', default='shreeganeshagency1517@gmail.com')
ADMIN_EMAIL = config('ADMIN_EMAIL', default='shreeganeshagency1517@gmail.com')

# ── UPI / Payment Config ─────────────────────────────────────
UPI_ID = config('UPI_ID', default='9960991017@ybl')
UPI_NAME = config('UPI_NAME', default='Shree Ganesh Agency')
UPI_QR_IMAGE = config('UPI_QR_IMAGE', default='upi-qr.png')

# ── WhatsApp (Twilio) Config ─────────────────────────────────
TWILIO_ACCOUNT_SID = config('TWILIO_ACCOUNT_SID', default='')
TWILIO_AUTH_TOKEN  = config('TWILIO_AUTH_TOKEN', default='')
TWILIO_WHATSAPP_FROM = config('TWILIO_WHATSAPP_FROM', default='whatsapp:+14155238886')
TWILIO_SMS_FROM    = config('TWILIO_SMS_FROM', default='')
AGENCY_WHATSAPP_NUMBER = config('AGENCY_WHATSAPP_NUMBER', default='')
FAST2SMS_API_KEY = config('FAST2SMS_API_KEY', default='')

# ── AI Chatbot (Groq) ─────────────────────────────────────────
GROQ_API_KEY = config('GROQ_API_KEY', default='')
os.environ.setdefault('GROQ_API_KEY', GROQ_API_KEY)

# ── Startup warnings for missing optional keys ────────────────
import warnings as _warnings
if not GROQ_API_KEY:
    _warnings.warn(
        "GROQ_API_KEY is not set — AI chatbot will use rule-based fallback only. "
        "Get a free key at https://console.groq.com",
        RuntimeWarning, stacklevel=2
    )
if not config('TWILIO_ACCOUNT_SID', default='') or not config('TWILIO_AUTH_TOKEN', default=''):
    _warnings.warn(
        "TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN not set — WhatsApp/SMS notifications disabled. "
        "Sign up at https://www.twilio.com",
        RuntimeWarning, stacklevel=2
    )
if not config('EMAIL_HOST_USER', default='') or not config('EMAIL_HOST_PASSWORD', default=''):
    _warnings.warn(
        "EMAIL_HOST_USER / EMAIL_HOST_PASSWORD not set — emails will not be sent. "
        "Set Gmail SMTP credentials in .env",
        RuntimeWarning, stacklevel=2
    )

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '60/hour',
        'user': '1000/hour',
        'login': '10/minute',
        'payment': '20/hour',   # pay-now endpoint
        'order': '30/hour',     # create-order endpoint
    },
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=5),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': False,
    'BLACKLIST_AFTER_ROTATION': False,  # Rotation off aahe tar blacklist nako
    'AUTH_HEADER_TYPES': ('Bearer',),
}

CORS_ALLOW_ALL_ORIGINS = config('CORS_ALLOW_ALL_ORIGINS', default=False, cast=bool)
CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', default='http://localhost:3000,http://127.0.0.1:3000', cast=Csv())
CORS_ALLOW_CREDENTIALS = True

# ── CSRF Trusted Origins (needed for Django admin via frontend proxy) ──
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    # Production domain — set via env
    *([f'https://{d}' for d in config('ALLOWED_HOSTS', default='', cast=Csv()) if d not in ('*', 'localhost', '127.0.0.1')]),
]

# ── Production Security (auto-enabled when DEBUG=False) ──────
if not DEBUG:
    SECURE_HSTS_SECONDS = 31536000          # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=False, cast=bool)
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'

# ── File Upload Security ─────────────────────────────────────
FILE_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024   # 5 MB in-memory limit
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10 MB total request body
DATA_UPLOAD_MAX_NUMBER_FIELDS = 500

# ── Database connection pooling (production) ─────────────────
if not DEBUG:
    DATABASES['default']['CONN_MAX_AGE'] = 60   # reuse DB connections for 60s

# ── Cache (Redis in prod if REDIS_URL set, otherwise in-memory for dev) ──────
_redis_url = config('REDIS_URL', default='')
if _redis_url:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': _redis_url,
            'OPTIONS': {
                'socket_connect_timeout': 5,
                'socket_timeout': 5,
            },
        }
    }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'coldsync-cache',
        }
    }

# ── Rate limiting — tighter for auth endpoints ───────────────
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'].update({
    'anon': '100/hour',
    'user': '2000/hour',
    'login': '10/minute',
})


# ── Logging Configuration ────────────────────────────────────
LOGS_DIR = BASE_DIR / 'logs'
LOGS_DIR.mkdir(exist_ok=True)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {asctime} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOGS_DIR / 'django.log',
            'maxBytes': 10 * 1024 * 1024,  # 10 MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
        'error_file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOGS_DIR / 'errors.log',
            'maxBytes': 10 * 1024 * 1024,
            'backupCount': 5,
            'level': 'ERROR',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': config('DJANGO_LOG_LEVEL', default='INFO'),
            'propagate': False,
        },
        'django.request': {
            'handlers': ['error_file', 'console'],
            'level': 'ERROR',
            'propagate': False,
        },
        'apps': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
    },
}

# ── API Documentation (drf-spectacular) ─────────────────────
SPECTACULAR_SETTINGS = {
    'TITLE': 'ColdSync Pro API',
    'DESCRIPTION': (
        'Cold Drink Agency Management System — Shree Ganesh Agency\n\n'
        '**Authentication:** JWT Bearer token\n\n'
        'Get token: `POST /api/auth/login/` → use `access` token in `Authorization: Bearer <token>` header\n\n'
        '**Base URL:** `/api/`'
    ),
    'VERSION': '2.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'TAGS': [
        {'name': 'auth', 'description': 'Authentication — login, refresh, forgot password'},
        {'name': 'customers', 'description': 'Customer management and registration'},
        {'name': 'products', 'description': 'Product catalog and brands'},
        {'name': 'inventory', 'description': 'Stock management and alerts'},
        {'name': 'orders', 'description': 'Order placement, tracking, delivery'},
        {'name': 'billing', 'description': 'Payments, invoices, UPI'},
        {'name': 'analytics', 'description': 'Dashboard stats, revenue, forecasting'},
        {'name': 'reports', 'description': 'PDF/Excel report downloads'},
        {'name': 'notifications', 'description': 'Real-time notifications and offers'},
        {'name': 'loyalty', 'description': 'Loyalty points and tiers'},
        {'name': 'subscriptions', 'description': 'Recurring orders'},
        {'name': 'returns', 'description': 'Return requests'},
        {'name': 'suppliers', 'description': 'Supplier and purchase order management'},
        {'name': 'chatbot', 'description': 'AI chatbot'},
        {'name': 'audit', 'description': 'Action audit logs'},
    ],
}
