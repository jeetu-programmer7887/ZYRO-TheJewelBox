import { useState, useContext, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ShopContext } from '../config/ShopContext';
import { BarChart3 } from 'lucide-react'; // Added missing icon import

const AdminPanel = () => {
  const { user } = useContext(ShopContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const navOptions = [
    { name: "DASHBOARD", path: "/admin/dashboard" }, 
    { name: "ADD ITEM", path: "/admin/add" },
    { name: "LIST ITEMS", path: "/admin/list" },
    { name: "ORDERS", path: "/admin/orders" },
    { name: "REVIEWS", path: "/admin/reviews" },
  ];

  useEffect(() => {
    
    if (location.pathname === '/admin' || location.pathname === '/admin/') {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [location, navigate]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const sidebarLinkCSS = ({ isActive }) =>
    `flex items-center gap-3 py-6 px-10 xl:px-20 transition-all duration-200 border-b border-gray-400 hover:bg-(--color-green) hover:text-(--color-gold) ${
      isActive ? "text-(--color-gold) bg-(--color-green) font-bold" : ""
    }`;

  const currentOptionName = navOptions.find(opt => opt.path === location.pathname)?.name || "DASHBOARD";

  return (
    <div className="flex flex-col lg:flex-row pt-16 lg:pt-20 min-h-screen bg-white">

      {/* Sidebar - Desktop */}
      <div className="hidden lg:flex flex-col lg:w-1/5 border-r bg-(--color-lightgreen) border-gray-400">
        <div className="name py-9 px-10 xl:px-15 border-b border-gray-400">
          <h1 className="text-2xl font-bold text-(--color-gold) truncate tracking-normal">
            ADMIN PANEL
          </h1>
          <p className="text-gray-500 text-sm truncate mt-1 font-normal">Management & Controls</p>
        </div>
        <nav className="flex flex-col">
          {navOptions.map((opt) => (
            <NavLink
              key={opt.path}
              to={opt.path}
              end
              className={sidebarLinkCSS}
            >
              {/* Show icon only for Dashboard to keep it distinct */}
              {opt.name === "DASHBOARD" && <BarChart3 size={20} />}
              {opt.name}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Mobile/Tablet Header */}
      <div className="lg:hidden w-full bg-(--color-lightgreen) border-b border-gray-300">
        <div className="flex flex-col items-center justify-center pt-10 pb-6 px-5 text-center">
          <h1 className="text-3xl font-bold text-(--color-gold) tracking-tight">
            ADMIN PANEL
          </h1>
          <p className="text-gray-500 text-sm mt-1 font-normal">
            Management & Controls
          </p>
        </div>

        <div className="px-6 pb-10" ref={dropdownRef}>
          <label className="block text-center text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-[2px]">
            Admin Menu
          </label>

          <div className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center justify-between w-full bg-white border border-(--color-gold) text-gray-700 py-3.5 px-6 rounded-full text-sm font-medium shadow-sm transition-all ease-in-out duration-200"
            >
              <span className="flex items-center gap-2">
                {currentOptionName === "DASHBOARD" && <BarChart3 size={18} className="text-(--color-gold)" />}
                {currentOptionName}
              </span>
              <svg
                className={`w-4 h-4 text-(--color-gold) transition-transform duration-300 ease-in-out ${isOpen ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            <div
              className={`absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden transition-all duration-300 ease-in-out ${
                isOpen ? "opacity-100 visible" : "opacity-0 invisible"
              }`}
            >
              {navOptions.map((opt) => (
                <button
                  key={opt.path}
                  onClick={() => {
                    navigate(opt.path);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-6 py-4 text-sm transition-colors border-b last:border-none border-gray-50 flex items-center gap-3 ${
                    location.pathname === opt.path
                      ? "bg-(--color-green) text-(--color-gold) font-bold"
                      : "text-gray-600 active:bg-gray-50"
                  }`}
                >
                  {opt.name === "DASHBOARD" && <BarChart3 size={18} />}
                  {opt.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <main className="content w-full lg:w-4/5">
        <div className="p-6 lg:p-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;