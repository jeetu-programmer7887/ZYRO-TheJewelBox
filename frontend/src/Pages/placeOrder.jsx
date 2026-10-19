import React, { useState, useContext, useEffect, useRef } from 'react';
import { ShopContext } from '../config/ShopContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { Loader2, ShieldCheck, Lock } from 'lucide-react';
import useCheckoutQuote from '../Utility/useCheckoutQuote';
import { openRazorpayCheckout } from '../Utility/razorpay';
import { optimizeImage } from '../Utility/image';

const PHONE_RE = /^[6-9]\d{9}$/;
const PINCODE_RE = /^\d{6}$/;

const Inputfield = ({ label, name, value, type, placeholder, handleChange, disabled, readOnly, maxLength, inputMode, children }) => (
  <div className="flex flex-col w-full relative">
    <label htmlFor={name} className="mb-1 para text-(--color-gold) font-bold text-xs uppercase tracking-tight">{label}</label>
    <div className="relative">
        <input
        id={name}
        type={type}
        name={name}
        value={value}
        placeholder={placeholder}
        onChange={handleChange}
        required={!readOnly}
        disabled={disabled}
        readOnly={readOnly}
        maxLength={maxLength}
        inputMode={inputMode}
        className={`w-full border border-gray-200 rounded-lg text-gray-600 focus:outline-none focus:ring-1 focus:ring-(--color-gold) py-2 px-3 bg-white transition-all text-sm ${disabled || readOnly ? 'bg-gray-50 opacity-70' : ''}`}
        />
        {children}
    </div>
  </div>
);

const newCheckoutKey = () =>
  (window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, '');

