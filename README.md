<div align="center">

<img src="https://img.shields.io/badge/ZYRO-THE%20JEWEL%20BOX-c9a96e?style=for-the-badge&labelColor=1a1a1a&color=c9a96e" height="36" />

# 💎 ZYRO: The Jewel Box

**A Luxury AI-Powered E-Commerce Platform for Premium Jewellery**

*Where artificial intelligence meets the art of adornment*

[![Live Demo](https://img.shields.io/badge/🌐%20Live%20Demo-zyro--jewellery.vercel.app-c9a96e?style=for-the-badge&labelColor=1a1a1a)](https://zyro-jewellery.vercel.app/)
[![Made with React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white&labelColor=1a1a1a)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js&logoColor=white&labelColor=1a1a1a)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white&labelColor=1a1a1a)](https://mongodb.com/)
[![Powered by Gemini](https://img.shields.io/badge/Gemini-AI-4285F4?style=flat-square&logo=google&logoColor=white&labelColor=1a1a1a)](https://deepmind.google/technologies/gemini/)

</div>

---

## ✨ What is ZYRO?

ZYRO isn't just another jewellery store. It's a full-stack **luxury e-commerce experience** that uses the power of AI to answer the question every jewellery buyer asks — *"What will this actually look like on me?"*

Built on the **MERN stack**, ZYRO integrates two cutting-edge AI models — **Google Gemini** and **Groq (Llama 3)** — to deliver personalized styling consultations and virtual try-on experiences, replicating the feeling of a high-end boutique visit, entirely online.

> 🛍️ Try the live platform: **[zyro-jewellery.vercel.app](https://zyro-jewellery.vercel.app/)**

---

## 🌟 Feature Highlights

### 🤖 AI-Driven Personalization

| Feature | Description |
|---|---|
| **AI Stylist Studio** | Analyzes a user-uploaded portrait via **Groq (Llama 3)** to detect skin undertones and outfit color temperature — then recommends the perfect metal finish (Gold vs. Silver) |
| **Virtual Try-On** | Powered by **Google Gemini API** — generates a custom prompt, downloads jewellery assets, and composites them onto the user's image for real-time visualization |

### 💰 Loyalty & Retention Engine

- **ZYRO Coin System** — Users earn **10% of their order value** in redeemable coins on delivery
- Automated coin expiration and deduction logic for returns, built directly into the order lifecycle
- Gamified spending that incentivizes repeat purchases without discounting brand value

### 📬 Transactional Communication

- **Brevo (Sendinblue) SMTP** integration for real-time order confirmations and status updates
- **OTP-based authentication** via email — secure, passwordless login flow
- HTML-rich email templates that match the brand's luxury aesthetic

### 🛍️ Core E-Commerce Excellence

- **SKU-level inventory management** — variants per color, material, and stock level with anti-tarnish tracking
- **Infinite scroll** powered by the **Intersection Observer API** — products lazy-loaded in batches of 12 for silky 60fps browsing
- **Admin Suite** — full catalog management, order tracking, returns processing, and real-time sales statistics
- **Cron-based order expiration** — unpaid orders automatically released after 15 minutes, freeing inventory

---

## 🛠️ Tech Stack

<div align="center">

| Layer | Technology | Purpose |
|:---|:---|:---|
| **Frontend** | React 18 + Vite | SPA with fast HMR |
| **Styling** | Tailwind CSS | Utility-first responsive design |
| **HTTP Client** | Axios | API communication |
| **Icons** | Lucide React | Consistent, scalable iconography |
| **Backend** | Node.js + Express.js | RESTful API server |
| **Auth** | JWT + BcryptJS | Secure token-based authentication |
| **Database** | MongoDB Atlas + Mongoose | Scalable cloud NoSQL storage |
| **Media CDN** | Cloudinary | Image hosting & optimization |
| **AI — Styling** | Groq API (Llama 3) | Portrait analysis & recommendations |
| **AI — Try-On** | Google Gemini App | Jewellery visualization generation prompt |
| **Email** | Brevo (Sendinblue) | Transactional email & OTPs |

</div>

---

## 📂 Project Structure

```
ZYRO/
├── frontend/                   # React + Vite client
│   └── src/
│       ├── Admin/                # Admin dashboard (orders, catalog, returns)
│       ├── Components/           # Reusable UI — NavBar, Cards, Modals
│       ├── Pages/                # Route-level views
│       │   ├── StylistStudio.jsx # AI try-on & recommendation flows
│       │   ├── ProductPage/      # PDP with variant selection
│       │   └── Checkout/         # Cart, coins, and payment
│       └── config/               # ShopContext (global state) & API config
│
└── backend/                      # Node.js + Express API
    ├── controllers/              # Business logic — orders, AI, products, users
    ├── models/                   # Mongoose schemas — User, Product, Order, Coin
    ├── routes/                   # REST endpoints
    └── middleware/               # Auth guards — adminAuth, userAuth
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js `v14+`
- A [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
- A [Cloudinary](https://cloudinary.com/) account
- API keys for [Google Gemini](https://ai.google.dev/) and [Groq](https://console.groq.com/)
- A [Brevo](https://www.brevo.com/) SMTP account

---

### 1. Clone the Repository

```bash
git clone https://github.com/jeetu-programmer7887/ZYRO-TheJewelBox.git
cd zyro-jewel-box
```

### 2. Configure & Run the Backend

```bash
cd backend
npm install
```

Create a `.env` file inside `backend/`:

```env
PORT=8080
MONGODB_URI=your_mongodb_connection_string

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Auth
JWT_SECRET=your_super_secret_jwt_key

# AI APIs
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key

# Email
BREVO_SMTP_USER=your_brevo_login
BREVO_SMTP_PASS=your_brevo_smtp_key
```

```bash
npm start
# Server running at http://localhost:8080
```

### 3. Configure & Run the Frontend

```bash
cd ../frontend
npm install
```

Create a `.env` file inside `frontend/`:

```env
VITE_OAUTH_CLIENT_ID=your_auth_id
REACT_APP_OAUTH_CLIENT_SECRET=your_auth_secret
REACT_APP_OAUTH_REDIRECT_URI=http://localhost:3000/auth/callback

VITE_BACKEND_URL=http://localhost:8080

VITE_RAZORPAY_KEY_ID=razr_pay_id
```

```bash
npm run dev
# App running at http://localhost:5173
```

---

## ⚡ Performance Deep Dive

| Optimization | Implementation | Impact |
|:---|:---|:---|
| **Database Projection** | Selective `select()` fields in Mongoose queries | Reduced API payload size |
| **Infinite Scroll** | Intersection Observer API, batch size of 12 | Consistent 60fps on large catalogs |
| **Inventory Locking** | 15-minute cron job releases unpaid order stock | Prevents ghost inventory depletion |
| **Image CDN** | All assets served via Cloudinary with auto-format | Faster LCP, WebP delivery |

---

## 🗺️ Roadmap

- [ ] Wishlist & save-for-later with persistent state
- [ ] Razorpay payment gateway integration
- [ ] Push notifications for restock alerts

---

## 👥 Team

<div align="center">

| | Name | Role |
|:---:|:---|:---|
| 🧑‍💻 | **Jeetu Prasad** | Lead Developer & AI Integration |
| 🧑‍💻 | **Mayuri Pasi** | Frontend Architect & UI/UX Design |

</div>

---

## 📄 License

This project is for educational and portfolio purposes.

---

<div align="center">

Made with ❤️ and a love for beautiful things.

**[⭐ Star this repo](https://github.com/yourusername/zyro-jewel-box)** if you found it interesting!

</div>
