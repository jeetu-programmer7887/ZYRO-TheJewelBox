import { StrictMode, Suspense, lazy, useContext } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { ToastContainer } from 'react-toastify'
import axios from 'axios'

// ── Core (eager: needed for the first paint of every page) ──
import './index.css'
import ShopContextProvider, { ShopContext } from './config/ShopContext.jsx'
import PageRouting from './Layouts/PageRouting.jsx'
import { GuestRoute, ProtectedRoute, AdminRoute } from './Layouts/RouteGuards.jsx'
import App from './App.jsx'

// ── Pages (lazy: each route downloads its own chunk on first visit) ──
const About = lazy(() => import('./Pages/About.jsx'))
const Contact = lazy(() => import('./Pages/Contact.jsx'))
const Login = lazy(() => import('./Pages/Login.jsx'))
const Signup = lazy(() => import('./Pages/Signup.jsx'))
const Cart = lazy(() => import('./Pages/Cart.jsx'))
const Wishlist = lazy(() => import('./Pages/Wishlist.jsx'))
const Search = lazy(() => import('./Pages/Search.jsx'))
const NewArrivals = lazy(() => import('./Pages/NewArrivals.jsx'))
const PlaceOrder = lazy(() => import('./Pages/placeOrder.jsx'))
const AiStylistStudio = lazy(() => import('./Pages/AiStylistStudio.jsx'))

// ── Auth Pages ──
const VerifyEmail = lazy(() => import('./Pages/VerifyEmail.jsx'))
const ForgotPassword = lazy(() => import('./Pages/ForgotPassword.jsx'))
const ResetPassword = lazy(() => import('./Pages/ResetPassword.jsx'))

// ── Policy Pages ──
const FAQ = lazy(() => import('./Pages/FAQ.jsx'))
const ReturnPolicy = lazy(() => import('./Pages/ReturnPolicy.jsx'))
const PrivacyPolicy = lazy(() => import('./Pages/PrivacyPolicy.jsx'))
const ShippingPolicy = lazy(() => import('./Pages/ShippingPolicy.jsx'))

// ── Category Pages ──
const Earrings = lazy(() => import('./Pages/Categories/Earrings.jsx'))
const Necklaces = lazy(() => import('./Pages/Categories/Necklace.jsx'))
const Bracelets = lazy(() => import('./Pages/Categories/Bracelets.jsx'))
const Rings = lazy(() => import('./Pages/Categories/Rings.jsx'))
const Product = lazy(() => import('./Pages/Categories/Product.jsx').then(m => ({ default: m.Product })))

// ── User Account Pages ──
const UserAccountLayout = lazy(() => import('./Pages/User/UserAccountLayout.jsx'))
const Profile = lazy(() => import('./Pages/User/Profile.jsx'))
const Order = lazy(() => import('./Pages/User/Order.jsx'))
const Cancelled = lazy(() => import('./Pages/User/Cancelled.jsx'))
const Returns = lazy(() => import('./Pages/User/Returns.jsx'))
const Coins = lazy(() => import('./Pages/User/Coins.jsx'))

// ── Admin Pages ──
const AdminPanel = lazy(() => import('./Admin/AdminPanel.jsx'))
const AdminDashboard = lazy(() => import('./Admin/AdminDashboard.jsx'))
const AdminOrders = lazy(() => import('./Admin/AdminOrders.jsx'))
const AddProduct = lazy(() => import('./Admin/AddProduct.jsx'))
const ListProducts = lazy(() => import('./Admin/ListProducts.jsx'))
const AdminEditProduct = lazy(() => import('./Admin/AdminEditProduct.jsx'))
const AdminReviews = lazy(() => import('./Admin/AdminReviews.jsx'))

// ── Components ──
const ChatWidget = lazy(() => import('./Components/ChatWidget.jsx'))
const NotFound = lazy(() => import('./Pages/NotFound.jsx'))

// ── Config ──
axios.defaults.withCredentials = true
axios.defaults.timeout = 30000

