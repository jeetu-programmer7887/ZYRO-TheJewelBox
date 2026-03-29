import React, { useState, useContext, useEffect } from 'react';
import { ShopContext } from '../config/ShopContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { Loader2, MapPin } from 'lucide-react';

const Inputfield = ({ label, name, value, type, placeholder, handleChange, disabled, maxLength, children }) => (
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
        required
        disabled={disabled}
        maxLength={maxLength}
        className={`w-full border border-gray-200 rounded-lg text-gray-600 focus:outline-none focus:ring-1 focus:ring-(--color-gold) py-2 px-3 bg-white transition-all text-sm ${disabled ? 'bg-gray-50 opacity-70' : ''}`}
        />
        {children}
    </div>
  </div>
);

const PlaceOrder = () => {
  const { cartData, setCartItems, currency, user } = useContext(ShopContext);
  const navigate = useNavigate();
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const [step, setStep] = useState(1);
  const [method, setMethod] = useState('cod');
  const [isFetching, setIsFetching] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState(null);
  const [isOrdered, setIsOrdered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [userCoins, setUserCoins] = useState(0);
  const [redeemCoins, setRedeemCoins] = useState(false);

  const [formData, setFormData] = useState({
    mobile: user?.mobile || '',
    pincode: '', firstName: user?.firstName || '', lastName: user?.lastName || '',
    flatHouse: '', areaStreet: '', city: '', state: '',
    email: user?.email || '', addressType: 'Home',
  });

  const subtotal = cartData.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const delivery_fee = subtotal < 500 ? 50 : 0;
  const baseTotal = subtotal + delivery_fee;

  const maxDiscount = Math.floor(baseTotal * 0.10);
  const maxCoinsUsable = Math.floor(maxDiscount / 5);
  const coinsToUse = redeemCoins ? Math.min(userCoins, maxCoinsUsable) : 0;
  const coinDiscount = coinsToUse * 5;
  const total = Math.max(1, baseTotal - coinDiscount);

  // Removed userCoins from dependency to prevent Infinite Loop
  useEffect(() => {
    const fetchCoins = async () => {
      try {
        const { data } = await axios.get(backendUrl + '/api/order/fetch-coins', { withCredentials: true });
        if (data.success) setUserCoins(data.coins);
      } catch (err) { console.log("Coins fetch error:", err); }
    };
    if (user?.isLoggedIn) fetchCoins();
  }, [user?.isLoggedIn, backendUrl]); 

  useEffect(() => { if (user?.mobile) setStep(2); }, [user]);

  useEffect(() => {
    const fetchLocation = async () => {
      const cleanPincode = formData.pincode.toString().trim();
      if (cleanPincode.length === 6) {
        setIsFetching(true);
        try {
          const response = await axios.get(`https://api.postalpincode.in/pincode/${cleanPincode}`, { withCredentials: false });
          if (response.data && response.data[0].Status === "Success") {
            const postOffice = response.data[0].PostOffice[0];

            if (formData.city !== postOffice.District) {
              setFormData(prev => ({ ...prev, city: postOffice.District, state: postOffice.State }));
              toast.success(`District Found: ${postOffice.District}`, { toastId: 'pincode-success' });
            }

            setDeliveryDate(Math.floor(Math.random() * (5 - 3 + 1)) + 3);
          } else {
            setDeliveryDate(null);
            toast.error("Pincode not serviceable");
          }
        } catch (error) {
          toast.error("Failed to auto-fetch city/state");
        } finally {
          setIsFetching(false);
        }
      }
    };
    fetchLocation();
  }, [formData.pincode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
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

  const initPay = (order, mongoOrderId) => {
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      name: 'ZYRO FASHION JEWELLERY',
      description: 'Order Summary',
      order_id: order.id,
      modal: {
        ondismiss: function() {
          setIsSubmitting(false);
        }
      },
      handler: async (response) => {
        try {
          const { data } = await axios.post(backendUrl + '/api/order/verify-razorpay', {
            ...response, mongoOrderId: mongoOrderId || order.receipt
          });
          if (data.success) {
            setCartItems({});
            fireConfetti();
            setIsOrdered(true);
          }
        } catch (error) { 
            toast.error("Payment verification failed"); 
            setIsSubmitting(false);
        }
      },
      theme: { color: "#2e4a3e" }
    };
    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    if (step === 1) {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(formData.mobile)) return toast.error("Please enter a valid mobile number");
      setStep(2); return;
    }

    setIsSubmitting(true);

    try {
      const orderItems = cartData.map((item) => ({
        productId: item._id, title: item.title, price: item.price,
        quantity: item.quantity, image: item.images?.[0] || item.thumbnail,
        variantSku: item.variantSku || "Standard"
      }));

      const orderData = { address: formData, items: orderItems, amount: baseTotal, coinsToRedeem: coinsToUse, deliveryDate };

      if (method === 'cod') {
        const { data } = await axios.post(backendUrl + '/api/order/place', orderData);
        if (data.success) {
          setCartItems({});
          fireConfetti();
          setIsOrdered(true);
        } else {
          toast.error(data.message);
          setIsSubmitting(false);
        }
      } else if (method === 'razorpay') {
        const { data } = await axios.post(backendUrl + '/api/order/razorpay', orderData);
        if (data.success) {
          initPay(data.order, data.mongoOrderId);
        } else {
          toast.error(data.message);
          setIsSubmitting(false);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Checkout failed");
      setIsSubmitting(false);
    }
  };

  const cardStyle = "bg-white p-5 sm:p-6 border border-(--color-green)/10 shadow-sm rounded-xl";
  const sectionTitle = "text-lg font-semibold text-(--color-green) title mb-5 flex items-center gap-2";

  // --- Success Screen UI ---
  if (isOrdered) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center animate-in fade-in zoom-in duration-700">
        <div className={`${cardStyle} py-12 px-8 flex flex-col items-center border-t-8 border-t-(--color-green)`}>
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 text-4xl shadow-inner">✅</div>
          <h1 className="text-3xl font-black text-(--color-green) title mb-2 uppercase tracking-tighter">Order Confirmed!</h1>
          <p className="text-gray-500 para mb-10 max-w-md">Thank you for choosing Zyro. Your jewelry is being prepared and will reach you soon.</p>

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
                <Inputfield label="Mobile Number" name="mobile" type="tel" value={formData.mobile} placeholder="Enter 10-digit mobile number" handleChange={handleChange} maxLength={10} />
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
                    <Inputfield label="Pincode" name="pincode" value={formData.pincode} type="text" placeholder="e.g. 400001" handleChange={handleChange}>
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
                  <Inputfield label="District" name="city" value={formData.city} type="text" placeholder="District" handleChange={handleChange} disabled={true} />
                  <Inputfield label="State/UT" name="state" value={formData.state} type="text" placeholder="State" handleChange={handleChange} disabled={true} />
                </div>
              </div>
              
              {/* Rewards Section */}
              {userCoins > 0 && (
                <div className={`${cardStyle} border-green-400 bg-linear-to-br from-amber-50 via-white to-green-50/30`}>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3 items-center">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-xl shadow-inner">
                        <lord-icon src="https://cdn.lordicon.com/cukgelaw.json" trigger="loop" state="loop-cycle"></lord-icon>
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-amber-900 title">{redeemCoins ? "Exclusive Discount Applied!" : "Loyalty Discount Available"}</h2>
                        {redeemCoins ? <p className="text-xs text-green-600 font-bold flex items-center gap-1 animate-pulse">✨ Save {currency}{coinDiscount} on this order</p> : <p className="text-[11px] text-amber-700/70 font-medium">Redeem rewards for an instant price drop</p>}
                      </div>
                    </div>
                    <button type="button" onClick={() => setRedeemCoins(!redeemCoins)} className={`relative w-14 h-7 hover:cursor-pointer rounded-full transition-all duration-300 shadow-sm ${redeemCoins ? 'bg-green-800' : 'bg-gray-200'}`}>
                      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 flex items-center justify-center text-[10px] font-bold ${redeemCoins ? 'left-8 text-(--color-gold)' : 'left-1 text-gray-400'}`}>{redeemCoins ? 'ON' : 'OFF'}</div>
                    </button>
                  </div>
                </div>
              )}

              {/* Payment Section */}
              <div className={cardStyle}>
                <h2 className={sectionTitle}><span className="w-6 h-6 rounded-full bg-(--color-green) text-white flex items-center justify-center text-xs">3</span>Payment Method</h2>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl'>
                  {[{ id: 'cod', label: 'CASH ON DELIVERY' }, { id: 'razorpay', label: 'ONLINE PAYMENT' }].map(m => (
                    <div key={m.id} onClick={() => setMethod(m.id)} className={`p-4 border rounded-xl cursor-pointer transition-all flex items-center gap-3 ${method === m.id ? 'border-(--color-gold) bg-(--color-gold)/5' : 'border-gray-200'}`}>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${method === m.id ? 'border-(--color-green)' : 'border-gray-300'}`}>
                        {method === m.id && <div className="w-2 h-2 rounded-full bg-(--color-green)" />}
                      </div>
                      <p className={`font-bold text-xs title ${method === m.id ? 'text-(--color-green)' : 'text-gray-500'}`}>{m.label}</p>
                    </div>
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
              Order Summary <span className="bg-(--color-green)/10 text-(--color-green) text-[10px] px-2 py-1 rounded-full">{cartData.length} Items</span>
            </h2>

            <div className='max-h-[35vh] overflow-y-auto mb-6 space-y-4 pr-2 custom-scrollbar'>
              {cartData.map((item, index) => (
                <div key={index} className='flex gap-4 items-start group'>
                  <div className="relative overflow-hidden rounded-lg border border-gray-100 shrink-0">
                    <img src={item.image || item.thumbnail} alt={item.title} className='w-14 h-14 object-cover group-hover:scale-110 transition-transform duration-300' />
                    <span className="absolute -top-1 -right-1 bg-gray-800 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center border border-white">{item.quantity}</span>
                  </div>
                  <div className='flex-1 min-w-0 pt-0.5'>
                    <h4 className='text-[11px] font-bold text-gray-800 truncate uppercase leading-tight'>{item.title}</h4>
                  </div>
                  <p className='text-xs font-bold text-gray-800 pt-0.5'>{currency}{item.price * item.quantity}</p>
                </div>
              ))}
            </div>

            <div className='space-y-3 pt-4 border-t border-dashed border-gray-200'>
              <div className='flex justify-between text-sm text-gray-500 font-medium'><span>Subtotal</span><span className="text-gray-800">{currency}{subtotal}</span></div>
              <div className='flex justify-between text-sm text-gray-500 font-medium'><span>Shipping</span><span className={delivery_fee === 0 ? 'text-green-600 font-bold' : 'text-gray-800'}>{delivery_fee === 0 ? 'FREE' : `${currency}${delivery_fee}`}</span></div>
              {redeemCoins && coinDiscount > 0 && (
                <div className='flex justify-between text-[13px] bg-green-50 p-2 rounded-lg border border-green-100 text-green-700 font-semibold'>
                  <span>✨ Applied Discount</span><span>-{currency}{coinDiscount}</span>
                </div>
              )}
              {deliveryDate && <div className='flex items-center gap-2 text-[12px] text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-100'>🚚 Delivers in <span className='font-bold text-gray-700'>{deliveryDate} Business Days</span></div>}
              <div className='flex justify-between text-lg font-black pt-4 border-t-2 border-double border-gray-200 text-(--color-green) title'>
                <span>Total Amount</span>
                <div className="text-right">
                  {redeemCoins && coinDiscount > 0 && <p className="text-[10px] text-gray-400 line-through font-normal -mb-1">{currency}{baseTotal}</p>}
                  <span className="tracking-tighter">{currency}{total}</span>
                </div>
              </div>
            </div>

            {step === 2 && (
              <div className="mt-6 space-y-4">
                <div className="bg-linear-to-r from-(--color-green) to-(--color-green)/80 rounded-xl p-3 text-white flex items-center gap-3 relative overflow-hidden">
                  <span className="text-base bg-white/20 p-1.5 rounded-lg">✨</span>
                  <p className="text-[12px] leading-tight font-medium">Checkout to earn up to <span className="font-bold text-amber-300">10 Shopping Coins</span>!</p>
                </div>
                
                {/* ✅ FINAL ACTION BUTTON WITH SPINNER */}
                <button
                  type='submit'
                  disabled={isSubmitting}
                  className={`w-full py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-widest ${isSubmitting
                      ? "bg-gray-400 cursor-not-allowed text-white"
                      : "bg-(--color-green) text-white hover:bg-(--color-gold) cursor-pointer"
                    }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Processing Order...
                    </>
                  ) : (
                    "Confirm & Pay Now"
                  )}
                </button>
              </div>
            )}
            <div className="pt-6 flex flex-col items-center"><img src='https://prao.com/cdn/shop/files/IMG_1796.jpg' alt="secure" className="w-full mix-blend-multiply opacity-80" /></div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default PlaceOrder;