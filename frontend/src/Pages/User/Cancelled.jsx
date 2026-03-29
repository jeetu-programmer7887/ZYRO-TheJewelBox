import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { NavLink } from 'react-router-dom';
import { ShopContext } from '../../config/ShopContext';

const Cancelled = () => {
  const [cancelledOrders, setCancelledOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { currency, backendUrl } = useContext(ShopContext);

  const fetchCancelledOrders = async () => {
    if (cancelledOrders.length > 0) setIsRefreshing(true);
    else setLoading(true);

    try {
      const response = await axios.get(`${backendUrl}/api/order/userorders`);

      if (response.data.success) {
        let onlyCancelled = [];
        response.data.orders.forEach((order) => {
          // Filter only the orders that are cancelled
          if (order.status === "Cancelled") {
            order.items.forEach((item) => {
              onlyCancelled.push({
                ...item,
                orderId: order._id?.$oid || order._id,
                status: order.status,
                createdAt: order.createdAt?.$date || order.createdAt,
                deliveryDate: order.deliveryDate
              });
            });
          }
        });
        setCancelledOrders(onlyCancelled);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCancelledOrders();
  }, []);

  return (
    <div className='bg-white lg:min-h-9/12 lg:mx-5 lg:mt-5 space-y-5 lg:p-5 border border-(--color-green)/20 shadow-2xl rounded-lg'>

      {/* Header Section */}
      <div className="flex justify-between items-center px-2 pt-4 sm:pt-0">
        <div className="title text-xl text-(--color-green) font-bold tracking-tight uppercase">Cancelled Orders</div>

        <button
          onClick={fetchCancelledOrders}
          disabled={isRefreshing}
          className="flex items-center gap-2 text-sm font-medium text-(--color-green) hover:text-(--color-gold) transition-colors cursor-pointer group"
        >
          <span className={`${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z" />
              <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" />
            </svg>
          </span>
          {isRefreshing ? "Refreshing..." : "Sync Status"}
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
          <style>
            {`
              @keyframes infinity-flow { 0% { stroke-dashoffset: 440; } 100% { stroke-dashoffset: 0; } }
              .animate-infinity { animation: infinity-flow 2.5s linear infinite; }
            `}
          </style>
          <div className="relative">
            <svg width="120" height="60" viewBox="0 0 100 50" className="text-(--color-green)">
              <path d="M25,45 C5,45 5,5 25,5 C45,5 55,45 75,45 C95,45 95,5 75,5 C55,5 45,45 25,45 Z" fill="none" stroke="currentColor" strokeWidth="4" strokeOpacity="0.1" />
              <path d="M25,45 C5,45 5,5 25,5 C45,5 55,45 75,45 C95,45 95,5 75,5 C55,5 45,45 25,45 Z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray="110 330" className="animate-infinity" />
            </svg>
          </div>
          <p className="text-sm font-semibold tracking-widest text-(--color-green) animate-pulse uppercase">Searching History</p>
        </div>
      ) : cancelledOrders.length === 0 ? (
        <div className="content para rounded-xl flex flex-col items-center justify-center min-h-[60vh] bg-(--color-lightgray)/40">
          <p className='hover:cursor-pointer'>
            <lord-icon
              src="https://cdn.lordicon.com/qfijwmqj.json"
              trigger="hover"
              colors="primary:#2e4a3e,secondary:#c6a664"
              style={{ width: "100px", height: "100px" }}>
            </lord-icon>
          </p>
          <p>No Cancelled Order</p>
          <NavLink to="/">
            <button className="px-6 py-3 mt-4 lg:px-8 lg:py-3 lg:mt-6 bg-(--color-green) text-white title rounded-full hover:bg-(--color-gold) transition-all duration-300 ease-in-out cursor-pointer whitespace-nowrap shadow-md active:scale-95">
              Continue Shopping
            </button>
          </NavLink>
        </div>
      ) : (
        <div className="space-y-4">
          {cancelledOrders.map((item, index) => {
            const productId = item.productId?.$oid || item.productId;
            return (
              <div
                key={index}
                className="p-4 bg-gray-50/30 rounded-xl border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 hover:border-red-200 hover:bg-white hover:shadow-xl group"
              >
                <div className="flex gap-5">
                  <NavLink to={`/product/${productId}`}>
                    <img className='w-20 h-20 object-cover rounded-lg shadow-sm group-hover:scale-105 transition-transform' src={item.image} alt={item.title} />
                  </NavLink>

                  <div className="flex flex-col justify-center">
                    <NavLink to={`/product/${productId}`}>
                      <h3 className="font-semibold text-gray-800 hover:text-(--color-green) transition-colors">{item.title}</h3>
                    </NavLink>
                    <p className="text-sm text-gray-600">
                      {currency}{item.price} • Quantity: {item.quantity}
                    </p>

                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-[10px] font-medium border border-gray-200 bg-white px-2 py-0.5 rounded text-gray-400">
                        Ordered: {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-[10px] font-medium border border-red-100 bg-red-50/50 px-2 py-0.5 rounded text-red-400">
                        Status: Cancelled
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:w-1/4 border-t md:border-t-0 pt-4 md:pt-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
                    <span className="text-sm font-semibold text-gray-700">Cancelled</span>
                  </div>

                  <NavLink to={`/product/${productId}`}>
                    <button className="cursor-pointer px-4 py-2 text-xs text-(--color-green) font-bold border border-(--color-green)/30 rounded hover:bg-(--color-green) hover:text-white transition-all duration-500 active:scale-95  shadow-sm">
                      REORDER
                    </button>
                  </NavLink>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Cancelled;