const PlaceOrder = () => {
  const { currency, user, refreshCart, backendUrl } = useContext(ShopContext);
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [method, setMethod] = useState('COD');
  const [isFetching, setIsFetching] = useState(false);
  const [pincodeInfo, setPincodeInfo] = useState(null); // server's serviceability answer
  const [placedOrder, setPlacedOrder] = useState(null); // confirmed order (success screen)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [redeemCoins, setRedeemCoins] = useState(false);
  // An online order that was created but not paid yet (modal closed, payment failed)
  const [pendingPayment, setPendingPayment] = useState(null);

  // One key per checkout attempt: a retried request returns the same order
  // instead of creating a duplicate.
  const checkoutKey = useRef(newCheckoutKey());

  // Everything money-related comes from the server
  const { quote, loading: quoteLoading, error: quoteError, refresh: refreshQuote, setQuote } =
    useCheckoutQuote({ useCoins: redeemCoins, enabled: !placedOrder });

  const [formData, setFormData] = useState({
    mobile: user?.mobile ? String(user.mobile) : '',
    pincode: user?.pincode ? String(user.pincode) : '', firstName: user?.firstName || '', lastName: user?.lastName || '',
    flatHouse: '', areaStreet: '', city: '', state: '',
    email: user?.email || '', addressType: 'Home',
  });

  // User details usually arrive after the first render: fill in only the
  // fields the customer hasn't typed into yet.
  useEffect(() => {
    if (!user?.isLoggedIn) return;
    setFormData(prev => ({
      ...prev,
      mobile: prev.mobile || (user.mobile ? String(user.mobile) : ''),
      pincode: prev.pincode || (user.pincode ? String(user.pincode) : ''),
      firstName: prev.firstName || user.firstName || '',
      lastName: prev.lastName || user.lastName || '',
      email: prev.email || user.email || '',
    }));
  }, [user]);

  // Skip the contact step once, but only when the saved mobile number is valid.
  const autoAdvanced = useRef(false);
  useEffect(() => {
    if (autoAdvanced.current || step !== 1) return;
    const profileMobile = user?.mobile ? String(user.mobile) : '';
    if (profileMobile && formData.mobile === profileMobile && PHONE_RE.test(formData.mobile)) {
      autoAdvanced.current = true;
      setStep(2);
    }
  }, [user?.mobile, formData.mobile, step]);

  // Pincode → city/state/serviceability, answered by our backend
  useEffect(() => {
    const cleanPincode = formData.pincode.toString().trim();
    if (!PINCODE_RE.test(cleanPincode)) return;

    let cancelled = false;
    const fetchLocation = async () => {
      setIsFetching(true);
      try {
        const { data } = await axios.get(`${backendUrl}/api/order/pincode/${cleanPincode}`);
        if (cancelled) return;
        if (data.serviceable) {
          setFormData(prev => ({ ...prev, city: data.city, state: data.state }));
          setPincodeInfo(data);
        } else {
          setPincodeInfo(null);
          toast.error(data.message || "We don't deliver to this pincode yet.", { toastId: 'pincode-error' });
        }
      } catch (error) {
        if (!cancelled) {
          setPincodeInfo(null);
          toast.error(error.response?.data?.message || "Couldn't verify this pincode. Please try again.", { toastId: 'pincode-error' });
        }
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    };
    fetchLocation();
    return () => {
      cancelled = true;
      setIsFetching(false);
    };
  }, [formData.pincode, backendUrl]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'mobile' || name === 'pincode') {
      const digits = value.replace(/\D/g, '').slice(0, name === 'pincode' ? 6 : 10);
      if (digits === formData[name]) return;
      if (name === 'pincode') {
        // A new pincode invalidates the previously resolved district/state.
        setPincodeInfo(null);
        setFormData(prev => ({ ...prev, pincode: digits, city: '', state: '' }));
      } else {
        setFormData(prev => ({ ...prev, mobile: digits }));
      }
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const fireConfetti = () => {
    confetti({
      particleCount: 100, angle: 60, spread: 70, origin: { x: 0, y: 0.8 },
      colors: ['#c9a96e', '#2e4a3e', '#FFD700', '#ffffff']
    });
    confetti({
      particleCount: 100, angle: 120, spread: 70, origin: { x: 1, y: 0.8 },
      colors: ['#c9a96e', '#2e4a3e', '#FFD700', '#ffffff']
    });
  };

  const onOrderConfirmed = (order) => {
    setPendingPayment(null);
    setPlacedOrder(order);
    checkoutKey.current = newCheckoutKey();
    refreshCart(); // the server already removed the purchased items
    fireConfetti();
  };

  // Open Razorpay for a server-created order and confirm the result with the server
  const payWithRazorpay = async (checkout, order) => {
    let response;
    try {
      response = await openRazorpayCheckout(checkout);
    } catch (error) {
      setPendingPayment({ order, checkout });
      if (error.code === 'DISMISSED') {
        toast.info("Payment not completed. Your order is saved; you can pay now or later from My Orders.", { toastId: 'pay-dismissed' });
      } else if (error.code === 'PAYMENT_FAILED') {
        toast.error(`Payment failed: ${error.description}. You can try again.`, { toastId: 'pay-failed' });
      } else {
        toast.error(error.message, { toastId: 'pay-script' });
      }
      return;
    }

    try {
      const { data } = await axios.post(`${backendUrl}/api/order/verify-razorpay`, response);
      toast.success(data.message || "Payment successful!");
      onOrderConfirmed(data.order);
    } catch (error) {
      const data = error.response?.data || {};
      if (data.code === 'OUT_OF_STOCK' || data.code === 'ORDER_CANCELLED') {
        setPendingPayment(null);
        checkoutKey.current = newCheckoutKey();
        refreshCart();
        toast.error(data.message, { autoClose: 8000 });
        navigate('/userAccount/order');
        return;
      }
      // The payment may still go through (bank delay); the server keeps
      // checking via webhooks, so send the customer to their orders.
      toast.warn(data.message || "We're confirming your payment. Please check My Orders in a minute.", { autoClose: 8000 });
      navigate('/userAccount/order');
    }
  };

  const retryPendingPayment = async () => {
    if (!pendingPayment || isSubmitting) return;
    setIsSubmitting(true);
    try {
      // Ask the server again: it refuses if the window closed or it's already paid
      const { data } = await axios.post(`${backendUrl}/api/order/${pendingPayment.order._id}/pay`);
      await payWithRazorpay(data.checkout, data.order);
    } catch (error) {
      const data = error.response?.data || {};
      toast.error(data.message || "Couldn't restart the payment. Please try again.");
      if (data.order && !data.order.actions?.canPay) {
        setPendingPayment(null);
        checkoutKey.current = newCheckoutKey();
        if (data.order.payment) onOrderConfirmed(data.order);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (step === 1) {
      if (!PHONE_RE.test(formData.mobile)) return toast.error("Please enter a valid 10-digit mobile number");
      setStep(2); return;
    }

    if (pendingPayment) return retryPendingPayment();

    if (!PHONE_RE.test(formData.mobile)) {
      setStep(1);
      return toast.error("Please enter a valid 10-digit mobile number");
    }
    if (!PINCODE_RE.test(formData.pincode)) return toast.error("Please enter a valid 6-digit pincode");
    if (isFetching) return toast.info("Verifying your pincode, please wait a moment");
    if (!pincodeInfo || !formData.city || !formData.state) {
      return toast.error("We couldn't verify your pincode. Please re-enter a valid pincode.");
    }
    if (!quote || quoteLoading) return toast.info("Updating your total, please wait a moment");
    if (!quote.canCheckout) {
      return toast.error(quote.issues?.[0]?.message || "Your bag needs attention before checkout.", { toastId: 'checkout-stock' });
    }

    setIsSubmitting(true);
    try {
      const { data } = await axios.post(`${backendUrl}/api/order/place`, {
        address: formData,
        paymentMethod: method,
        useCoins: redeemCoins,
        idempotencyKey: checkoutKey.current,
        expectedTotal: quote.total,
      });

      if (data.checkout) {
        await payWithRazorpay(data.checkout, data.order);
      } else if (data.order?.status === 'Pending Payment' || data.order?.status === 'Cancelled') {
        // A retried request for an online order whose payment window has closed
        checkoutKey.current = newCheckoutKey();
        toast.info("That payment session has ended. Please place the order again.");
        refreshQuote();
      } else {
        toast.success(data.message || "Order placed successfully");
        onOrderConfirmed(data.order);
      }
    } catch (error) {
      const data = error.response?.data || {};
      if (data.quote) {
        // Prices, stock or coins changed on the server: show the new numbers
        setQuote(data.quote);
        checkoutKey.current = newCheckoutKey();
      }
      if (!error.response) {
        // Network problem: keep the same key so a retry can't double-order
        toast.error("Network problem. Please check your connection and press the button again.");
      } else {
        toast.error(data.message || "Checkout failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const lines = quote?.lines || [];
  const subtotal = quote?.subtotal ?? 0;
  const deliveryFee = quote?.deliveryFee ?? 0;
  const coinDiscount = quote?.coins?.discount ?? 0;
  const total = quote?.total ?? 0;
  const baseTotal = subtotal + deliveryFee;
  const coinsAvailable = quote?.coins?.maxUsable ?? 0;
  const paymentMethods = quote?.paymentMethods || [
    { id: 'COD', label: 'Cash on Delivery', enabled: true },
    { id: 'Razorpay', label: 'Online Payment', enabled: true },
  ];
  const pendingDeadline = pendingPayment?.checkout?.expiresAt
    ? new Date(pendingPayment.checkout.expiresAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : null;

  const cardStyle = "bg-white p-5 sm:p-6 border border-(--color-green)/10 shadow-sm rounded-xl";
  const sectionTitle = "text-lg font-semibold text-(--color-green) title mb-5 flex items-center gap-2";

  // --- Success Screen UI ---
  if (placedOrder) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center animate-in fade-in zoom-in duration-700">
        <div className={`${cardStyle} py-12 px-8 flex flex-col items-center border-t-8 border-t-(--color-green)`}>
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 text-4xl shadow-inner">✅</div>
          <h1 className="text-3xl font-black text-(--color-green) title mb-2 uppercase tracking-tighter">Order Confirmed!</h1>
          <p className="text-gray-500 para mb-4 max-w-md">Thank you for choosing Zyro. Your jewelry is being prepared and will reach you soon.</p>
          <div className="text-sm text-gray-600 mb-10 space-y-1">
            <p>Order <span className="font-bold text-gray-800">#{String(placedOrder._id).slice(-8).toUpperCase()}</span></p>
            <p>Total <span className="font-bold text-gray-800">{currency}{placedOrder.amount}</span> · {placedOrder.paymentLabel}</p>
          </div>

          <div className="w-full max-w-md bg-linear-to-br from-green-50 to-orange-50 border border-green-200 rounded-2xl p-6 relative overflow-hidden group mb-10">
            <div className="absolute -right-4 -top-4 opacity-10 group-hover:rotate-12 transition-transform duration-700"><span className="text-8xl">🪙</span></div>
            <div className="relative z-10">
              <h3 className="text-green-800 font-bold title text-sm uppercase tracking-widest mb-3 flex items-center justify-center gap-2">✨ Rewards Pending ✨</h3>
              <div className="text-green-900/80 text-sm font-medium flex flex-wrap items-center justify-center gap-1.5 leading-none">
                <span>We've reserved</span>
                <span className="flex items-center gap-1 font-black text-green-600 text-[15px]">
                  <lord-icon src="https://cdn.lordicon.com/cukgelaw.json" trigger="loop" state="loop-cycle" style={{ width: "22px", height: "22px" }}></lord-icon>
                  Shopping Coins
                </span>
                <span>for you!</span>
              </div>
              <p className="text-[12px] text-green-600 mt-4 para uppercase tracking-wider font-extrabold">*Coins will be added to your account once the product is delivered.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full max-sm">
            <button onClick={() => navigate('/userAccount/order')} className="flex-1 py-4 bg-(--color-green) text-white title rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-(--color-gold) transition-all shadow-lg cursor-pointer">Track Order</button>
            <button onClick={() => navigate('/')} className="flex-1 py-4 border border-gray-200 text-gray-600 title rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-all cursor-pointer">Keep Shopping</button>
          </div>
        </div>
      </div>
    );
  }

  // Nothing to check out (cart emptied, or every product became unavailable)
  if (quote && lines.length === 0 && !pendingPayment) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-25 text-center">
        <div className={`${cardStyle} py-12 px-8 flex flex-col items-center`}>
          <h1 className="text-2xl font-semibold text-(--color-green) title mb-2">Your bag is empty</h1>
          <p className="text-gray-500 para mb-8">Add a piece you love to your bag before checking out.</p>
          <Link to="/cart" className="px-8 py-3 bg-(--color-green) text-white title rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-(--color-gold) transition-all">Go to Bag</Link>
        </div>
      </div>
    );
  }

  return (
    <div className='max-w-6xl mx-auto px-4 lg:px-0 py-25'>
      <form onSubmit={onSubmitHandler} className='grid grid-cols-1 lg:grid-cols-13 gap-6 items-start'>
        <div className='lg:col-span-8 space-y-6'>
          <div className={cardStyle}>
            <div className="flex justify-between items-center mb-5">
              <h2 className={sectionTitle}><span className="w-6 h-6 rounded-full bg-(--color-green) text-white flex items-center justify-center text-xs">1</span>Contact Information</h2>
              {step === 2 && <button type="button" onClick={() => setStep(1)} className="text-xs text-(--color-gold) font-bold underline cursor-pointer">Edit</button>}
            </div>
            {step === 1 ? (
              <div className="max-w-sm">
                <Inputfield label="Mobile Number" name="mobile" type="tel" inputMode="numeric" value={formData.mobile} placeholder="Enter 10-digit mobile number" handleChange={handleChange} maxLength={10} />
                <button type="submit" className="mt-4 px-6 py-2.5 bg-(--color-green) text-white title rounded-lg hover:bg-(--color-gold) transition-all text-sm cursor-pointer">Continue</button>
              </div>
            ) : <p className="text-sm text-gray-500 font-medium">Contact No: <span className="text-gray-800">{formData.mobile}</span></p>}
          </div>

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className={cardStyle}>
                <h2 className={sectionTitle}><span className="w-6 h-6 rounded-full bg-(--color-green) text-white flex items-center justify-center text-xs">2</span>Shipping Address</h2>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4'>
                  
                  {/* Added isFetching Spinner to Pincode field */}
                  <div className="md:col-span-1 max-w-xs relative">
                    <Inputfield label="Pincode" name="pincode" value={formData.pincode} type="text" inputMode="numeric" maxLength={6} placeholder="e.g. 400001" handleChange={handleChange}>
                        {isFetching && (
                            <div className="absolute right-3 top-2 flex items-center h-full">
                                <Loader2 className="animate-spin text-(--color-gold)" size={16} />
                            </div>
                        )}
                    </Inputfield>
                  </div>

                  <Inputfield label="Email" name="email" value={formData.email} type="email" placeholder="e.g johndoe123@gmail.com" handleChange={handleChange} />
                  <Inputfield label="First Name" name="firstName" value={formData.firstName} type="text" placeholder="Enter your first name" handleChange={handleChange} />
                  <Inputfield label="Last Name" name="lastName" value={formData.lastName} type="text" placeholder="Enter your last name" handleChange={handleChange} />
                  <div className="md:col-span-2"><Inputfield label="Flat / House / Building" name="flatHouse" value={formData.flatHouse} type="text" placeholder="House No., Building Name, etc." handleChange={handleChange} /></div>
                  <div className="md:col-span-2"><Inputfield label="Area / Street / Sector" name="areaStreet" value={formData.areaStreet} type="text" placeholder="Area, Colony, Street Name" handleChange={handleChange} /></div>
                  <Inputfield label="District" name="city" value={formData.city} type="text" placeholder="Auto-filled from pincode" handleChange={handleChange} readOnly />
                  <Inputfield label="State/UT" name="state" value={formData.state} type="text" placeholder="Auto-filled from pincode" handleChange={handleChange} readOnly />
                </div>
              </div>
              
              {/* Rewards Section */}
              {coinsAvailable > 0 && !pendingPayment && (
                <div className={`${cardStyle} border-green-400 bg-linear-to-br from-amber-50 via-white to-green-50/30`}>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3 items-center">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-xl shadow-inner">
                        <lord-icon src="https://cdn.lordicon.com/cukgelaw.json" trigger="loop" state="loop-cycle"></lord-icon>
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-amber-900 title">{redeemCoins ? "Exclusive Discount Applied!" : "Loyalty Discount Available"}</h2>
                        {redeemCoins ? <p className="text-xs text-green-600 font-bold flex items-center gap-1 animate-pulse">✨ Save {currency}{coinDiscount} on this order</p> : <p className="text-[11px] text-amber-700/70 font-medium">Use {coinsAvailable} coins to save {currency}{coinsAvailable * (quote?.coins?.valuePerCoin || 5)}</p>}
                      </div>
                    </div>
                    <button type="button" aria-pressed={redeemCoins} aria-label="Use shopping coins" disabled={quoteLoading} onClick={() => setRedeemCoins(!redeemCoins)} className={`relative w-14 h-7 hover:cursor-pointer rounded-full transition-all duration-300 shadow-sm ${redeemCoins ? 'bg-green-800' : 'bg-gray-200'}`}>
                      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 flex items-center justify-center text-[10px] font-bold ${redeemCoins ? 'left-8 text-(--color-gold)' : 'left-1 text-gray-400'}`}>{redeemCoins ? 'ON' : 'OFF'}</div>
                    </button>
                  </div>
                </div>
              )}

              {/* Payment Section */}
              <div className={cardStyle}>
                <h2 className={sectionTitle}><span className="w-6 h-6 rounded-full bg-(--color-green) text-white flex items-center justify-center text-xs">3</span>Payment Method</h2>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl' role="radiogroup" aria-label="Payment method">
                  {paymentMethods.map(m => (
                    <button type="button" role="radio" aria-checked={method === m.id} key={m.id} disabled={!m.enabled || !!pendingPayment} onClick={() => setMethod(m.id)} className={`p-4 border rounded-xl cursor-pointer transition-all flex items-center gap-3 text-left disabled:opacity-50 disabled:cursor-not-allowed ${method === m.id ? 'border-(--color-gold) bg-(--color-gold)/5' : 'border-gray-200'}`}>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${method === m.id ? 'border-(--color-green)' : 'border-gray-300'}`}>
                        {method === m.id && <div className="w-2 h-2 rounded-full bg-(--color-green)" />}
                      </div>
                      <p className={`font-bold text-xs title uppercase ${method === m.id ? 'text-(--color-green)' : 'text-gray-500'}`}>{m.label}{!m.enabled && ' (unavailable)'}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary Column */}
        <div className='lg:col-span-5'>
          <div className={`${cardStyle} sticky top-6 border-t-4 border-t-(--color-green)`}>
            <h2 className="text-base font-bold text-(--color-green) title border-b border-gray-100 pb-3 mb-4 uppercase tracking-widest flex justify-between items-center">
              Order Summary <span className="bg-(--color-green)/10 text-(--color-green) text-[10px] px-2 py-1 rounded-full">{quote?.itemCount ?? 0} Items</span>
            </h2>

            <div className='max-h-[35vh] overflow-y-auto mb-6 space-y-4 pr-2 custom-scrollbar'>
              {lines.map((item) => (
                <div key={item.productId} className='flex gap-4 items-start group'>
                  <div className="relative overflow-hidden rounded-lg border border-gray-100 shrink-0">
                    <img src={optimizeImage(item.image, 120)} alt={item.title} loading="lazy" className='w-14 h-14 object-cover group-hover:scale-110 transition-transform duration-300' />
                    <span className="absolute -top-1 -right-1 bg-gray-800 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center border border-white">{item.quantity}</span>
                  </div>
                  <div className='flex-1 min-w-0 pt-0.5'>
                    <h4 className='text-[11px] font-bold text-gray-800 truncate uppercase leading-tight'>{item.title}</h4>
                  </div>
                  <p className='text-xs font-bold text-gray-800 pt-0.5'>{currency}{item.lineTotal}</p>
                </div>
              ))}
            </div>

            <div className='space-y-3 pt-4 border-t border-dashed border-gray-200'>
              <div className='flex justify-between text-sm text-gray-500 font-medium'><span>Subtotal</span><span className="text-gray-800">{currency}{subtotal}</span></div>
              <div className='flex justify-between text-sm text-gray-500 font-medium'><span>Shipping</span><span className={deliveryFee === 0 ? 'text-green-600 font-bold' : 'text-gray-800'}>{deliveryFee === 0 ? 'FREE' : `${currency}${deliveryFee}`}</span></div>
              {coinDiscount > 0 && (
                <div className='flex justify-between text-[13px] bg-green-50 p-2 rounded-lg border border-green-100 text-green-700 font-semibold'>
                  <span>✨ Applied Discount</span><span>-{currency}{coinDiscount}</span>
                </div>
              )}
              {pincodeInfo?.delivery && <div className='flex items-center gap-2 text-[12px] text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-100'>🚚 Delivers in <span className='font-bold text-gray-700'>{pincodeInfo.delivery.label}</span></div>}
              <div className='flex justify-between text-lg font-black pt-4 border-t-2 border-double border-gray-200 text-(--color-green) title'>
                <span>Total Amount</span>
                <div className="text-right">
                  {coinDiscount > 0 && <p className="text-[10px] text-gray-400 line-through font-normal -mb-1">{currency}{baseTotal}</p>}
                  <span className="tracking-tighter">{quoteLoading && !quote ? '…' : `${currency}${pendingPayment ? pendingPayment.order.amount : total}`}</span>
                </div>
              </div>
            </div>

            {quoteError && (
              <div className="mt-6 bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-800 text-xs flex justify-between items-center gap-2">
                <span>{quoteError}</span>
                <button type="button" onClick={refreshQuote} className="underline font-semibold shrink-0">Retry</button>
              </div>
            )}

            {quote?.issues?.length > 0 && !pendingPayment && (
              <div className="mt-6 bg-red-50 border border-red-200 p-3 rounded-lg text-red-700 text-xs space-y-1">
                <p className="font-bold">Some items can't be ordered right now:</p>
                <ul className="list-disc pl-4">
                  {quote.issues.map(issue => <li key={issue.productId}>{issue.message}</li>)}
                </ul>
                <Link to="/cart" className="inline-block font-bold underline mt-1">Update your bag</Link>
              </div>
            )}

            {pendingPayment && (
              <div className="mt-6 bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-900 text-xs space-y-1">
                <p className="font-bold">Your order is saved but not paid yet.</p>
                <p>Complete the payment{pendingDeadline ? ` before ${pendingDeadline}` : ''}, or pay later from <Link to="/userAccount/order" className="underline font-semibold">My Orders</Link>. Unpaid orders are cancelled automatically.</p>
              </div>
            )}

            {step === 2 && (
              <div className="mt-6 space-y-4">
                <div className="bg-linear-to-r from-(--color-green) to-(--color-green)/80 rounded-xl p-3 text-white flex items-center gap-3 relative overflow-hidden">
                  <span className="text-base bg-white/20 p-1.5 rounded-lg">✨</span>
                  <p className="text-[12px] leading-tight font-medium">Checkout to earn up to <span className="font-bold text-amber-300">10 Shopping Coins</span>!</p>
                </div>
                
                {/* ✅ FINAL ACTION BUTTON WITH SPINNER */}
                <button
                  type='submit'
                  disabled={isSubmitting || (!pendingPayment && (quoteLoading || !quote?.canCheckout))}
                  className={`w-full py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-widest ${isSubmitting
                      ? "bg-gray-400 cursor-not-allowed text-white"
                      : "bg-(--color-green) text-white hover:bg-(--color-gold) cursor-pointer"
                    }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Processing...
                    </>
                  ) : (
                    pendingPayment ? `Pay ${currency}${pendingPayment.order.amount}` : method === 'COD' ? "Place Order" : "Pay Now"
                  )}
                </button>
              </div>
            )}
            <div className="pt-6 flex items-center justify-center gap-2 text-xs text-gray-500 para">
              <ShieldCheck size={16} className="text-(--color-green)" aria-hidden="true" />
              <span>100% secure checkout</span>
              <Lock size={12} className="text-gray-400" aria-hidden="true" />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default PlaceOrder;