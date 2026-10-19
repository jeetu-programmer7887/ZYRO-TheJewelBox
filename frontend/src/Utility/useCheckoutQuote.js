import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { ShopContext } from '../config/ShopContext';

/**
 * The customer's bag priced by the server: lines, stock limits, delivery
 * fee, coin discount and total. The browser never computes money.
 * Re-fetches whenever the server confirms a cart change or the coin toggle changes.
 */
const useCheckoutQuote = ({ useCoins = false, enabled = true } = {}) => {
  const { backendUrl, cartVersion, user } = useContext(ShopContext);
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestId = useRef(0);

  const fetchQuote = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const { data } = await axios.post(`${backendUrl}/api/order/quote`, { useCoins });
      if (id !== requestId.current) return null; // a newer request superseded this one
      setQuote(data.quote);
      setError(null);
      return data.quote;
    } catch (err) {
      if (id !== requestId.current) return null;
      setError(err.response?.data?.message || "Couldn't load your bag. Please try again.");
      return null;
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [backendUrl, useCoins]);

  useEffect(() => {
    if (!enabled || !user?.isLoggedIn) {
      setLoading(false);
      return undefined;
    }
    const timer = setTimeout(fetchQuote, 150);
    return () => clearTimeout(timer);
  }, [cartVersion, fetchQuote, enabled, user?.isLoggedIn]);

  return { quote, loading, error, refresh: fetchQuote, setQuote };
};

export default useCheckoutQuote;
