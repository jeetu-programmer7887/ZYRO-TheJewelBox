import React, { useContext, useState, useEffect, useMemo } from 'react';
import { AiOutlineMinus, AiOutlinePlus } from 'react-icons/ai';
import { ShopContext } from '../config/ShopContext';
import { Link, useNavigate } from 'react-router-dom';
import { RxCross2 } from "react-icons/rx";
import { motion, AnimatePresence } from "framer-motion";
import { IoWarningOutline, IoRocketOutline, IoCheckmarkCircle } from "react-icons/io5";

const Cart = () => {
  const { currency, deliveryFee, updateQuantity, cartData, allProducts } = useContext(ShopContext);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (cartData) {
      const timer = setTimeout(() => setLoading(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [cartData]);

  // --- STOCK VALIDATION LOGIC ---
  const validatedCart = useMemo(() => {
    return cartData.map(item => {
      const originalProduct = allProducts.find(p => p._id === item._id);
      const totalStock = originalProduct?.variants?.reduce((acc, v) => acc + (v.stock || 0), 0) ?? 0;
      return {
        ...item,
        isOutOfStock: totalStock <= 0
      };
    });
  }, [cartData, allProducts]);

  const hasOutOfStockItems = useMemo(() => validatedCart.some(item => item.isOutOfStock), [validatedCart]);

  // --- SHIPPING LOGIC ---
  const freeShippingThreshold = 500;
  const subtotal = cartData.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const shipping = (subtotal > 0 && subtotal >= freeShippingThreshold) ? 0 : deliveryFee;
  const amountToFreeShipping = freeShippingThreshold - subtotal;
  const total = subtotal + (subtotal > 0 ? shipping : 0);

  return (
    <div className="bg-(--color-green)/1 lg:pb-20 lg:pt-10 mt-20 lg:mt-20 pt-5 px-4 pb-20 md:px-10 lg:px-15">
      <style>
        {`
                @keyframes infinity-flow {
                    0% { stroke-dashoffset: 440; }
                    100% { stroke-dashoffset: 0; }
                }
                .animate-infinity {
                    animation: infinity-flow 2.5s linear infinite;
                }
                `}
      </style>
      <h1 className="text-2xl lg:text-4xl text-(--color-green) mb-8 other">My Cart</h1>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-6">
          <div className="relative">
            <svg width="120" height="60" viewBox="0 0 100 50" className="text-(--color-green)">
              {/* Background Track */}
              <path
                d="M25,45 C5,45 5,5 25,5 C45,5 55,45 75,45 C95,45 95,5 75,5 C55,5 45,45 25,45 Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeOpacity="0.1"
              />
              {/* Animated Path */}
              <path
                d="M25,45 C5,45 5,5 25,5 C45,5 55,45 75,45 C95,45 95,5 75,5 C55,5 45,45 25,45 Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="110 330"
                className="animate-infinity"
              />
            </svg>
          </div>
          <p className="text-sm font-semibold tracking-[0.2em] text-(--color-green) animate-pulse uppercase">Preparing your bag</p>
        </div>
      ) : (
        <>
          {validatedCart.length > 0 ? (
            <div className='flex flex-col lg:flex-row gap-10 w-full'>

              {/* Left Side: Cart Items */}
              <div className="w-full lg:w-2/3">
                <AnimatePresence initial={true}>
                  {validatedCart.map((item) => (
                    <motion.div
                      key={item._id}
                      layout
                      initial={{ opacity: 1, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -120 }}
                      className={`py-6 px-3 lg:px-5 border lg:border-t-0 lg:border-x-0 lg:border-b flex gap-4 md:gap-6 mb-4 lg:mb-0 rounded-lg lg:rounded-none transition-colors duration-300
                        ${item.isOutOfStock ? 'bg-red-50 border-red-200' : 'bg-white lg:bg-transparent border-gray-300'}`}
                    >
                      <Link to={`/product/${item.id}`} className="shrink-0 group relative">
                        <img
                          src={item.thumbnail || item.images?.[0]}
                          alt={item.title}
                          className={`rounded-lg w-24 h-24 md:w-32 md:h-32 lg:w-[25vh] lg:h-auto object-cover ${item.isOutOfStock ? 'opacity-50' : ''}`}
                        />
                        {item.isOutOfStock && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded">SOLD OUT</span>
                          </div>
                        )}
                      </Link>

                      <div className="w-full flex flex-col pt-2">
                        <div className="flex justify-between">
                          <div className="flex flex-col space-y-2 lg:space-y-3">
                            <h3 className="text-sm md:text-base lg:text-lg font-base para leading-tight hover:underline">
                              <Link to={`/product/${item.id}`}>{item.title}</Link>
                            </h3>
                            {item.isOutOfStock ? (
                              <p className="text-red-600 text-xs font-bold flex items-center gap-1">
                                <IoWarningOutline size={16} /> Remove this item to proceed.
                              </p>
                            ) : (
                              <p className="text-gray-500 text-[10px] md:text-[12px] lg:text-sm mb-4">
                                <span className='border rounded-full px-2 lg:px-3 border-gray-300'>Material: {item.material}</span>
                              </p>
                            )}
                          </div>
                          <button onClick={() => updateQuantity(item._id, 0)} className="text-gray-500 cursor-pointer hover:text-black transition-colors p-1">
                            <RxCross2 size={22} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between mt-auto">
                          <div className={`flex items-center border rounded-lg px-1 lg:px-2 py-1 ${item.isOutOfStock ? 'border-red-200 bg-red-100/50' : 'border-gray-300'}`}>
                            <button onClick={() => updateQuantity(item._id, item.quantity - 1)} disabled={item.quantity <= 1 || item.isOutOfStock} className="p-1 lg:p-2 disabled:opacity-30">
                              <AiOutlineMinus size={14} />
                            </button>
                            <span className="px-3 lg:px-4 font-semibold text-sm lg:text-base">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item._id, item.quantity + 1)} disabled={item.isOutOfStock} className="p-1 lg:p-2 disabled:opacity-30">
                              <AiOutlinePlus size={14} />
                            </button>
                          </div>
                          <div className={`text-right text-base lg:text-lg font-semibold ${item.isOutOfStock ? 'text-gray-400 line-through' : ''}`}>
                            {currency}{item.price * item.quantity}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Right Side: Order Summary */}
              <div className='w-full lg:w-1/3'>
                <div className="border bg-white border-gray-300 px-5 py-6 lg:sticky lg:top-25 rounded-lg shadow-sm">
                  <p className='text-lg lg:text-xl para pb-5 border-b border-gray-300'>Order Summary</p>

                  {/* --- DYNAMIC SHIPPING NUDGE --- */}
                  <div className="mt-4">
                    {subtotal >= freeShippingThreshold ? (
                      <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-md text-xs lg:text-sm font-medium border border-green-100">
                        <IoCheckmarkCircle size={18} />
                        You've unlocked FREE SHIPPING!
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-700 bg-gray-50 p-3 rounded-md text-xs lg:text-sm border border-gray-200">
                        <IoRocketOutline size={18} className="text-(--color-gold)" />
                        Add <span className="font-bold">{currency}{amountToFreeShipping}</span> more to get <span className="font-bold text-green-600">FREE SHIPPING</span>
                      </div>
                    )}
                  </div>

                  <div className='py-5 para space-y-3 border-b border-gray-300'>
                    <div className="flex justify-between text-gray-600 text-sm lg:text-base">
                      <span>Subtotal</span>
                      <span>{currency}{subtotal}</span>
                    </div>
                    <div className="flex justify-between text-gray-600 text-sm lg:text-base">
                      <span>Shipping Fee</span>
                      <span className={shipping === 0 ? "text-green-600 font-bold" : ""}>
                        {shipping === 0 ? "FREE" : `${currency}${shipping}`}
                      </span>
                    </div>
                    <span className='flex gap-2 items-center uppercase text-[12px] text-gray-500 para'>
                      <lord-icon
                        src="https://cdn.lordicon.com/cukgelaw.json"
                        trigger="loop"
                        state="loop-cycle"
                        style={{ width: "20px", height: "20px" }}
                        >
                      </lord-icon>
                        <p>Get exciting offers upon this order</p>
                    </span>
                  </div>

                  <div className="flex justify-between py-4 para text-lg lg:text-xl">
                    <span className='font-semibold'>TOTAL</span>
                    <span className='font-semibold text-(--color-green)'>{currency}{total}</span>
                  </div>

                  {/* Stock Warning */}
                  {hasOutOfStockItems && (
                    <div className="bg-red-50 border border-red-200 p-3 rounded-lg mb-4 text-red-700 text-xs">
                      Please remove out-of-stock items to continue.
                    </div>
                  )}

                  <button
                    onClick={() => !hasOutOfStockItems && navigate('/place-order')}
                    disabled={hasOutOfStockItems}
                    className={`w-full py-3 my-3 rounded-lg font-bold tracking-widest transition-all duration-500 
                        ${hasOutOfStockItems
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300'
                        : 'cursor-pointer bg-(--color-green) hover:bg-(--color-gold) text-white'}`}
                  >
                    {hasOutOfStockItems ? 'FIX CART TO CHECKOUT' : 'PROCEED TO CHECKOUT'}
                  </button>

                  <div className='flex items-center justify-center gap-2 text-[10px] lg:text-sm text-gray-500 mt-2'>
                    <img className='size-3.5 opacity-50' src={"./images/lock.png"} alt="lock" />
                    Secure checkout • SSL encrypted
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 para">
              <h2 className="text-2xl text-gray-400">Your cart is empty</h2>
              <Link to="/" className="text-(--color-green) underline mt-4 inline-block">Discover our exquisite collection</Link>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
};

export default Cart;