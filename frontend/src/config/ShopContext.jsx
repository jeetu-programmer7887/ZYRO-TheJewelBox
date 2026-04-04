import { createContext, useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
const backendUrl = import.meta.env.VITE_BACKEND_URL;

export const ShopContext = createContext();

const ShopContextProvider = (props) => {
  const currency = "₹";
  const deliveryFee = 50;

  const [newArrivals, setNewArrivals] = useState([])

  const [otp, setTotp] = useState("");
  const [user, setUser] = useState({});
  const [allProducts, setAllProducts] = useState([]);
  const [cartItems, setCartItems] = useState({});
  const [cartData, setCartData] = useState([]);
  const [wishlist, setWishlist] = useState(() => {
    const localData = localStorage.getItem('wishlist');
    return localData ? JSON.parse(localData) : [];
  });

  // Authentication Check 
  useEffect(() => {
    const checkAuth = async () => {
      const role = localStorage.getItem('role');
      if (role === 'user') {
        try {
          const response = await axios.get(backendUrl + "/api/user/me");
          if (response.data.success && response.status === 200) {
            console.log("Role : " + localStorage.getItem('role'));
            setUser({ ...response.data, isLoggedIn: true });
          }
        } catch (error) {
          setUser({ isLoggedIn: false });
          console.log("Auth: No active session (Guest Mode)");
        }
      } else {
        try {
          console.log("Route : ", backendUrl + "/api/admin/me");
          const response = await axios.get(backendUrl + "/api/admin/me");
          if (response.data.success && response.status === 200) {
            console.log("Role : " + localStorage.getItem('role'));
            setUser({ ...response.data, isLoggedIn: true });
          }
        } catch (error) {
          setUser({ isLoggedIn: false });
          console.log("Auth: No active session (Guest Mode)");
        }
      }
    };
    checkAuth();
  }, []);

  // Product Data Fetching 
  const getProductData = async () => {
    try {
      const response = await axios.get(backendUrl + "/api/products/list");
      if (response.data.success) {
        setAllProducts(response.data.allProducts);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log("Product Fetching Error:", error);
    }
  };

  useEffect(() => {
    getProductData();
  }, []);

  const filterNewArrivals = async () => {
    try {
      if (allProducts && allProducts.length > 0) {

        // Group products by category
        const productsByCategory = allProducts.reduce((acc, item) => {
          const category = item.category || 'uncategorized';
          if (!acc[category]) {
            acc[category] = [];
          }
          acc[category].push(item);
          return acc;
        }, {});

        console.log("Categories found:", Object.keys(productsByCategory));

        // From each category, pick the 8 most recently added products
        const newArrivalsPerCategory = Object.values(productsByCategory).flatMap(categoryProducts => {
          return [...categoryProducts]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 8);
        });

        // If no products found at all, fallback to top 8 overall
        if (newArrivalsPerCategory.length === 0) {
          const fallback = [...allProducts]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 8);
          setNewArrivals(fallback);
        } else {
          setNewArrivals(newArrivalsPerCategory);
        }
      }
    } catch (error) {
      console.error("Error in loading New Arrivals Products:", error);
    }
  };

  useEffect(() => {
    filterNewArrivals()
  }, [allProducts])

  useEffect(() => {
    if (user.isLoggedIn) {
      getUserCart();
    } else {
      setCartItems({});
    }
  }, [user.isLoggedIn]);

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
      toast.info("Item already in wishlist");
      return;
    }

    setWishlist(prev => {
      const updated = [...prev, itemId];

      if (!user.isLoggedIn) {
        localStorage.setItem('wishlist', JSON.stringify(updated));
      }

      return updated;
    });

    if (user.isLoggedIn) {
      try {
        await axios.post(backendUrl + '/api/cart/add-wish', { itemId });
        toast.success("Added to wishlist");
        toast
      } catch (error) {
        console.error("Wishlist Sync Error:", error);
      }
    } else {
      toast.success("Added to wishlist");
    }
  };

  // Remove from Wishlist
  const removeFromWishlist = async (itemId) => {

    setWishlist(prev => prev.filter(id => id !== itemId));

    if (user.isLoggedIn) {
      try {
        await axios.put(backendUrl + '/api/cart/remove', { itemId }, { new: true });
      } catch (error) {
        console.error("Wishlist Remove Error:", error);
      }
    }
  };

  useEffect(() => {
    const handleLoginTransition = async () => {
      if (user.isLoggedIn) {

        const localWishlist = JSON.parse(localStorage.getItem('wishlist')) || [];

        if (localWishlist.length > 0) {
          try {
            await axios.post(backendUrl + '/api/cart/merge-wishlist', { guestWishlist: localWishlist });
            localStorage.removeItem('wishlist');
          } catch (error) {
            console.error("Failed to merge wishlist:", error);
          }
        }

        getUserCart();
        getWishlistData();
      } else {
        const localData = localStorage.getItem('wishlist');
        setWishlist(localData ? JSON.parse(localData) : []);
        setCartItems({});
      }
    };

    handleLoginTransition();
  }, [user.isLoggedIn]);


  // Cart Logic 
  const addToCart = async (itemId) => {
    let cartData = structuredClone(cartItems);
    cartData[itemId] = (cartData[itemId] || 0) + 1;
    setCartItems(cartData);

    if (user.isLoggedIn) {
      try {
        await axios.post(backendUrl + '/api/cart/add', { itemId });
      } catch (error) {
        console.error("Cart Add Error:", error);
        toast.error(error.message);
      }
    }
  };

  const getUserCart = async () => {
    try {
      const response = await axios.get(backendUrl + '/api/cart/get');
      if (response.data.success) {
        setCartItems(response.data.cartData);
      }
    } catch (error) {
      console.error("Get Cart Error:", error);
    }
  }

  const updateQuantity = async (itemId, quantity) => {
    let cartData = structuredClone(cartItems);
    if (quantity <= 0) {
      delete cartData[itemId];
    } else {
      cartData[itemId] = quantity;
    }
    setCartItems(cartData);

    if (user.isLoggedIn) {
      try {
        await axios.patch(backendUrl + '/api/cart/update', { itemId, quantity });
      } catch (error) {
        console.error("Update Quantity Error:", error);
        getUserCart();
      }
    }
  };

  const getCartCount = () => {
    let totalItems = 0;
    for (let item in cartItems) {
      if (cartItems[item] > 0) totalItems += cartItems[item];
    }
    return totalItems;
  }

  const getWishlistCount = () => {
    return wishlist.length;
  }

  //Order Place
  useEffect(() => {
    if (allProducts.length > 0) {
      const tempData = [];
      for (const items in cartItems) {
        if (cartItems[items] > 0) {
          //Product details from allProducts array using the ID
          const productInfo = allProducts.find((product) => product._id === items);
          if (productInfo) {
            tempData.push({
              id: productInfo.slug,
              quantity: cartItems[items],
              ...productInfo
            });
          }
        }
      }
      setCartData(tempData);
    }
  }, [cartItems, allProducts]);

  // Provider Value 
  const value = {
    otp, setTotp,
    user, setUser, backendUrl,
    allProducts, currency, deliveryFee,
    addToCart, cartItems, setCartItems, updateQuantity, getCartCount,
    wishlist, addToWishlist, removeFromWishlist, getWishlistData, getWishlistCount,
    cartData, newArrivals,
  };

  return (
    <ShopContext.Provider value={value}>{props.children}</ShopContext.Provider>
  );
};

export default ShopContextProvider;
