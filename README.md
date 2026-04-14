# ColdSync Pro - Cold Drink Agency Management System

A comprehensive full-stack application for managing cold drink distribution agency operations with a modern, animated landing page and intuitive dashboard.

## 🎨 New Features

### Modern Landing Page with Multi-Language Support (v2.0)
- ✅ **7 Languages Supported**: English, Hindi, Marathi, Spanish, French, German, Chinese
- ✅ **Instant Language Switching**: Click and switch - all content updates immediately
- ✅ **Fully Interactive Navigation**: Smooth scroll to all sections
- ✅ **Working Language Selector**: Desktop dropdown & mobile grid layout
- ✅ **Enhanced Animations**: Fade-in, scale, hover effects, smooth transitions
- ✅ **Glassmorphism Design**: Modern glass effect with brand colors
- ✅ **Responsive Design**: Perfect on desktop, tablet, and mobile
- ✅ **350+ Translations**: Every text element translated in all languages

### Original Features
- ✅ Animated gradient background with bubbles
- ✅ Navigation bar with smooth scrolling
- ✅ Hero section with brand icons (Coca-Cola, Sprite, Fanta, ThumbsUp, Limca, Kinley)
- ✅ Features showcase section
- ✅ About Us section
- ✅ Contact form with validation
- ✅ Social media links in footer
- ✅ Fully responsive design

## Tech Stack

### Backend
- Django 4.2.7
- Django REST Framework 3.14.0
- SQLite (for easy setup)
- JWT Authentication (djangorestframework-simplejwt)
- ReportLab (PDF generation)
- QRCode (UPI payment QR codes)

### Frontend
- React 18 with Vite
- TailwindCSS for styling
- Chart.js for analytics
- Axios for API calls
- React Router for navigation
- Lucide React for icons

## Features

### 1. Authentication System
- JWT-based authentication
- Token refresh mechanism
- Admin and Staff role support

### 2. Customer Management
- Complete CRUD operations
- Track shop details, owner info, contact, and credit limits
- Village-wise customer filtering

### 3. Product Management
- Manage multiple brands (CocaCola, Sprite, Fanta, ThumbsUp, Limca, Kinley)
- Multiple bottle sizes (200ml, 300ml, 600ml, 1L, 2L)
- Crate size and pricing management
- Expiry date tracking

### 4. Inventory Management
- Warehouse-wise stock tracking
- Auto-update stock on order creation
- Track crates and bottles separately

### 5. Order System
- Create orders with multiple items
- Auto-calculate total amounts
- Payment status tracking (Pending, Partial, Paid)
- Delivery status tracking (Pending, Processing, Delivered, Cancelled)
- Order items with flexible quantity (crates + bottles)

### 6. Billing System
- Payment tracking
- Multiple payment methods (Cash, UPI, Bank Transfer, Cheque)
- Link payments to orders and customers

## Installation

### Quick Start (Recommended)

1. **Run the setup script:**
   - Double-click `FINAL_SETUP.bat` (Windows)
   - This will install all dependencies and set up the database

2. **Start the application:**
   - Double-click `RUN_PROJECT.bat` to start both backend and frontend
   - Or start them separately (see Manual Start below)

3. **Access the application:**
   - Landing Page: `http://localhost:5173/`
   - Login Page: `http://localhost:5173/login`
   - Dashboard: `http://localhost:5173/app/dashboard` (after login)
   - Admin Panel: `http://127.0.0.1:8000/admin/`

### Manual Installation

1. Clone the repository

2. **Backend Setup:**
```bash
# Install Python dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start backend server
python manage.py runserver
```

3. **Frontend Setup:**
```bash
# Navigate to frontend folder
cd frontend

# Install Node dependencies
npm install

# Start frontend development server
npm run dev
```

## 🚀 Quick Access

- **Landing Page**: `http://localhost:5173/`
- **Login**: `http://localhost:5173/login`
- **Dashboard**: `http://localhost:5173/app/dashboard`
- **Admin Panel**: `http://127.0.0.1:8000/admin/`

## 📖 Documentation

- `LANDING_PAGE_GUIDE.md` - Complete guide for the landing page
- `INSTALLATION_GUIDE.md` - Detailed installation instructions
- `TROUBLESHOOTING.md` - Common issues and solutions
- `COMPLETE_SOLUTION.md` - Database setup guide

## API Endpoints

### Authentication
- POST `/api/auth/login/` - Get JWT tokens
- POST `/api/auth/refresh/` - Refresh access token

### Customers
- GET/POST `/api/customers/`
- GET/PUT/PATCH/DELETE `/api/customers/{id}/`

### Products
- GET/POST `/api/products/`
- GET/PUT/PATCH/DELETE `/api/products/{id}/`

### Inventory
- GET/POST `/api/inventory/`
- GET/PUT/PATCH/DELETE `/api/inventory/{id}/`

### Orders
- GET/POST `/api/orders/`
- GET/PUT/PATCH/DELETE `/api/orders/{id}/`
- POST `/api/orders/{id}/update_payment_status/`
- POST `/api/orders/{id}/update_delivery_status/`

### Order Items
- GET/POST `/api/orders/items/`
- GET/PUT/PATCH/DELETE `/api/orders/items/{id}/`

### Billing
- GET/POST `/api/billing/payments/`
- GET/PUT/PATCH/DELETE `/api/billing/payments/{id}/`

## Project Structure

```
coldsync/
├── apps/
│   ├── customers/
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── admin.py
│   ├── products/
│   ├── inventory/
│   ├── orders/
│   └── billing/
├── coldsync/
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── manage.py
└── requirements.txt
```

## Admin Panel

Access the Django admin at `/admin/` to manage all models through a user-friendly interface.

## License

MIT
