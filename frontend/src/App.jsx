import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './i18n'
import ErrorBoundary from './components/ErrorBoundary'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import CustomerDashboard from './pages/CustomerDashboard'
import CustomerOrders from './pages/CustomerOrders'
import CustomerSubscriptions from './pages/CustomerSubscriptions'
import CustomerLoyalty from './pages/CustomerLoyalty'
import PaymentHistory from './pages/PaymentHistory'
import ShopCatalog from './pages/ShopCatalog'
import OffersPage from './pages/OffersPage'
import PayNowPage from './pages/PayNowPage'
import ReturnsPage from './pages/ReturnsPage'
import ProfileEdit from './pages/ProfileEdit'
import AdminDashboard from './pages/AdminDashboard'
import AdminOrders from './pages/AdminOrders'
import AdminCustomers from './pages/AdminCustomers'
import AdminInventory from './pages/AdminInventory'
import AdminBilling from './pages/AdminBilling'
import AdminCredits from './pages/AdminCredits'
import AdminReports from './pages/AdminReports'
import AdminReportBuilder from './pages/AdminReportBuilder'
import AdminReplenishment from './pages/AdminReplenishment'
import AdminReturns from './pages/AdminReturns'
import AdminOffers from './pages/AdminOffers'
import AdminProducts from './pages/AdminProducts'
import AdminForecast from './pages/AdminForecast'
import AdminRoutes from './pages/AdminRoutes'
import AdminProfitAnalysis from './pages/AdminProfitAnalysis'
import AdminSuppliers from './pages/AdminSuppliers'
import DriverApp from './pages/DriverApp'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import DeliverySlip from './pages/DeliverySlip'
import OrderConfirmed from './pages/OrderConfirmed'
import ChatbotWidget from './components/ChatbotWidget'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import AdminRoute from './components/AdminRoute'
import { ToastContainer } from './components/Toast'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('access')
  return token ? children : <Navigate to="/login" replace />
}

function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/customer-dashboard" element={<PrivateRoute><CustomerDashboard /></PrivateRoute>} />
        <Route path="/edit-profile" element={<PrivateRoute><ProfileEdit /></PrivateRoute>} />
        <Route path="/customer-orders" element={<PrivateRoute><CustomerOrders /></PrivateRoute>} />
        <Route path="/subscriptions" element={<PrivateRoute><CustomerSubscriptions /></PrivateRoute>} />
        <Route path="/loyalty" element={<PrivateRoute><CustomerLoyalty /></PrivateRoute>} />
        <Route path="/payment-history" element={<PrivateRoute><PaymentHistory /></PrivateRoute>} />
        <Route path="/catalog" element={<PrivateRoute><ShopCatalog /></PrivateRoute>} />
        <Route path="/offers" element={<PrivateRoute><OffersPage /></PrivateRoute>} />
        <Route path="/pay-now" element={<PrivateRoute><PayNowPage /></PrivateRoute>} />
        <Route path="/returns" element={<PrivateRoute><ReturnsPage /></PrivateRoute>} />
        <Route path="/admin-dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin-orders" element={<AdminRoute><AdminOrders /></AdminRoute>} />
        <Route path="/admin-customers" element={<AdminRoute><AdminCustomers /></AdminRoute>} />
        <Route path="/admin-inventory" element={<AdminRoute><AdminInventory /></AdminRoute>} />
        <Route path="/admin-billing" element={<AdminRoute><AdminBilling /></AdminRoute>} />
        <Route path="/admin-credits" element={<AdminRoute><AdminCredits /></AdminRoute>} />
        <Route path="/admin-reports" element={<AdminRoute><AdminReports /></AdminRoute>} />
        <Route path="/admin-report-builder" element={<AdminRoute><AdminReportBuilder /></AdminRoute>} />
        <Route path="/admin-replenishment" element={<AdminRoute><AdminReplenishment /></AdminRoute>} />
        <Route path="/admin-returns" element={<AdminRoute><AdminReturns /></AdminRoute>} />
        <Route path="/admin-offers" element={<AdminRoute><AdminOffers /></AdminRoute>} />
        <Route path="/admin-products" element={<AdminRoute><AdminProducts /></AdminRoute>} />
        <Route path="/admin-forecast" element={<AdminRoute><AdminForecast /></AdminRoute>} />
        <Route path="/admin-routes" element={<AdminRoute><AdminRoutes /></AdminRoute>} />
        <Route path="/admin-profit" element={<AdminRoute><AdminProfitAnalysis /></AdminRoute>} />
        <Route path="/admin-suppliers" element={<AdminRoute><AdminSuppliers /></AdminRoute>} />
        <Route path="/driver-app" element={<AdminRoute><DriverApp /></AdminRoute>} />
        <Route path="/delivery-slip" element={<AdminRoute><DeliverySlip /></AdminRoute>} />
        <Route path="/order-confirmed" element={<PrivateRoute><OrderConfirmed /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ChatbotWidget />
      <PWAInstallPrompt />
      <ToastContainer />
    </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
