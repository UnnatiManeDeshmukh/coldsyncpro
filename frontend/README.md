# ColdSync Pro - Frontend

Modern React frontend for ColdSync Pro Cold Drink Agency Management System.

## Tech Stack

- **React 18** - UI Library
- **Vite** - Build Tool
- **TailwindCSS** - Styling
- **React Router** - Navigation
- **Axios** - API Client
- **Chart.js** - Data Visualization
- **Lucide React** - Icons
- **React Hot Toast** - Notifications

## Design Theme

- **Deep Red** (#C00000) - Primary brand color
- **Gold** (#F5B400) - Accent color
- **Dark Navy** (#0A1A2F) - Background
- **Glassmorphism** - Modern UI cards with backdrop blur

## Features

### 1. Authentication
- Secure JWT-based login
- Token refresh mechanism
- Protected routes

### 2. Dashboard
- Real-time analytics
- Revenue charts
- Low stock alerts
- Top customers
- Sales by brand visualization

### 3. Customer Management
- CRUD operations
- Search and filter
- Credit limit tracking
- Village-wise organization

### 4. Product Management
- Brand-specific products (Coca-Cola, Sprite, Fanta, ThumbsUp, Limca, Kinley)
- Multiple bottle sizes
- Crate size configuration
- Rate management
- Expiry tracking

### 5. Inventory Management
- Real-time stock levels
- Low stock alerts (visual indicators)
- Critical stock warnings
- Warehouse-wise tracking

### 6. Order Management
- Create orders with multiple items
- Customer selection
- Auto-calculate totals
- Payment status tracking
- Delivery status tracking

### 7. Billing & Invoices
- Generate invoices
- GST calculation
- PDF download
- UPI payment QR codes
- Multiple payment methods

### 8. Credit/Udhari System
- Track pending payments
- Record partial payments
- Payment history
- Customer-wise credit tracking

### 9. Reports & Analytics
- Daily/Monthly revenue
- Profit calculations
- Top customers analysis
- Downloadable reports (PDF/Excel)
- Interactive charts

### 10. Settings
- Agency information
- Tax configuration
- UPI settings
- Brand color reference

## Installation

### Prerequisites
- Node.js 18+ and npm

### Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure API endpoint (if needed):
Edit `src/utils/api.js` and update `API_BASE_URL`

4. Start development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Build for Production

```bash
npm run build
```

Built files will be in the `dist` directory.

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Layout.jsx          # Main layout with sidebar
│   │   └── ProtectedRoute.jsx  # Route protection
│   ├── pages/
│   │   ├── LoginPage.jsx       # Authentication
│   │   ├── Dashboard.jsx       # Main dashboard
│   │   ├── Customers.jsx       # Customer management
│   │   ├── Products.jsx        # Product catalog
│   │   ├── Inventory.jsx       # Stock management
│   │   ├── Orders.jsx          # Order processing
│   │   ├── Billing.jsx         # Invoice generation
│   │   ├── Credits.jsx         # Credit tracking
│   │   ├── Reports.jsx         # Analytics & reports
│   │   └── Settings.jsx        # Configuration
│   ├── utils/
│   │   └── api.js              # API client & endpoints
│   ├── App.jsx                 # Main app component
│   ├── main.jsx                # Entry point
│   └── index.css               # Global styles
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## API Integration

All API calls are centralized in `src/utils/api.js`:

- **Auth**: Login, logout, token refresh
- **Customers**: CRUD operations
- **Products**: CRUD operations
- **Inventory**: Stock management
- **Orders**: Order processing
- **Billing**: Invoice generation, PDF download
- **Credits**: Payment tracking
- **Analytics**: Revenue, profit calculations
- **Reports**: Downloadable reports

## Environment Variables

Create a `.env` file in the frontend directory:

```env
VITE_API_URL=http://localhost:8000/api
```

## Key Components

### Layout Component
- Responsive sidebar navigation
- Mobile-friendly menu
- Brand logo and colors
- Logout functionality

### Protected Routes
- JWT token validation
- Automatic redirect to login
- Token refresh on expiry

### Glassmorphism Cards
- Custom CSS classes for modern UI
- Backdrop blur effects
- Hover animations

## Styling

### Custom Tailwind Classes

```css
.glass-card - Glassmorphism card
.glass-card-hover - Card with hover effect
.btn-primary - Primary button (red gradient)
.btn-gold - Gold button
.input-glass - Glass-style input field
```

### Brand Colors

```javascript
Coca-Cola: #F40009
Sprite: #00D664
Fanta: #FF8300
ThumbsUp: #0066CC
Limca: #00FF00
Kinley: #0099FF
```

## Charts & Visualizations

Using Chart.js with react-chartjs-2:
- Line charts for revenue trends
- Bar charts for sales breakdown
- Doughnut charts for brand distribution
- Pie charts for customer analysis

## Responsive Design

- Mobile-first approach
- Breakpoints: sm, md, lg, xl
- Collapsible sidebar on mobile
- Touch-friendly UI elements

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Development Tips

1. **Hot Module Replacement**: Vite provides instant updates
2. **Component Structure**: Keep components small and focused
3. **API Calls**: Always handle loading and error states
4. **Toast Notifications**: Use for user feedback
5. **Form Validation**: Validate on client and server side

## Troubleshooting

### CORS Issues
Ensure Django backend has CORS configured:
```python
CORS_ALLOW_ALL_ORIGINS = True
```

### API Connection
Check `vite.config.js` proxy settings:
```javascript
proxy: {
  '/api': {
    target: 'http://localhost:8000',
    changeOrigin: true,
  }
}
```

### Build Errors
Clear node_modules and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Contributing

1. Follow the existing code style
2. Use meaningful component and variable names
3. Add comments for complex logic
4. Test on multiple screen sizes
5. Ensure accessibility compliance

## License

MIT

## Support

For issues and questions, contact the development team.
