import { useEffect, useState, useContext, useCallback, useRef } from 'react';
import axios from 'axios';
import { NavLink } from 'react-router-dom';
import { ShopContext } from '../../config/ShopContext';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';
import { openRazorpayCheckout } from '../../Utility/razorpay';
import { PaymentBadge, PriceBreakdown, RefundNote, PayCountdown } from '../../Components/orders/OrderParts';
import { orderIdOf, shortOrderId, formatDate, formatDateTime, formatMoney, apiMessage } from '../../Components/orders/orderFormat';

// These have their own pages (Cancelled / Returns); this is only a view filter.
const HIDDEN_HERE = ['Cancelled', 'Return Requested', 'Returned'];

const Orders = () => {
  const [orders, setOrders] = useState([]); // OrderView[] straight from the server
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [busy, setBusy] = useState({}); // { [orderId]: 'cancel' | 'return' | 'pay' }
  const busyRef = useRef(new Set());
  const loadedRef = useRef(false);
  const { currency, backendUrl } = useContext(ShopContext);

  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    toast.success("Order ID copied");
  };

  const [reviewModal, setReviewModal] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null); // { orderId, productId, productName, productImage }
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewImage, setReviewImage] = useState(null);
  const [reviewImagePreview, setReviewImagePreview] = useState(null);
  const [reviewedOrders, setReviewedOrders] = useState({}); // { orderId_productId: true }
  const [submitting, setSubmitting] = useState(false);

  const openReviewModal = (orderId, productId, productName, productImage) => {
    setReviewTarget({ orderId, productId, productName, productImage });
    setRating(0);
    setReviewText('');
    setReviewImage(null);
    setReviewImagePreview(null);
    setReviewModal(true);
  };

  // Submit review
  const submitReview = async () => {
    if (rating === 0) return Swal.fire('Oops', 'Please select a star rating', 'warning');
    if (!reviewText.trim()) return Swal.fire('Oops', 'Please write a review', 'warning');

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('productId', reviewTarget.productId);
      formData.append('orderId', reviewTarget.orderId);
      formData.append('rating', rating);
      formData.append('review', reviewText);
      if (reviewImage) formData.append('image', reviewImage);

      const response = await axios.post(`${backendUrl}/api/review/submit`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        setReviewedOrders(prev => ({
          ...prev,
          [`${reviewTarget.orderId}_${reviewTarget.productId}`]: true
        }));
        setReviewModal(false);
        Swal.fire({
          title: 'Review Submitted!',
          text: 'Thank you for your feedback.',
          icon: 'success',
          confirmButtonColor: '#2e4a3e',
          scrollbarPadding: false
        });
      } else {
        Swal.fire('Error', response.data.message, 'error');
      }
    } catch (error) {
      Swal.fire('Error', apiMessage(error, 'Could not submit review'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchOrders = useCallback(async () => {
    if (loadedRef.current) setIsRefreshing(true);
    else setLoading(true);
    try {
      const response = await axios.get(`${backendUrl}/api/order/userorders`);
      if (response.data.success) {
        const allOrders = response.data.orders || [];
        setOrders(allOrders);
        loadedRef.current = true;

        // Check which products are already reviewed
        const reviewableItems = allOrders
          .filter(o => o.actions?.canReview)
          .flatMap(o => o.items.map(item => ({ orderId: orderIdOf(o), productId: item.productId?.$oid || item.productId })));
        if (reviewableItems.length > 0) {
          const reviewChecks = await Promise.all(
            reviewableItems.map(item =>
              axios.get(`${backendUrl}/api/review/check/${item.productId}/${item.orderId}`, {
                withCredentials: true
              }).then(res => ({
                key: `${item.orderId}_${item.productId}`,
                hasReviewed: res.data.hasReviewed
              })).catch(() => null)
            )
          );

          const reviewed = {};
          reviewChecks.forEach(r => {
            if (r && r.hasReviewed) reviewed[r.key] = true;
          });
          setReviewedOrders(reviewed);
        }
      }
    } catch (error) {
      console.error('Fetch Error:', error);
      toast.error(apiMessage(error, "Couldn't load your orders. Please try again."));
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [backendUrl]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Swap in the server's latest view of one order
  const replaceOrder = (updated) => {
    if (!updated) return;
    const id = orderIdOf(updated);
    setOrders(prev => prev.map(o => (orderIdOf(o) === id ? updated : o)));
  };

  // One request per order at a time (ref guards against fast double clicks)
  const begin = (orderId, action) => {
    if (busyRef.current.has(orderId)) return false;
    busyRef.current.add(orderId);
    setBusy(prev => ({ ...prev, [orderId]: action }));
    return true;
  };
  const end = (orderId) => {
    busyRef.current.delete(orderId);
    setBusy(prev => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
  };

  const cancelOrderHandler = async (orderId) => {
    if (busyRef.current.has(orderId)) return;
    const { isConfirmed, value } = await Swal.fire({
      title: 'Cancel this order?',
      text: "This will cancel all the products included in the order.",
      icon: 'warning',
      input: 'textarea',
      inputPlaceholder: 'Reason for cancelling (optional)',
      inputAttributes: { maxlength: '300' },
      showCancelButton: true,
      confirmButtonColor: '#2e4a3e',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, cancel it!',
      cancelButtonText: 'No, keep it',
      scrollbarPadding: false
    });
    if (!isConfirmed || !begin(orderId, 'cancel')) return;
    try {
      const reason = (value || '').trim();
      const { data } = await axios.patch(`${backendUrl}/api/order/cancel`, { orderId, ...(reason ? { reason } : {}) }, {
        withCredentials: true
      });
      if (data.success) {
        replaceOrder(data.order);
        toast.success(data.message || 'Order cancelled');
      } else {
        toast.error(data.message || 'Could not cancel order');
      }
    } catch (error) {
      if (error.response?.data?.order) replaceOrder(error.response.data.order);
      toast.error(apiMessage(error, 'Could not cancel order. Please try again.'));
    } finally {
      end(orderId);
    }
  };

  const returnOrderHandler = async (orderId) => {
    if (busyRef.current.has(orderId)) return;
    const { value: reason, isConfirmed } = await Swal.fire({
      title: 'Request Return',
      html: `
        <p style="font-size:13px; color:#6b7280; margin-bottom:12px;">
          Please let us know why you want to return this item.
        </p>
        <textarea id="returnReason" class="swal2-textarea" placeholder="e.g. Product damaged, Wrong item received..." style="height:100px; font-size:13px;"></textarea>
      `,
      confirmButtonColor: '#2e4a3e',
      cancelButtonColor: '#d33',
      showCancelButton: true,
      confirmButtonText: 'Submit Return Request',
      cancelButtonText: 'Cancel',
      scrollbarPadding: false,
      preConfirm: () => {
        const reason = document.getElementById('returnReason').value.trim();
        if (!reason) {
          Swal.showValidationMessage('Please provide a reason for return');
          return false;
        }
        return reason;
      }
    });

    if (!isConfirmed || !reason || !begin(orderId, 'return')) return;
    try {
      const { data } = await axios.patch(
        `${backendUrl}/api/order/return-request`,
        { orderId, reason },
        { withCredentials: true }
      );
      if (data.success) {
        replaceOrder(data.order);
        toast.success(data.message || 'Return request submitted');
      } else {
        toast.error(data.message || 'Could not submit return request');
      }
    } catch (error) {
      if (error.response?.data?.order) replaceOrder(error.response.data.order);
      toast.error(apiMessage(error, 'Could not submit return request. Please try again.'));
    } finally {
      end(orderId);
    }
  };

  const payNowHandler = async (order) => {
    const orderId = orderIdOf(order);
    if (!begin(orderId, 'pay')) return;
    try {
      let start;
      try {
        ({ data: start } = await axios.post(`${backendUrl}/api/order/${orderId}/pay`, {}, { withCredentials: true }));
      } catch (error) {
        if (error.response?.data?.order) replaceOrder(error.response.data.order);
        toast.error(apiMessage(error, "Couldn't start the payment. Please try again."));
        return;
      }
      if (start.order) replaceOrder(start.order);
      if (!start.checkout) {
        toast.info(start.message || 'This order no longer needs payment.');
        return;
      }

      let gatewayResponse;
      try {
        gatewayResponse = await openRazorpayCheckout(start.checkout);
      } catch (error) {
        if (error.code === 'DISMISSED') {
          const until = start.checkout.expiresAt || order.paymentExpiresAt;
          toast.info(until
            ? `Payment not completed. You can pay later from My Orders until ${formatDateTime(until)}.`
            : 'Payment not completed. You can pay later from My Orders.');
        } else if (error.code === 'PAYMENT_FAILED') {
          toast.error(error.description || error.message || 'Payment failed');
        } else {
          toast.error(error.message || "Couldn't open the payment window.");
        }
        return;
      }

      try {
        const { data } = await axios.post(`${backendUrl}/api/order/verify-razorpay`, {
          razorpay_order_id: gatewayResponse.razorpay_order_id,
          razorpay_payment_id: gatewayResponse.razorpay_payment_id,
          razorpay_signature: gatewayResponse.razorpay_signature,
        }, { withCredentials: true });
        if (data.order) replaceOrder(data.order);
        if (data.success) toast.success(data.message || 'Payment successful');
        else toast.error(data.message || "We couldn't confirm this payment yet.");
      } catch (error) {
        if (error.response?.data?.order) replaceOrder(error.response.data.order);
        toast.error(apiMessage(error, "We couldn't confirm this payment yet. Please check My Orders in a minute."));
      }
    } finally {
      end(orderId);
    }
  };

  const getStatusDot = (status) => {
    if (status === 'Delivered')        return 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]';
    if (status === 'Pending Payment')  return 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]';
    return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]';
  };

  const visibleOrders = orders.filter(o => !HIDDEN_HERE.includes(o.status));

  return (
    <div className='bg-white lg:min-h-9/12 lg:mx-5 lg:mt-5 space-y-5 lg:p-5 border border-(--color-green)/20 shadow-2xl rounded-lg'>

      {/* Header */}
      <div className="flex justify-between items-center px-2 pt-4 sm:pt-0">
        <div className="title text-xl text-(--color-green) font-bold tracking-tight">MY ORDERS</div>
        <div className="flex items-center gap-4">
          <NavLink to="/userAccount/cancel" className="hidden sm:block text-xs font-bold text-red-500 hover:text-red-700 transition-colors uppercase tracking-widest border-b border-red-200">
            View Cancelled
          </NavLink>
          <button onClick={fetchOrders} disabled={isRefreshing}
            className="flex items-center gap-2 text-sm font-medium text-(--color-green) hover:text-(--color-gold) transition-colors cursor-pointer group">
            <span className={`${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z" />
                <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" />
              </svg>
            </span>
            {isRefreshing ? "Refreshing..." : "Refresh Status"}
          </button>
        </div>
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
            Loading Active Orders
          </p>
        </div>

      ) : visibleOrders.length === 0 ? (
        <div className="content rounded-xl flex flex-col items-center justify-center min-h-[60vh] bg-(--color-lightgray)/40">
          <lord-icon src="https://cdn.lordicon.com/qfijwmqj.json" trigger="hover" colors="primary:#2e4a3e,secondary:#c6a664" style={{ width: "100px", height: "100px" }} />
          <p className='mt-4 text-gray-600 font-medium'>You don't have any active orders.</p>
          <div className="flex gap-4">
            <NavLink to="/"><button className="px-8 py-3 mt-6 bg-(--color-green) text-white rounded-full hover:bg-(--color-gold) shadow-lg transition-all cursor-pointer">Start Shopping</button></NavLink>
            <NavLink to="/userAccount/cancel"><button className="px-8 py-3 mt-6 border border-red-200 text-red-500 rounded-full hover:bg-red-50 transition-all cursor-pointer">Cancelled History</button></NavLink>
          </div>
        </div>

      ) : (
        <div className="space-y-3">
          {visibleOrders.map((order) => {
            const orderId = orderIdOf(order);
            const actions = order.actions || {};
            const busyAction = busy[orderId];
            const isBusy = !!busyAction;

            return (
              <div key={orderId}
                className="p-4 bg-white rounded-xl border border-gray-100 space-y-4 transition-all duration-300 hover:border-(--color-green)/30 hover:shadow-md group">

                {/* Order header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => handleCopyId(orderId)}
                      className="font-mono text-[11px] font-semibold text-(--color-green) bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg hover:bg-(--color-green) hover:text-(--color-gold) transition-all cursor-pointer">
                      #{shortOrderId(order)}
                    </button>
                    <span className="text-xs text-gray-500">Placed {formatDate(order.createdAt)}</span>
                    <PaymentBadge order={order} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${getStatusDot(order.status)}`} />
                    <span className="text-sm font-semibold text-gray-700 uppercase tracking-tight">{order.status}</span>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-3">
                  {order.items.map((item, index) => {
                    const productId = item.productId?.$oid || item.productId;
                    const reviewKey = `${orderId}_${productId}`;
                    return (
                      <div key={`${productId}_${index}`} className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex flex-1 gap-4 items-center min-w-0">
                          <NavLink to={`/product/${productId}`}>
                            <img className='w-16 h-16 object-cover rounded-lg shadow-sm group-hover:scale-105 transition-transform' src={item.image} alt={item.title} />
                          </NavLink>
                          <div className="flex-1 min-w-0">
                            <NavLink to={`/product/${productId}`}>
                              <h3 className="font-semibold text-gray-800 hover:text-(--color-green) transition-colors truncate">{item.title}</h3>
                            </NavLink>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatMoney(currency, item.price)} • Qty: {item.quantity} • {formatMoney(currency, item.lineTotal)}
                            </p>
                          </div>
                        </div>
                        {actions.canReview && (
                          <button
                            onClick={() => openReviewModal(orderId, productId, item.title, item.image)}
                            disabled={reviewedOrders[reviewKey]}
                            className={`cursor-pointer px-3 py-2 text-xs font-bold border rounded transition-all active:scale-95 self-end sm:self-auto
                              ${reviewedOrders[reviewKey]
                                ? 'text-gray-400 border-gray-100 cursor-not-allowed'
                                : 'text-amber-600 border-amber-200 hover:bg-amber-500 hover:text-white'
                              }`}>
                            {reviewedOrders[reviewKey] ? '✓ REVIEWED' : '★ REVIEW'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Footer: totals, notes, actions */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pt-3 border-t border-gray-100">
                  <div className="flex flex-col gap-2">
                    {actions.canPay && order.paymentExpiresAt && (
                      <PayCountdown expiresAt={order.paymentExpiresAt} onExpire={fetchOrders} />
                    )}
                    {order.returnWindowEndsAt && (
                      <span className="text-[11px] text-gray-500">
                        Return window {actions.canReturn ? "ends" : "ended"} on <span className="font-semibold text-gray-700">{formatDate(order.returnWindowEndsAt)}</span>
                      </span>
                    )}
                    <RefundNote order={order} currency={currency} />
                    <div className="flex flex-wrap gap-2">
                      {actions.canPay && (
                        <button onClick={() => payNowHandler(order)} disabled={isBusy}
                          className="cursor-pointer px-4 py-2 text-[11px] text-white font-bold bg-(--color-green) rounded-lg hover:bg-(--color-gold) transition-all uppercase disabled:opacity-60 disabled:cursor-not-allowed">
                          {busyAction === 'pay' ? 'Processing…' : 'Pay now'}
                        </button>
                      )}
                      {actions.canCancel && (
                        <button onClick={() => cancelOrderHandler(orderId)} disabled={isBusy}
                          className="cursor-pointer px-4 py-2 text-[11px] text-red-600 font-bold border border-red-100 rounded-lg hover:bg-red-600 hover:text-white transition-all uppercase disabled:opacity-60 disabled:cursor-not-allowed">
                          {busyAction === 'cancel' ? 'Cancelling…' : 'Cancel'}
                        </button>
                      )}
                      {actions.canReturn && (
                        <button onClick={() => returnOrderHandler(orderId)} disabled={isBusy}
                          className="cursor-pointer px-4 py-2 text-[11px] text-orange-600 font-bold border border-orange-200 rounded-lg hover:bg-orange-500 hover:text-white transition-all uppercase disabled:opacity-60 disabled:cursor-not-allowed">
                          {busyAction === 'return' ? 'Submitting…' : 'Return'}
                        </button>
                      )}
                    </div>
                  </div>
                  <PriceBreakdown pricing={order.pricing} currency={currency} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && reviewTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">

            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="title text-lg text-(--color-green) font-bold">Write a Review</h2>
              <button onClick={() => setReviewModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-all cursor-pointer text-gray-400">
                ✕
              </button>
            </div>

            {/* Product Info */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <img src={reviewTarget.productImage} className="w-12 h-12 rounded-lg object-cover" />
              <p className="text-sm font-semibold text-gray-700">{reviewTarget.productName}</p>
            </div>

            {/* Star Rating */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Your Rating</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="text-3xl transition-all cursor-pointer">
                    <span className={(hoverRating || rating) >= star ? 'text-yellow-400' : 'text-gray-200'}>★</span>
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-xs text-amber-500 mt-1 font-medium">
                  {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
                </p>
              )}
            </div>

            {/* Review Text */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Your Review</p>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your experience with this product..."
                rows={4}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-700 outline-none focus:border-(--color-green) focus:ring-2 focus:ring-(--color-green)/10 resize-none transition-all"
              />
              <p className="text-[10px] text-gray-400 mt-1">{reviewText.length}/500 characters</p>
            </div>

            {/* Photo Upload */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Add Photo (optional)</p>
              {reviewImagePreview ? (
                <div className="relative w-24 h-24">
                  <img src={reviewImagePreview} className="w-24 h-24 object-cover rounded-xl border border-gray-200" />
                  <button onClick={() => { setReviewImage(null); setReviewImagePreview(null); }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center cursor-pointer">
                    ✕
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 w-fit cursor-pointer px-4 py-2.5 border-2 border-dashed border-gray-200 rounded-xl hover:border-(--color-green)/50 transition-all">
                  <span className="text-gray-400 text-lg">📷</span>
                  <span className="text-xs text-gray-400">Upload photo</span>
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setReviewImage(file);
                        setReviewImagePreview(URL.createObjectURL(file));
                      }
                    }} />
                </label>
              )}
            </div>

            {/* Submit */}
            <button onClick={submitReview} disabled={submitting}
              className={`w-full py-3 rounded-xl text-sm font-bold text-white transition-all cursor-pointer
                ${submitting ? 'bg-gray-300 cursor-not-allowed' : 'bg-(--color-green) hover:bg-(--color-gold)'}`}>
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>

          </div>
        </div>
      )}

    </div>
  );
};

export default Orders;