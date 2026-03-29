import { StrictMode, useContext } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { ToastContainer } from 'react-toastify'
import axios from 'axios'

// ── Core ──
import './index.css'
import ShopContextProvider, { ShopContext } from './config/ShopContext.jsx'
import PageRouting from './Layouts/PageRouting.jsx'

// ── Pages ──
import App from './App.jsx'
import About from './Pages/About.jsx'
import Contact from './Pages/Contact.jsx'
import Login from './Pages/Login.jsx'
import Signup from './Pages/Signup.jsx'
import Cart from './Pages/Cart.jsx'
import Wishlist from './Pages/Wishlist.jsx'
import Search from './Pages/Search.jsx'
import NewArrivals from './Pages/NewArrivals.jsx'
import PlaceOrder from './Pages/placeOrder.jsx'
import AiStylistStudio from './Pages/AiStylistStudio.jsx'

// ── Auth Pages ──
import VerifyEmail from './Pages/VerifyEmail.jsx'
import ForgotPassword from './Pages/ForgotPassword.jsx'
import ResetPassword from './Pages/ResetPassword.jsx'

// ── Policy Pages ──
import FAQ from './Pages/FAQ.jsx'
import ReturnPolicy from './Pages/ReturnPolicy.jsx'
import PrivacyPolicy from './Pages/PrivacyPolicy.jsx'
import ShippingPolicy from './Pages/ShippingPolicy.jsx'

// ── Category Pages ──
import Earrings from './Pages/Categories/Earrings.jsx'
import Necklaces from './Pages/Categories/Necklace.jsx'
import Bracelets from './Pages/Categories/Bracelets.jsx'
import Rings from './Pages/Categories/Rings.jsx'
import { Product } from './Pages/Categories/Product.jsx'

// ── User Account Pages ──
import UserAccountLayout from './Pages/User/UserAccountLayout.jsx'
import Profile from './Pages/User/Profile.jsx'
import Order from './Pages/User/Order.jsx'
import Cancelled from './Pages/User/Cancelled.jsx'
import Returns from './Pages/User/Returns.jsx'
import Coins from './Pages/User/Coins.jsx'

// ── Admin Pages ──
import AdminPanel from './Admin/AdminPanel.jsx'
import AdminDashboard from './Admin/AdminDashboard.jsx'
import AdminOrders from './Admin/AdminOrders.jsx'
import AddProduct from './Admin/AddProduct.jsx'
import ListProducts from './Admin/ListProducts.jsx'
import AdminEditProduct from './Admin/AdminEditProduct.jsx'

// ── Components ──
import ChatWidget from './Components/ChatWidget.jsx'
import AdminReviews from './Admin/AdminReviews.jsx'

// ── Config ──
axios.defaults.withCredentials = true
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
      { path: 'place-order',        element: <PlaceOrder /> },

      // Cart & Wishlist
      { path: 'cart',               element: <Cart /> },
      { path: 'wishlist',           element: <Wishlist /> },

      // Auth
      { path: 'login',              element: <Login /> },
      { path: 'signup',             element: <Signup /> },
      { path: 'verify-email',       element: <VerifyEmail /> },
      { path: 'forgot-password',    element: <ForgotPassword /> },
      { path: 'reset-password',     element: <ResetPassword /> },

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

      // User Account
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

      // Admin
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
])

// ── Global Chat Support ──
const ZYROChatSupport = () => {
  const { backendUrl } = useContext(ShopContext)
  return <ChatWidget backendUrl={backendUrl} />
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