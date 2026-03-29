import axios from 'axios';
import React, { useState, useContext, useEffect, useRef, useCallback } from 'react';
import { ShopContext } from '../config/ShopContext';
import { toast } from 'react-toastify';
import { exportToCSV } from '../Utility/exportCSV';
import { Download, Package, Search, Filter, Truck, MapPin, CreditCard, AlertCircle, TrendingUp, Clock, Copy, Loader2 } from 'lucide-react';

const LIMIT = 10;

//Added 2 entries
const STATUS_CONFIG = {
  "Order Placed": { label: "Order Placed", text: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", strip: "bg-blue-400" },
  "Packing": { label: "Packing", text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", strip: "bg-amber-400" },
  "Shipped": { label: "Shipped", text: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200", strip: "bg-purple-400" },
  "Out for delivery": { label: "Out for Delivery", text: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", strip: "bg-orange-400" },
  "Delivered": { label: "Delivered", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", strip: "bg-emerald-400" },
  "Cancelled": { label: "Cancelled", text: "text-red-700", bg: "bg-red-50", border: "border-red-200", strip: "bg-red-400" },
  "Return Requested": { label: "Return Requested", text: "text-orange-700", bg: "bg-orange-50", border: "border-orange-300", strip: "bg-orange-500" }, // 
  "Returned": { label: "Returned", text: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200", strip: "bg-rose-400" }, // 
};

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [searchId, setSearchId] = useState("");
  const [summaryStats, setSummaryStats] = useState({
    totalOrders: 0, totalRevenue: 0, pendingCount: 0, deliveredCount: 0
  });

  const { backendUrl } = useContext(ShopContext);
  const currency = "₹";
  const observerRef = useRef(null);

  const fetchOrders = useCallback(async (pageToFetch) => {
    // Prevent duplicate fetches
    if (loading) return;

    setLoading(true);
    try {
      const { data } = await axios.get(`${backendUrl}/api/admin/get-orders`, {
        params: { page: pageToFetch, limit: LIMIT },
      });
      if (data.success) {
        if (data.stats) setSummaryStats(data.stats);

        setOrders((prev) => {
          const existingIds = new Set(prev.map((o) => o._id));
          const newOrders = data.allOrders.filter((o) => !existingIds.has(o._id));
          return [...prev, ...newOrders];
        });

        if (data.allOrders.length < LIMIT) {
          setHasMore(false);
        }
      }
    } catch (error) {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [backendUrl, loading]);

  // Initial and pagination trigger
  useEffect(() => {
    if (hasMore) fetchOrders(page);
  }, [page]);

  // Infinite scroll observer logic
  useEffect(() => {
    if (!hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Only increment if we aren't already loading and the sentinel is visible
        if (entries[0].isIntersecting && !loading && hasMore) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    const sentinel = observerRef.current;
    if (sentinel) observer.observe(sentinel);

    return () => {
      if (sentinel) observer.unobserve(sentinel);
    };
  }, [hasMore, loading]);

  const exportFullHistory = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/admin/export-orders`);
      if (response.data.success) {
        exportToCSV(response.data.data, "ZYRO_Full_Order_History");
        toast.success("CSV Exported successfully");
      }
    } catch {
      toast.error("Failed to export data");
    }
  };

  const statusHandler = async (event, orderId, currentStatus) => {
    //  Block if already Returned
    if (currentStatus === 'Returned') {
      toast.error("Returned orders cannot be modified");
      return;
    }

    const newStatus = event.target.value;
    try {
      const response = await axios.patch(`${backendUrl}/api/admin/update-order`, { orderId, status: newStatus });
      if (response.data.success) {
        setOrders((prev) => prev.map((o) => (o._id === orderId ? { ...o, status: newStatus } : o)));
        toast.success("Status Updated Successfully");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error updating status");
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesStatus = statusFilter === "All" || order.status === statusFilter;
    const matchesPayment = paymentFilter === "All" ||
      (paymentFilter === "Paid" ? order.payment === true : order.payment === false);
    const matchesSearch = searchId === "" || order._id.toLowerCase().includes(searchId.toLowerCase());
    return matchesStatus && matchesPayment && matchesSearch;
  });

  const statCards = [
    { label: "Total Orders", value: summaryStats.totalOrders, sub: "All time", icon: <Package size={18} /> },
    { label: "Paid Revenue", value: `${currency}${summaryStats.totalRevenue.toLocaleString('en-IN')}`, sub: "Confirmed payments", icon: <TrendingUp size={18} /> },
    { label: "Active Orders", value: summaryStats.pendingCount, sub: `${summaryStats.deliveredCount} completed`, icon: <Clock size={18} /> },
  ];

  const Chevron = ({ className = "" }) => (
    <svg className={className} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-[#f9faf9]">
      <div className="max-w-6xl mx-auto sm:px-6 pb-24 pt-8">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-[#e9e9e9]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#2e4a3e] flex items-center justify-center shadow-sm shrink-0">
              <Truck size={19} className="text-[#c6a664]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-[#2e4a3e] tracking-tight leading-tight">Order Management</h1>
              <p className="text-xs text-[#7e8180] mt-0.5">Customer fulfillment & shipping control</p>
            </div>
          </div>
          <button onClick={exportFullHistory} className="flex items-center gap-2 px-5 py-2.5 bg-[#2e4a3e] hover:bg-[#1a2e27] text-[#c6a664] rounded-xl text-xs font-medium uppercase tracking-widest transition-all active:scale-95 shadow-sm w-fit cursor-pointer border-none">
            <Download size={14} strokeWidth={2.5} /> Export CSV
          </button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {statCards.map((s, i) => (
            <div key={i} className="bg-white rounded-2xl border border-[#e9e9e9] p-5 flex items-start gap-4 hover:shadow-md hover:border-[#c6a664]/40 transition-all duration-200">
              <div className="w-10 h-10 rounded-xl bg-[#2e4a3e]/10 flex items-center justify-center text-[#2e4a3e] shrink-0">{s.icon}</div>
              <div>
                <p className="text-[10px] font-semibold text-[#7e8180] uppercase tracking-widest mb-1">{s.label}</p>
                <p className="text-2xl font-bold text-[#2e4a3e] tracking-tight mb-1">{s.value}</p>
                <p className="text-[11px] text-[#c6a664] font-medium">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* FILTERS */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7e8180] pointer-events-none" />
            <input type="text" placeholder="Search by Order ID…" value={searchId} onChange={(e) => setSearchId(e.target.value)} className="w-full pl-9 pr-4 py-2.5 border border-[#e9e9e9] bg-white rounded-xl text-sm text-[#374151] outline-none focus:border-[#2e4a3e] focus:ring-2 focus:ring-[#2e4a3e]/10 transition-all placeholder:text-[#7e8180]" />
          </div>
          <div className="relative">
            <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7e8180] pointer-events-none z-10" />
            <select onChange={(e) => setStatusFilter(e.target.value)} className="appearance-none pl-9 pr-9 py-2.5 border border-[#e9e9e9] bg-white rounded-xl text-sm text-[#374151] outline-none cursor-pointer focus:border-[#2e4a3e] focus:ring-2 focus:ring-[#2e4a3e]/10 transition-all">
              <option value="All">All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
            </select>
            <Chevron className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7e8180] pointer-events-none" />
          </div>
          <div className="relative">
            <CreditCard size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7e8180] pointer-events-none z-10" />
            <select onChange={(e) => setPaymentFilter(e.target.value)} className="appearance-none pl-9 pr-9 py-2.5 border border-[#e9e9e9] bg-white rounded-xl text-sm text-[#374151] outline-none cursor-pointer focus:border-[#2e4a3e] focus:ring-2 focus:ring-[#2e4a3e]/10 transition-all">
              <option value="All">All Payments</option>
              <option value="Paid">Paid</option>
              <option value="Unpaid">Unpaid / Pending</option>
            </select>
            <Chevron className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7e8180] pointer-events-none" />
          </div>
        </div>

        {/* ORDER CONTENT */}
        <div className="flex flex-col gap-4">
          {orders.length === 0 && loading ? (
            /* INITIAL FULL-PAGE LOADER */
            <div className="flex flex-col items-center justify-center py-32">
              <Loader2 size={32} className="text-[#2e4a3e] animate-spin mb-4" />
              <p className="text-sm font-medium text-[#7e8180]">Fetching orders...</p>
            </div>
          ) : filteredOrders.length > 0 ? (
            filteredOrders.map((order) => {
              const s = STATUS_CONFIG[order.status] || STATUS_CONFIG["Order Placed"];
              return (
                <div key={order._id} className="bg-white border border-[#e9e9e9] rounded-2xl overflow-hidden hover:shadow-lg hover:border-[#c6a664]/40 transition-all duration-200">
                  <div className={`h-0.75 w-full ${s.strip} opacity-75`} />
                  {/*  Return Requested alert banner */}
                  {order.status === 'Return Requested' && (
                    <div className="flex items-center gap-2 px-5 py-2.5 bg-orange-50 border-b border-orange-200">
                      <span className="text-orange-500 text-base">🔄</span>
                      <p className="text-xs font-bold text-orange-700 uppercase tracking-widest">Return Requested</p>
                      {order.returnReason && (
                        <p className="text-xs text-orange-500 ml-2">
                          Reason: <span className="font-semibold">{order.returnReason}</span>
                        </p>
                      )}
                    </div>
                  )}
                  <div className="p-5">
                    <div className="grid grid-cols-1 lg:grid-cols-[140px_1fr_180px] gap-6 items-start">

                      {/* LEFT: Identity */}
                      <div className="flex lg:flex-col items-center lg:items-start gap-3 lg:gap-4 lg:border-r border-[#e9e9e9] lg:pr-5">
                        <div className="w-10 h-10 rounded-xl bg-[#f0f5f3] flex items-center justify-center shrink-0">
                          <Package size={16} className="text-[#2e4a3e]" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <p className="text-[11px] text-[#7e8180] font-medium uppercase tracking-wider">
                            {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                          <button onClick={() => { navigator.clipboard.writeText(order._id); toast.info("Order ID copied!"); }} className="flex items-center gap-1.5 font-mono text-[10px] font-semibold text-[#2e4a3e] bg-[#f9faf9] border border-[#e9e9e9] hover:bg-[#2e4a3e] hover:text-[#c6a664] px-2 py-1.5 rounded-lg transition-all cursor-pointer">
                            #{order._id.slice(-8).toUpperCase()} <Copy size={10} />
                          </button>
                        </div>
                      </div>

                      {/* CENTER: Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <p className="text-[10px] font-semibold text-[#7e8180] uppercase tracking-widest mb-3">Items</p>
                          <div className="flex flex-col gap-3">
                            {order.items.map((item, i) => (
                              <div key={i} className="flex items-center gap-3">
                                <img src={item.image} alt="" className="w-10 h-10 rounded-lg object-cover border border-[#e9e9e9] shrink-0" />
                                <div>
                                  <p className="text-sm font-medium text-[#374151] leading-tight">{item.title}</p>
                                  <p className="text-[11px] text-[#c6a664] font-bold">Qty {item.quantity}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-[#7e8180] uppercase tracking-widest mb-3">Ship To</p>
                          <div className="flex gap-2.5 items-start">
                            <MapPin size={14} className="text-[#c6a664] mt-0.5 shrink-0" />
                            <div className="text-xs">
                              <p className="font-bold text-[#374151] flex items-center gap-2">
                                {order.address.firstName} {order.address.lastName}
                                <span className="text-[9px] px-1.5 py-0.5 bg-[#e9e9e9] text-[#7e8180] rounded uppercase font-medium">{order.address.addressType}</span>
                              </p>
                              <p className="text-[#7e8180] mt-1 leading-relaxed">
                                {order.address.flatHouse}, {order.address.areaStreet}, {order.address.city}, {order.address.state} — {order.address.pincode}
                              </p>
                              <p className="font-semibold text-[#374151] mt-2">📞 {order.address.mobile}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* RIGHT: Financials & Status */}
                      <div className="flex flex-col gap-5 lg:border-l border-[#e9e9e9] lg:pl-5">
                        <div className="flex justify-between lg:flex-col lg:gap-1">
                          <div>
                            <p className="text-[10px] font-semibold text-[#7e8180] uppercase tracking-widest">Amount</p>
                            <p className="text-xl font-black text-[#2e4a3e]">{currency}{order.amount.toLocaleString('en-IN')}</p>
                          </div>
                          <div className="lg:mt-1">
                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${order.payment ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${order.payment ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                              {order.payment ? "Paid" : "Unpaid"}
                            </span>
                            <p className="text-[10px] text-[#7e8180] mt-1 font-medium">{order.paymentMethod}</p>
                          </div>
                        </div>
                        <div className="w-full pt-2 border-t border-[#f0f0f0] lg:border-none lg:pt-0">
                          <p className="text-[10px] font-semibold text-[#7e8180] uppercase tracking-widest mb-2">Update Status</p>

                          <div className="relative">
                            <select
                              onChange={(e) => statusHandler(e, order._id, order.status)}
                              value={order.status === 'Returned' ? '' : order.status}
                              disabled={order.status === 'Returned'}
                              className={`appearance-none w-full text-xs font-bold px-3 py-2.5 pr-8 rounded-xl border outline-none transition-all
      ${order.status === 'Returned'
                                  ? 'bg-rose-50 text-rose-400 border-rose-200 cursor-not-allowed opacity-70'
                                  : `cursor-pointer ${s.bg} ${s.text} ${s.border}`
                                }`}
                            >
                              {order.status === 'Returned' && (
                                <option value="" disabled>Return Approved — Locked</option>
                              )}
                              {Object.entries(STATUS_CONFIG)
                                .filter(([k]) => k !== 'Return Requested')
                                .map(([k, v]) => (
                                  <option
                                    key={k}
                                    value={k}
                                    disabled={k === 'Returned' && order.status !== 'Return Requested'} // 
                                  >
                                    {v.label}{k === 'Returned' && order.status !== 'Return Requested' ? ' (awaiting request)' : ''}
                                  </option>
                                ))
                              }
                            </select>
                            <Chevron className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            /* EMPTY STATE - ONLY SHOW IF NOT LOADING */
            !loading && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#e9e9e9] flex items-center justify-center mb-4">
                  <AlertCircle size={28} className="text-[#7e8180]" />
                </div>
                <p className="text-base font-bold text-[#374151]">No orders found</p>
                <p className="text-sm text-[#7e8180] mt-1">Try adjusting your filters or search query</p>
              </div>
            )
          )}

          {/* INFINITE SCROLL SENTINEL & PAGINATION LOADER */}
          <div ref={observerRef} className="h-10 w-full flex items-center justify-center">
            {loading && orders.length > 0 && (
              <div className="flex items-center gap-2">
                <Loader2 size={18} className="text-[#2e4a3e] animate-spin" />
                <span className="text-xs font-semibold text-[#7e8180] uppercase tracking-widest">Loading more...</span>
              </div>
            )}
            {!hasMore && orders.length > 0 && (
              <div className="flex items-center gap-4 w-full opacity-40">
                <div className="flex-1 h-px bg-[#e9e9e9]" />
                <p className="text-[10px] text-[#7e8180] font-bold uppercase tracking-[0.2em]">End of Records</p>
                <div className="flex-1 h-px bg-[#e9e9e9]" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOrders;