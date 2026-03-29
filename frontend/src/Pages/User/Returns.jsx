import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { NavLink } from 'react-router-dom';
import { ShopContext } from '../../config/ShopContext';
import Swal from 'sweetalert2';

const Returns = () => {
  const [returnedOrders, setReturnedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { currency, backendUrl } = useContext(ShopContext);

  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Order ID copied',
      showConfirmButton: false,
      timer: 1500,
      timerProgressBar: true,
    });
  };

  const fetchReturnedOrders = async () => {
    if (returnedOrders.length > 0) setIsRefreshing(true);
    else setLoading(true);

    try {
      const response = await axios.get(`${backendUrl}/api/order/userorders`);
      if (response.data.success) {
        let onlyReturned = [];
        response.data.orders.forEach((order) => {
          if (order.status === "Returned" || order.status === "Return Requested") {
            order.items.forEach((item) => {
              onlyReturned.push({
                ...item,
                orderId: order._id?.$oid || order._id,
                status: order.status,
                returnReason: order.returnReason || null,
                createdAt: order.createdAt?.$date || order.createdAt,
                deliveryDate: order.deliveryDate,
              });
            });
          }
        });
        setReturnedOrders(onlyReturned);
      }
    } catch (error) {
      console.error('Fetch Error:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => { fetchReturnedOrders(); }, []);

  return (
    <div className='bg-white lg:min-h-9/12 lg:mx-5 lg:mt-5 space-y-5 lg:p-5 border border-(--color-green)/20 shadow-2xl rounded-lg'>

      {/* Header */}
      <div className="flex justify-between items-center px-2 pt-4 sm:pt-0">
        <div className="title text-xl text-(--color-green) font-bold tracking-tight uppercase">
          Returned Orders
        </div>
        <button onClick={fetchReturnedOrders} disabled={isRefreshing}
          className="flex items-center gap-2 text-sm font-medium text-(--color-green) hover:text-(--color-gold) transition-colors cursor-pointer group">
          <span className={`${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z" />
              <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" />
            </svg>
          </span>
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
          <style>{`
            @keyframes infinity-flow { 0% { stroke-dashoffset: 440; } 100% { stroke-dashoffset: 0; } }
            .animate-infinity { animation: infinity-flow 2.5s linear infinite; }
          `}</style>
          <svg width="120" height="60" viewBox="0 0 100 50" className="text-(--color-green)">
            <path d="M25,45 C5,45 5,5 25,5 C45,5 55,45 75,45 C95,45 95,5 75,5 C55,5 45,45 25,45 Z"
              fill="none" stroke="currentColor" strokeWidth="4" strokeOpacity="0.1" />
            <path d="M25,45 C5,45 5,5 25,5 C45,5 55,45 75,45 C95,45 95,5 75,5 C55,5 45,45 25,45 Z"
              fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"
              strokeDasharray="110 330" className="animate-infinity" />
          </svg>
          <p className="text-sm font-semibold tracking-widest text-(--color-green) animate-pulse uppercase">
            Searching Returns
          </p>
        </div>

      ) : returnedOrders.length === 0 ? (
        <div className="rounded-xl flex flex-col items-center justify-center min-h-[60vh] bg-(--color-lightgray)/40">
          <lord-icon src="https://cdn.lordicon.com/qfijwmqj.json" trigger="hover"
            colors="primary:#2e4a3e,secondary:#c6a664" style={{ width: "100px", height: "100px" }} />
          <p className="mt-4 text-gray-500 font-medium">No returned orders</p>
          <NavLink to="/">
            <button className="px-8 py-3 mt-6 bg-(--color-green) text-white title rounded-full hover:bg-(--color-gold) shadow-lg transition-all cursor-pointer">
              Continue Shopping
            </button>
          </NavLink>
        </div>

      ) : (
        <div className="space-y-4">
          {returnedOrders.map((item, index) => {
            const productId = item.productId?.$oid || item.productId;
            const isPending = item.status === 'Return Requested';
            return (
              <div key={index}
                className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 hover:bg-white hover:shadow-xl group
                  ${isPending
                    ? 'bg-orange-50/30 border-orange-100 hover:border-orange-200'
                    : 'bg-gray-50/30 border-gray-100 hover:border-rose-200'}`}>

                {/* Left: image + details */}
                <div className="flex gap-5">
                  <NavLink to={`/product/${productId}`}>
                    <img className='w-20 h-20 object-cover rounded-lg shadow-sm group-hover:scale-105 transition-transform opacity-80'
                      src={item.image} alt={item.title} />
                  </NavLink>

                  {/* Middle: product details */}
                  <div className="flex-1 min-w-0 space-y-2.5">
                    <div>
                      <NavLink to={`/product/${productId}`}>
                        <h3 className="font-semibold text-gray-800 hover:text-(--color-green) transition-colors cursor-pointer">{item.title}</h3>
                      </NavLink>
                      <p className="text-sm text-gray-600">{currency}{item.price} • Qty: {item.quantity}</p>

                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-[10px] font-medium border border-gray-200 bg-white px-2 py-0.5 rounded text-gray-400">
                          Ordered: {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                        {item.deliveryDate && (
                          <span className="text-[10px] font-medium border border-gray-200 bg-white px-2 py-0.5 rounded text-gray-400">
                            Delivered: {new Date(item.deliveryDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {/* Return reason */}
                      {item.returnReason && (
                        <div className={`mt-2 text-[11px] px-2 py-1 rounded-lg w-fit border
                          ${isPending
                            ? 'text-orange-600 bg-orange-50 border-orange-100'
                            : 'text-rose-600 bg-rose-50 border-rose-100'}`}>
                          📝 Reason: <span className="font-semibold">{item.returnReason}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: status + badge */}
                <div className="flex items-center justify-between md:w-1/3 border-t md:border-t-0 pt-4 md:pt-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      isPending
                        ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]'
                        : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]'
                    }`} />
                    <span className="text-sm font-semibold text-gray-700">{item.status}</span>
                  </div>

                  {/* Coins deducted badge — only for fully returned */}
                  {!isPending && (
                    <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" fill="url(#coinR)" />
                        <text x="12" y="16" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#7a5200">₹</text>
                        <defs>
                          <radialGradient id="coinR" cx="35%" cy="35%">
                            <stop offset="0%" stopColor="#FFE066" />
                            <stop offset="50%" stopColor="#F5C518" />
                            <stop offset="100%" stopColor="#C8960C" />
                          </radialGradient>
                        </defs>
                      </svg>
                      <span className="text-[11px] text-amber-700 font-semibold">Coins deducted</span>
                    </div>
                  )}

                  {/* Pending badge */}
                  {isPending && (
                    <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-100 rounded-lg px-3 py-1.5">
                      <span className="text-[11px] text-orange-600 font-semibold">🔄 Pending Review</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Returns;