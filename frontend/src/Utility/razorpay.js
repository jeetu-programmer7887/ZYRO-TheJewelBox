// Loads Razorpay Checkout only when a customer actually pays, instead of on
// every page, and wraps it in a Promise. Everything the modal needs (key,
// amount, order id, prefill) comes from the backend's `checkout` payload.
const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';
let scriptPromise = null;

const loadScript = () => {
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => (window.Razorpay ? resolve() : reject(new Error('Razorpay unavailable')));
    script.onerror = () => {
      scriptPromise = null; // allow a retry
      script.remove();
      reject(new Error('Razorpay script failed to load'));
    };
    document.body.appendChild(script);
  });
  return scriptPromise;
};

const checkoutError = (code, message, description) => {
  const error = new Error(message);
  error.code = code;
  error.description = description;
  return error;
};

/**
 * Opens Razorpay Checkout for a backend-created order.
 * Resolves with { razorpay_order_id, razorpay_payment_id, razorpay_signature }.
 * Rejects with error.code = 'DISMISSED' | 'PAYMENT_FAILED' | 'SCRIPT_LOAD_FAILED'.
 */
export const openRazorpayCheckout = async (checkout, { theme = '#2e4a3e' } = {}) => {
  try {
    await loadScript();
  } catch {
    throw checkoutError('SCRIPT_LOAD_FAILED', "Couldn't load the payment window. Please check your connection and try again.");
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let lastFailure = null;
    const settle = (fn, value) => {
      if (settled) return;
      settled = true;
      fn(value);
    };

    const rzp = new window.Razorpay({
      key: checkout.keyId,
      order_id: checkout.razorpayOrderId,
      amount: checkout.amount,
      currency: checkout.currency || 'INR',
      name: checkout.name,
      description: checkout.description,
      prefill: checkout.prefill,
      notes: { orderId: String(checkout.orderId) },
      theme: { color: theme },
      // Razorpay lets the customer retry a failed attempt inside the modal,
      // so a failure only ends the flow when they close it.
      retry: { enabled: true, max_count: 3 },
      ...(checkout.expiresAt ? {
        timeout: Math.max(60, Math.floor((new Date(checkout.expiresAt).getTime() - Date.now()) / 1000) - 30),
      } : {}),
      handler: (response) => settle(resolve, response),
      modal: {
        ondismiss: () => settle(reject, lastFailure || checkoutError('DISMISSED', 'Payment was not completed')),
        confirm_close: true,
      },
    });

    rzp.on('payment.failed', (response) => {
      const description = response?.error?.description || 'Payment failed';
      lastFailure = checkoutError('PAYMENT_FAILED', description, description);
    });

    rzp.open();
  });
};