// After a new deploy, an open tab can request page chunks whose hashed
// filenames no longer exist. Reload once to pick up the new build instead
// of leaving the customer on a broken page.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  try {
    if (sessionStorage.getItem('chunk-reload')) return
    sessionStorage.setItem('chunk-reload', '1')
  } catch { /* storage unavailable: still try one reload */ }
  window.location.reload()
})
window.addEventListener('load', () => {
  try { sessionStorage.removeItem('chunk-reload') } catch { /* ignore */ }
})
const CLIENT_ID = import.meta.env.VITE_OAUTH_CLIENT_ID

// ── Route Definitions ──
const router = createBrowserRouter([
  {
    path: '/',
    element: <PageRouting />,
    children: [
      // Main
      { index: true,                element: <App /> },
      { path: 'about',              element: <About /> },
      { path: 'contact',            element: <Contact /> },
      { path: 'search',             element: <Search /> },
      { path: 'new-arrivals',       element: <NewArrivals /> },
      { path: 'ai-stylist',         element: <AiStylistStudio /> },
      { path: 'product/:productId', element: <Product /> },

      // Cart & Wishlist
      { path: 'cart',               element: <Cart /> },
      { path: 'wishlist',           element: <Wishlist /> },

      // Auth (blocked for already-logged-in users)
      {
        element: <GuestRoute />,
        children: [
          { path: 'login',           element: <Login /> },
          { path: 'signup',          element: <Signup /> },
          { path: 'verify-email',    element: <VerifyEmail /> },
        ],
      },

      // Password reset (also used by logged-in users to change their password)
      { path: 'forgot-password',    element: <ForgotPassword /> },
      { path: 'reset-password',     element: <ResetPassword /> },

      // Checkout (requires login)
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'place-order',    element: <PlaceOrder /> },
        ],
      },

      // Policies
      { path: 'faq',                element: <FAQ /> },
      { path: 'returnPolicy',       element: <ReturnPolicy /> },
      { path: 'privacyPolicy',      element: <PrivacyPolicy /> },
      { path: 'shippingPolicy',     element: <ShippingPolicy /> },

      // Categories
      {
        path: 'category',
        children: [
          { path: 'earrings',   element: <Earrings /> },
          { path: 'necklaces',  element: <Necklaces /> },
          { path: 'bracelets',  element: <Bracelets /> },
          { path: 'rings',      element: <Rings /> },
        ],
      },

      // User Account (requires a logged-in "user")
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: 'userAccount',
            element: <UserAccountLayout />,
            children: [
              { index: true,        element: <Profile /> },
              { path: 'order',      element: <Order /> },
              { path: 'cancel',     element: <Cancelled /> },
              { path: 'returns',    element: <Returns /> },
              { path: 'coins',      element: <Coins /> },
            ],
          },
        ],
      },

      // Admin (requires a logged-in "admin")
      {
        element: <AdminRoute />,
        children: [
          {
            path: 'admin',
            element: <AdminPanel />,
            children: [
              { index: true,        element: <AdminOrders /> },
              { path: 'dashboard',  element: <AdminDashboard /> },
              { path: 'orders',     element: <AdminOrders /> },
              { path: 'add',        element: <AddProduct /> },
              { path: 'reviews',     element: <AdminReviews /> },
              { path: 'list',       element: <ListProducts /> },
              { path: 'edit/:id',   element: <AdminEditProduct /> },
            ],
          },
        ],
      },
      {path: "*", element: <NotFound/>},
    ],
  },
])

// ── Global Chat Support ──
// eslint-disable-next-line react-refresh/only-export-components
const ZYROChatSupport = () => {
  const { backendUrl } = useContext(ShopContext)
  return (
    <Suspense fallback={null}>
      <ChatWidget backendUrl={backendUrl} />
    </Suspense>
  )
}

// ── App Entry Point ──
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <ShopContextProvider>

        <RouterProvider router={router} />

        <ZYROChatSupport />

        <ToastContainer
          position="top-right"
          autoClose={1000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnFocusLoss={false}
          draggable
          pauseOnHover
          theme="light"
        />

      </ShopContextProvider>
    </GoogleOAuthProvider>
  </StrictMode>
)