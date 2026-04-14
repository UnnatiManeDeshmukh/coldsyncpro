# ColdSync Pro — Production Deployment Guide
## 100% Deploy Ready Checklist

---

## Step 1: Server Setup (Ubuntu 22.04 VPS)

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose plugin
sudo apt install docker-compose-plugin -y

# Verify
docker --version
docker compose version
```

---

## Step 2: Upload Project to Server

```bash
# On your LOCAL machine — zip and upload
zip -r coldsync.zip . -x "*.pyc" -x "__pycache__/*" -x "node_modules/*" -x ".git/*" -x "venv/*"
scp coldsync.zip user@YOUR_SERVER_IP:/home/user/

# On SERVER — extract
cd /home/user
unzip coldsync.zip -d coldsync
cd coldsync
```

---

## Step 3: Configure .env (MOST IMPORTANT)

```bash
cp .env.example .env
nano .env
```

Fill in ALL these values:

```env
# ── REQUIRED ─────────────────────────────────────────────────
SECRET_KEY=<generate: python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())">
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# ── Database ──────────────────────────────────────────────────
DB_ENGINE=django.db.backends.postgresql
DB_NAME=coldsync_db
DB_USER=postgres
DB_PASSWORD=<strong-password-here>
DB_HOST=db
DB_PORT=5432

# ── Email (Gmail) ─────────────────────────────────────────────
# 1. Enable 2FA on Gmail
# 2. Google Account → Security → App Passwords → Generate
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-gmail@gmail.com
EMAIL_HOST_PASSWORD=xxxx-xxxx-xxxx-xxxx  # 16-char App Password
DEFAULT_FROM_EMAIL=ColdSync Pro <your-gmail@gmail.com>
ADMIN_EMAIL=your-gmail@gmail.com

# ── UPI Payment ───────────────────────────────────────────────
UPI_ID=yourname@upi
UPI_NAME=Shree Ganesh Agency

# ── WhatsApp (Twilio) ─────────────────────────────────────────
# Sign up free: https://www.twilio.com/try-twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_SMS_FROM=+1XXXXXXXXXX
AGENCY_WHATSAPP_NUMBER=+91XXXXXXXXXX  # Your WhatsApp number

# ── AI Chatbot (Groq — FREE) ──────────────────────────────────
# Get free key: https://console.groq.com
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ── Redis (for caching) ───────────────────────────────────────
REDIS_URL=redis://redis:6379/1

# ── CORS ──────────────────────────────────────────────────────
CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

---

## Step 4: SSL Certificate

```bash
mkdir ssl

# Option A — Let's Encrypt (FREE, recommended)
sudo apt install certbot -y
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/
sudo chmod 644 ssl/*.pem

# Option B — Self-signed (for testing only)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/privkey.pem -out ssl/fullchain.pem \
  -subj "/CN=yourdomain.com"
```

---

## Step 5: Update nginx.conf Domain

```bash
sed -i 's/your-domain.com/yourdomain.com/g' nginx.conf
```

---

## Step 6: Deploy

```bash
chmod +x deploy.sh
./deploy.sh --build
```

This will:
- Build Docker images (frontend + backend)
- Start PostgreSQL, Redis, Django, Nginx
- Run database migrations
- Collect static files
- Rebuild product catalog

---

## Step 7: Create Admin User

```bash
docker compose exec web python manage.py createsuperuser
# Enter: username, email, password
```

---

## Step 8: Test Everything

```bash
# 1. Health check
curl https://yourdomain.com/api/health/

# 2. Test Email + WhatsApp
curl -X POST https://yourdomain.com/api/test-notifications/ \
  -H "Content-Type: application/json" \
  -d '{"secret":"<first-8-chars-of-SECRET_KEY>","test_email":"your@email.com","test_phone":"+91XXXXXXXXXX"}'

# Expected response:
# {"email":{"status":"sent"},"whatsapp":{"status":"sent"},"config":{"email_configured":true,...}}

# 3. API Documentation
# Visit: https://yourdomain.com/api/docs/
```

---

## Step 9: Seed Product Data (Optional)

```bash
# Rebuild product catalog with photos
docker compose exec web python manage.py rebuild_shop

# Or attach photos to existing products
docker compose exec web python manage.py attach_photos
```

---

## Maintenance Commands

```bash
# View logs
docker compose logs -f web

# Restart
docker compose restart web

# Update code
git pull
./deploy.sh --build

# Backup database
docker compose exec db pg_dump -U postgres coldsync_db > backup_$(date +%Y%m%d).sql

# Run tests
docker compose exec web python manage.py test apps.tests

# Renew SSL (Let's Encrypt auto-renews, but manual if needed)
sudo certbot renew
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/
docker compose restart nginx
```

---

## Common Issues & Fixes

| Problem | Fix |
|---------|-----|
| 502 Bad Gateway | `docker compose logs web` — check for errors |
| Email not sending | Gmail App Password चुकीचा आहे. 2FA enable करा, नवीन App Password generate करा |
| WhatsApp not working | Twilio sandbox: customer ने `join <word>` पाठवायला हवे. Production साठी Twilio number upgrade करा |
| Static files 404 | `docker compose exec web python manage.py collectstatic --noinput` |
| SSL error | `ssl/` folder मध्ये `fullchain.pem` आणि `privkey.pem` आहेत का check करा |
| DB connection error | `.env` मध्ये `DB_HOST=db` आहे का? (Docker service name) |
| Cart not syncing | `python manage.py migrate` run झाला का? `apps.cart` migrations check करा |

---

## URLs After Deploy

| URL | Description |
|-----|-------------|
| `https://yourdomain.com/` | Landing page |
| `https://yourdomain.com/login` | Customer/Admin login |
| `https://yourdomain.com/register` | Customer registration |
| `https://yourdomain.com/customer-dashboard` | Customer portal |
| `https://yourdomain.com/admin-dashboard` | Admin panel |
| `https://yourdomain.com/api/docs/` | API documentation (Swagger) |
| `https://yourdomain.com/api/health/` | Health check |

---

## Project is 100% Production Ready ✅

- Backend: Django + PostgreSQL + Redis
- Frontend: React PWA (installable on mobile)
- Notifications: Email + WhatsApp + SMS + SSE real-time
- Security: JWT, HTTPS, HSTS, rate limiting
- Monitoring: Rotating logs, health endpoint
- Docs: Swagger UI at `/api/docs/`
- Tests: `python manage.py test apps.tests`
