import { useContext, useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ShopContext } from "../config/ShopContext";
import axios from "axios";
import Tooltip from "./Tooltip";
import { toast } from "react-toastify";

const Navbar = () => {
  const { backendUrl, user, setUser, getCartCount, getWishlistCount } = useContext(ShopContext);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const getUsername = user?.username || `${user.firstName + " " + user.lastName}`
  const role = localStorage.getItem('role');

  const nonTransRoutes = [
    "/login",
    "/signup",
    "/checkout",
    "/userAccount",
  ];

  const isTransPage = !nonTransRoutes.some(path =>
    location.pathname.startsWith(path)
  );

  const isSolidPage = [
    "/faq",
    "/returnPolicy",
    "/privacyPolicy",
    "/shippingPolicy",
    "/signup",
    "/login",
    "/verify-email",
    "/forgot-password",
    "/userAccount",
    "/userAccount/order",
    "/userAccount/cancel",
    "/userAccount/coins",
    "/new-arrivals",
    "/cart",
    
  ].includes(location.pathname);

  const categories = [
    { name: "Earrings", path: "/category/earrings" },
    { name: "Necklaces", path: "/category/necklaces" },
    { name: "Bracelets", path: "/category/bracelets" },
    { name: "Rings", path: "/category/rings" },
  ];

  const handleLogout = async () => {
    try {
      // 1. Determine the endpoint based on the role
      const role = localStorage.getItem('role');
      const endpoint = role === 'admin' ? "/api/admin/logout" : "/api/user/logout";

      // 2. Make the call
      const { data } = await axios.post(backendUrl + endpoint);

      if (data.success) {
        localStorage.removeItem('role');

        setUser({
          firstName: "",
          lastName: "",
          isLoggedIn: false,
        });

        toast.success(data.message || "Logged out successfully");

        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      }
    } catch (err) {
      toast.error("Logout failed. Please try again.");
      console.error("Logout error:", err);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Responsive: Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
    } else {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    };
  }, [isMobileMenuOpen]);

  let navStateClass;
  if (isTransPage) {
    navStateClass = isScrolled
      ? "bg-white/80 shadow-md text-black backdrop-blur-md"
      : "bg-transparent text-black";
  } else if (isSolidPage) {
    navStateClass = isScrolled

      ? "bg-white/80 shadow-md text-black backdrop-blur-md"
      : "bg-white text-black";
  } else {
    navStateClass = "bg-white text-black shadow-sm";
  }

  return (
    <>
      <nav
        className={`animate-slideDown flex items-center justify-between h-20 px-4 lg:px-8 fixed top-0 left-0 w-full z-50 transition-all duration-500 ${navStateClass}`}
      >
        {/* Left - Hamburger Menu (Mobile/Tablet) */}
        <div className="flex items-center lg:hidden">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Center - Logo */}
        <div className="relative flex items-center">
          <div className="logo absolute left-1/2 -translate-x-1/2 lg:static lg:translate-x-0">
            <NavLink to="/">
              <img
                src="/images/darkH.png"
                className="max-w-25 sm:max-w-30 lg:max-w-32.5 object-contain"
                alt="Logo"
              />
            </NavLink>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex">
          <ul className="flex gap-10 title">
            <li className="relative group">
              <span className="cursor-pointer hover:text-(--color-gold) transition-colors">
                Categories
              </span>
              <span className="down-arrow down-arrow-black ml-1"></span>
              <div className="absolute top-10 left-0 opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-2 transition-all duration-300 ease-in-out z-10">
                <ul className="bg-white/95 backdrop-blur-md text-black shadow-xl min-w-42.5 py-1 border border-(--color-green)/20 rounded-lg">
                  {categories.map((cat) => (
                    <li key={cat.name}>
                      <NavLink
                        to={cat.path}
                        className="block px-7 py-2 hover:bg-(--color-green)/10 hover:text-(--color-gold) transition-all"
                      >
                        {cat.name}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
            <NavLink to="/new-arrivals">
              <li className="hover:text-(--color-gold) transition-colors">
                New Arrivals
              </li>
            </NavLink>
            <NavLink to="/about">
              <li className="hover:text-(--color-gold) transition-colors">
                About Us
              </li>
            </NavLink>
            <NavLink to="/contact">
              <li className="hover:text-(--color-gold) transition-colors">
                Contact Us
              </li>
            </NavLink>
          </ul>
        </nav>

        {/* Right - Icons */}
        <div className="flex items-center gap-4">
          {/* Search - Desktop Only */}

          <NavLink to="/search" className="hidden lg:block">
            <lord-icon
              src="https://cdn.lordicon.com/xaekjsls.json"
              trigger="hover"
              colors="primary:#3f3f3f,secondary:#b4b4b4"
              style={{ width: "25px", height: "25px" }}
            ></lord-icon>
          </NavLink>


          {/* Account - Desktop Dropdown */}
          <div className="relative group hidden lg:block cursor-pointer">
            <NavLink to={user.isLoggedIn ? "" : "/login"}>
              <lord-icon
                src="https://cdn.lordicon.com/kdduutaw.json"
                trigger="hover"
                stroke="bold"
                colors={user.isLoggedIn ? "primary:#2e4a3e,secondary:#c6a664" : "primary:#000000,secondary:#3f3f3f"}
                style={{ width: "25px", height: "25px" }}
              ></lord-icon>
            </NavLink>

            {/* Account Dropdown UI */}
            {user.isLoggedIn ? (
              <div className="absolute top-10 right-0 w-70 bg-white border border-(--color-green)/20 shadow-2xl rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-2 transition-all duration-300 ease-in-out z-10">
                <div className="flex items-center p-0 mb-2 border-b border-gray-100 pb-2">
                  <img src="https://img.freepik.com/premium-vector/user-icon-vector_1272330-86.jpg" className="w-10 h-10 rounded-full mr-3" alt="User" />
                  <h1 className="title text-lg text-(--color-gold)">
                    <span className="font-semibold truncate block max-w-37.5">{getUsername}</span>
                  </h1>
                </div>
                <div className="para">
                  <ul className="flex flex-col text-sm">
                    <NavLink to={role === 'user' ? '/userAccount' : '/admin'}>
                      <li className="hover:bg-gray-50 p-2 rounded-md transition-colors">My Account</li>
                    </NavLink>
                    <li
                      onClick={handleLogout}
                      className="hover:bg-gray-50 p-2 rounded-md transition-colors cursor-pointer text-red-500"
                    >
                      Logout
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="absolute top-10 right-0 w-85 para bg-white border border-(--color-green)/20 shadow-xl rounded-lg p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-2 transition-all duration-300 ease-in-out z-10">
                <p className="text-sm mb-5 text-center">
                  Access your account & manage orders
                </p>
                <div className="flex justify-center gap-4 text-sm">
                  <NavLink to="/signup">
                    <button className="bg-(--color-green) hover:cursor-pointer text-white rounded-lg px-4 py-2 hover:bg-(--color-gold) transition-all duration-500">
                      Sign Up
                    </button>
                  </NavLink>
                  <NavLink to="/login">
                    <button className="bg-(--color-green) hover:cursor-pointer text-white rounded-lg px-4 py-2 hover:bg-(--color-gold) transition-all duration-500">
                      Login
                    </button>
                  </NavLink>
                </div>
              </div>
            )}
          </div>

          {/* Wishlist - Desktop Only */}
          <Tooltip text={"Wislist"}>
            <NavLink to="/wishlist" className="hidden lg:block">
              <lord-icon
                src="https://cdn.lordicon.com/nvsfzbop.json"
                trigger="hover"
                stroke="bold"
                colors="primary:#000000,secondary:#3f3f3f"
                style={{ width: "25px", height: "25px" }}
              ></lord-icon>
              {getWishlistCount() > 0 && (
                <span
                  key={getWishlistCount()}
                  className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-(--color-green) text-[10px] font-bold text-white shadow-sm animate-[bounce_1s_ease-in-out]">
                  {getWishlistCount()}
                </span>
              )}
            </NavLink>
          </Tooltip>

          {/* Cart - Always Visible */}
          <Tooltip text={"Cart"}>
            <a href="/cart" className="relative inline-flex items-center p-1">
              <lord-icon
                src="https://cdn.lordicon.com/zmvzumis.json"
                trigger="hover"
                colors="primary:#3f3f3f,secondary:#b4b4b4"
                style={{ width: "28px", height: "28px" }}
              ></lord-icon>

              {/* Cart Count Badge */}
              {getCartCount() > 0 && (
                <span
                  key={getCartCount()}
                  className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-(--color-green) text-[10px] font-bold text-white shadow-sm animate-[bounce_1s_ease-in-out]">
                  {getCartCount()}
                </span>
              )}
            </a>
          </Tooltip>

          {/* Account - Mobile (Click to Login) */}
          <NavLink to={user.isLoggedIn ? "/userAccount" : "/login"} className="lg:hidden">
            <lord-icon
              src="https://cdn.lordicon.com/kdduutaw.json"
              trigger="hover"
              stroke="bold"
              colors={user.isLoggedIn ? "primary:#2e4a3e,secondary:#c6a664" : "primary:#000000,secondary:#3f3f3f"}
              style={{ width: "25px", height: "25px" }}
            ></lord-icon>
          </NavLink>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div className={`fixed inset-0 bg-black/50 z-60 lg:hidden transition-opacity duration-300 ${isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Mobile Menu Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-[85vw] max-w-[320px] bg-white z-70 lg:hidden transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Menu</h2>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Menu Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Categories - Direct Links */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
                Categories
              </h3>
              <div className="space-y-1">
                {categories.map((cat) => (
                  <NavLink
                    key={cat.name}
                    to={cat.path}
                    className="block py-3 px-3 text-gray-800 hover:text-(--color-gold) hover:bg-gray-50 rounded-lg transition-all"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {cat.name}
                  </NavLink>
                ))}
              </div>
            </div>

            {/* Main Navigation */}
            <div className="space-y-1 pt-4 border-t border-gray-200">
              <NavLink
                to="/new-arrivals"
                className="block py-3 px-3 text-gray-800 font-medium hover:text-(--color-gold) hover:bg-gray-50 rounded-lg transition-all"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                New Arrivals
              </NavLink>
              <NavLink
                to="/about"
                className="block py-3 px-3 text-gray-800 font-medium hover:text-(--color-gold) hover:bg-gray-50 rounded-lg transition-all"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                About Us
              </NavLink>
              <NavLink
                to="/contact"
                className="block py-3 px-3 text-gray-800 font-medium hover:text-(--color-gold) hover:bg-gray-50 rounded-lg transition-all"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Contact Us
              </NavLink>
            </div>

            {/* Utilities */}
            <div className="space-y-1 pt-4 border-t border-gray-200 mt-4">
              <NavLink
                to="/search"
                className="flex items-center gap-3 py-3 px-3 text-gray-800 hover:text-(--color-gold) hover:bg-gray-50 rounded-lg transition-all"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <span className="font-medium">Search</span>
              </NavLink>
              <NavLink
                to="/wishlist"
                className="flex items-center gap-3 py-3 px-3 text-gray-800 hover:text-(--color-gold) hover:bg-gray-50 rounded-lg transition-all"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                <span className="font-medium">Wishlist</span>
              </NavLink>
            </div>
          </div>

          {/* Account Section Mobile */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            {user.isLoggedIn ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <img src="https://img.freepik.com/premium-vector/user-icon-vector_1272330-86.jpg" className="w-8 h-8 rounded-full" alt="" />
                  <p className="text-sm text-gray-600">
                    Logged in as <span className="font-semibold text-gray-800">{getUsername}</span>
                  </p>
                </div>
                <NavLink
                  to={role === 'user' ? '/userAccount' : '/admin'}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-center text-sm font-medium mb-2"
                >
                  My Account
                </NavLink>

                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full bg-(--color-green) text-white px-4 py-3 rounded-lg hover:bg-(--color-gold) transition-all duration-300 font-medium"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 text-center mb-2">
                  Access your account & manage orders
                </p>
                <NavLink
                  to="/signup"
                  className="block w-full bg-(--color-green) text-white px-4 py-3 rounded-lg hover:bg-(--color-gold) transition-all duration-300 text-center font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign Up
                </NavLink>
                <NavLink
                  to="/login"
                  className="block w-full bg-white border-2 border-(--color-green) text-(--color-green) px-4 py-3 rounded-lg hover:bg-gray-50 transition-all duration-300 text-center font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Login
                </NavLink>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Navbar;
