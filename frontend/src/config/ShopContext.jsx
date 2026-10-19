/* eslint-disable react-hooks/exhaustive-deps */
import { createContext, useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
const backendUrl = import.meta.env.VITE_BACKEND_URL;

// eslint-disable-next-line react-refresh/only-export-components
export const ShopContext = createContext();

const PRODUCTS_CACHE_KEY = 'zyro:products:v1';
const PRODUCTS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Storage can throw (private mode, blocked site data), so every access is guarded.
const readJSON = (storage, key, fallback) => {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};
const writeJSON = (storage, key, value) => {
  try { storage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
};

const ShopContextProvider = (props) => {
  const currency = "₹";
  const deliveryFee = 50;

  const [otp, setTotp] = useState("");
  const [user, setUser] = useState({});
  // Tracks whether the initial "am I logged in?" check has finished.
  // Route guards wait on this so they don't redirect a real user before
  // we actually know their auth state.
  const [authChecked, setAuthChecked] = useState(false);

  // Show the last product list instantly (stale-while-revalidate), then refresh it.
  const cachedProducts = readJSON(sessionStorage, PRODUCTS_CACHE_KEY, null);
  const [allProducts, setAllProducts] = useState(cachedProducts?.items || []);
  const [productsLoading, setProductsLoading] = useState(!cachedProducts?.items?.length);

  const [cartItems, setCartItems] = useState({});
  // Bumped whenever the server confirms a cart change; server-priced views
  // (bag, checkout) re-fetch their quote when it changes.
  const [cartVersion, setCartVersion] = useState(0);
  const bumpCart = () => setCartVersion(v => v + 1);
  // True until we know whether there is a cart to load (and it has loaded)
  const [cartLoading, setCartLoading] = useState(true);
  const [wishlist, setWishlist] = useState(() => readJSON(localStorage, 'wishlist', []));

  // ── Session ──────────────────────────────────────────────
  // The session lives in an httpOnly cookie, so the server is the only
  // source of truth for who is logged in. refreshSession() re-syncs the
  // user from /api/user/session; concurrent callers share one request.
  const sessionRequest = useRef(null);
  const lastSessionCheck = useRef(0);
  const refreshSession = ({ silent = false } = {}) => {
    if (sessionRequest.current) return sessionRequest.current;
    sessionRequest.current = (async () => {
      try {
        const { data } = await axios.get(backendUrl + "/api/user/session");
        lastSessionCheck.current = Date.now();
        if (data.loggedIn) {
          const next = { ...data.user, role: data.role, isLoggedIn: true };
          // Keep the same object when nothing changed, so a background
          // re-check never re-renders forms the customer is typing in.
          setUser(prev => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
          return true;
        }
        setUser(prev => {
          if (prev.isLoggedIn && !silent) {
            toast.info('Your session has ended. Please log in again.', { toastId: 'session-expired' });
          }
          return prev.isLoggedIn === false ? prev : { isLoggedIn: false, role: null };
        });
        return false;
      } catch {
        // Network error: keep the current state rather than logging out
        return null;
      } finally {
        sessionRequest.current = null;
      }
    })();
    return sessionRequest.current;
  };

  useEffect(() => {
    const checkAuth = async () => {
      const result = await refreshSession({ silent: true });
      if (result === null) setUser({ isLoggedIn: false, role: null }); // offline on first load
      setAuthChecked(true);
    };
    checkAuth();
  }, []);

  // Re-check when the customer comes back to the tab (e.g. they logged out
  // or reset their password in another tab), at most once a minute.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastSessionCheck.current > 60 * 1000) {
        refreshSession();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, []);

  const logout = async () => {
    try {
      await axios.post(backendUrl + "/api/user/logout");
    } catch (error) {
      console.error("Logout error:", error);
    }
    setUser({ isLoggedIn: false, role: null });
    setCartItems({});
  };

  // Product Data Fetching
  const getProductData = async () => {
    const cached = readJSON(sessionStorage, PRODUCTS_CACHE_KEY, null);
    if (cached?.items?.length && Date.now() - cached.savedAt < PRODUCTS_CACHE_TTL) {
      setProductsLoading(false);
      return;
    }
    try {
      const response = await axios.get(backendUrl + "/api/products/list");
      if (response.data.success) {
        setAllProducts(response.data.allProducts);
        writeJSON(sessionStorage, PRODUCTS_CACHE_KEY, { items: response.data.allProducts, savedAt: Date.now() });
      } else {
        toast.error(response.data.message);
      }
    } catch {
      if (!cached?.items?.length) {
        toast.error("Couldn't load products. Please check your connection and refresh.", { toastId: 'products-error' });
      }
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    getProductData();
  }, []);

  // From each category, the 8 most recently added products
  const newArrivals = useMemo(() => {
    if (!allProducts?.length) return [];
    const byNewest = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);

    const productsByCategory = allProducts.reduce((acc, item) => {
      const category = item.category || 'uncategorized';
      (acc[category] ||= []).push(item);
      return acc;
    }, {});

    const perCategory = Object.values(productsByCategory)
      .flatMap(categoryProducts => [...categoryProducts].sort(byNewest).slice(0, 8));

    return perCategory.length ? perCategory : [...allProducts].sort(byNewest).slice(0, 8);
  }, [allProducts]);

  // Wishlist Logic
  const getWishlistData = async () => {
    try {
      const response = await axios.get(backendUrl + '/api/cart/get-wish');
      if (response.data.success) {
        setWishlist(response.data.wishlistData || []);
      }
    } catch (error) {
      console.error("Get Wishlist Error:", error);
    }
  }

  // Add to Wishlist
  const addToWishlist = async (itemId) => {
    if (wishlist.includes(itemId)) {
      toast.info("Item already in wishlist", { toastId: `wish-${itemId}` });
      return;
    }

    setWishlist(prev => {
      const updated = [...prev, itemId];
      if (!user.isLoggedIn) writeJSON(localStorage, 'wishlist', updated);
      return updated;
    });

    if (user.isLoggedIn) {
      try {
        await axios.post(backendUrl + '/api/cart/add-wish', { itemId });
        toast.success("Added to wishlist", { toastId: `wish-${itemId}` });
      } catch (error) {
        console.error("Wishlist Sync Error:", error);
        setWishlist(prev => prev.filter(id => id !== itemId));
        toast.error("Couldn't add to wishlist. Please try again.");
      }
    } else {
      toast.success("Added to wishlist", { toastId: `wish-${itemId}` });
    }
  };

  // Remove from Wishlist
  const removeFromWishlist = async (itemId) => {
    setWishlist(prev => {
      const updated = prev.filter(id => id !== itemId);
      if (!user.isLoggedIn) writeJSON(localStorage, 'wishlist', updated);
      return updated;
    });

    if (user.isLoggedIn) {
      try {
        await axios.put(backendUrl + '/api/cart/remove', { itemId });
      } catch (error) {
        console.error("Wishlist Remove Error:", error);
        getWishlistData();
      }
    }
  };

  // A 401 while we think someone is logged in doesn't always mean the
  // session is gone (e.g. an admin hitting a customer-only endpoint), so
  // ask the server before changing the UI.
  const isLoggedInRef = useRef(false);
  isLoggedInRef.current = !!user.isLoggedIn;
  useEffect(() => {
    const id = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const url = error.config?.url || '';
        const isAuthCall = /\/api\/user\/(login|google|register|verify-email|resend-otp|forgot-password|reset-password|session)|\/api\/admin\/verify/.test(url);
        if (error.response?.status === 401 && isLoggedInRef.current && !isAuthCall) {
          refreshSession();
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(id);
  }, []);

  // Login / logout transitions: merge the guest wishlist, then load the
  // account's cart and wishlist. On logout, fall back to guest data so the
  // previous user's items never stay on screen.
  const prevLoggedIn = useRef(undefined);
  useEffect(() => {
    if (prevLoggedIn.current === user.isLoggedIn) return;
    prevLoggedIn.current = user.isLoggedIn;

    const handleLoginTransition = async () => {
      if (user.isLoggedIn) {
        const localWishlist = readJSON(localStorage, 'wishlist', []);

        if (localWishlist.length > 0) {
          try {
            await axios.post(backendUrl + '/api/cart/merge-wishlist', { guestWishlist: localWishlist });
            try { localStorage.removeItem('wishlist'); } catch { /* ignore */ }
          } catch (error) {
            console.error("Failed to merge wishlist:", error);
          }
        }

        if (user.role === 'user') {
          await Promise.all([getUserCart(), getWishlistData()]);
        }
        setCartLoading(false);
      } else {
        setWishlist(readJSON(localStorage, 'wishlist', []));
        setCartItems({});
        if (user.isLoggedIn === false) setCartLoading(false);
      }
    };

    handleLoginTransition();
  }, [user.isLoggedIn]);


  // Cart Logic
  const addToCart = async (itemId) => {
    if (!user.isLoggedIn) {
      toast.info("Please log in to add items to your cart", { toastId: 'login-to-cart' });
      return false;
    }

    const previous = cartItems;
    setCartItems(prev => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));

    try {
      const { data } = await axios.post(backendUrl + '/api/cart/add', { itemId });
      if (data && data.success === false) throw new Error(data.message);
      bumpCart();
      return true;
    } catch (error) {
      console.error("Cart Add Error:", error);
      setCartItems(previous);
      toast.error(error.response?.data?.message || error.message || "Couldn't add to cart", { toastId: `cart-${itemId}` });
      return false;
    }
  };

  const getUserCart = async () => {
    try {
      const response = await axios.get(backendUrl + '/api/cart/get');
      if (response.data.success) {
        setCartItems(response.data.cartData || {});
        bumpCart();
      }
    } catch (error) {
      console.error("Get Cart Error:", error);
    }
  }

  const updateQuantity = async (itemId, quantity) => {
    setCartItems(prev => {
      const next = { ...prev };
      if (quantity <= 0) delete next[itemId];
      else next[itemId] = quantity;
      return next;
    });

    if (user.isLoggedIn) {
      try {
        const { data } = await axios.patch(backendUrl + '/api/cart/update', { itemId, quantity });
        if (data && data.success === false) throw new Error(data.message);
        bumpCart();
      } catch (error) {
        console.error("Update Quantity Error:", error);
        toast.error(error.response?.data?.message || "Couldn't update quantity", { toastId: `qty-${itemId}` });
        getUserCart();
      }
    }
  };

  const getCartCount = () => {
    let totalItems = 0;
    for (const item in cartItems) {
      if (cartItems[item] > 0) totalItems += cartItems[item];
    }
    return totalItems;
  }

  const getWishlistCount = () => wishlist.length;

  // Cart lines joined with product details (used by Cart and checkout)
  const cartData = useMemo(() => {
    if (!allProducts.length) return [];
    const byId = new Map(allProducts.map(p => [p._id, p]));
    const lines = [];
    for (const id in cartItems) {
      if (cartItems[id] > 0) {
        const productInfo = byId.get(id);
        if (productInfo) {
          lines.push({ id: productInfo.slug, quantity: cartItems[id], ...productInfo });
        }
      }
    }
    return lines;
  }, [cartItems, allProducts]);

  // Provider Value: memoized so consumers only re-render when shared state changes
  const value = useMemo(() => ({
    otp, setTotp,
    user, setUser, authChecked, backendUrl, logout, refreshSession,
    allProducts, productsLoading, refreshProducts: getProductData, cartLoading,
    currency, deliveryFee,
    addToCart, cartItems, setCartItems, updateQuantity, getCartCount, cartVersion, refreshCart: getUserCart,
    wishlist, addToWishlist, removeFromWishlist, getWishlistData, getWishlistCount,
    cartData, newArrivals,
  }), [otp, user, authChecked, allProducts, productsLoading, cartLoading, cartItems, cartVersion, wishlist, cartData, newArrivals]);

  return (
    <ShopContext.Provider value={value}>{props.children}</ShopContext.Provider>
  );
};

export default ShopContextProvider;
