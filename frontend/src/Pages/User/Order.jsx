import { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { NavLink } from 'react-router-dom';
import { ShopContext } from '../../config/ShopContext';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';

const statusConfig = {
  Delivered:     { dot: 'bg-emerald-400', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  Packing:       { dot: 'bg-amber-400',   text: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-100'   },
  'Order Placed':{ dot: 'bg-blue-400',    text: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-100'    },
  Shipped:       { dot: 'bg-violet-400',  text: 'text-violet-700',  bg: 'bg-violet-50',  border: 'border-violet-100'  },
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
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
      Swal.fire('Error', 'Could not submit review', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchOrders = async () => {
    if (orders.length > 0) setIsRefreshing(true);
    else setLoading(true);
    try {
      const response = await axios.get(`${backendUrl}/api/order/userorders`);
      if (response.data.success) {
        let allOrdersItem = [];
        response.data.orders.forEach((order) => {
          if (order.status !== "Cancelled" && order.status !== "Pending Payment" && order.status !== "Returned" && order.status !== "Return Requested") {
            order.items.forEach((item) => {
              allOrdersItem.push({
                ...item,
                orderId: order._id?.$oid || order._id,
                status: order.status,
                payment: order.payment,
                paymentMethod: order.paymentMethod,
                createdAt: order.createdAt?.$date || order.createdAt,
                deliveryDate: order.deliveryDate,
              });
            });
          }
        });
        setOrders(allOrdersItem);

        // Check which products are already reviewed
        const deliveredItems = allOrdersItem.filter(i => i.status === 'Delivered');
        if (deliveredItems.length > 0) {
          const reviewChecks = await Promise.all(
            deliveredItems.map(item =>
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
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const cancelOrderHandler = async (orderId) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "This will cancel all the products included in the order.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#2e4a3e',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, cancel it!',
      cancelButtonText: 'No, keep it',
      scrollbarPadding: false
    });
    if (result.isConfirmed) {
      try {
        const response = await axios.patch(`${backendUrl}/api/order/cancel`, { orderId }, {
          withCredentials: true
        });
        if (response.data.success) {
          Swal.fire({ title: 'Cancelled!', text: 'Order cancelled successfully.', icon: 'success', confirmButtonColor: '#2e4a3e', scrollbarPadding: false });
          fetchOrders();
        } else {
          Swal.fire('Error', response.data.message || 'Could not cancel order', 'error');
        }
      } catch (error) {
        Swal.fire('Error', 'Server error. Please try again later.', 'error');
      }
    }
  };

  const returnOrderHandler = async (orderId) => {
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

    if (isConfirmed && reason) {
      try {
        const response = await axios.patch(
          `${backendUrl}/api/order/return-request`,
          { orderId, reason },
          { withCredentials: true }
        );
        if (response.data.success) {
          Swal.fire({
            title: 'Return Requested!',
            text: 'Your return request has been submitted. Our team will review it shortly.',
            icon: 'success',
            confirmButtonColor: '#2e4a3e',
            scrollbarPadding: false
          });
          fetchOrders();
        } else {
          Swal.fire('Error', response.data.message || 'Could not submit return request', 'error');
        }
      } catch (error) {
        Swal.fire('Error', 'Server error. Please try again later.', 'error');
      }
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const getStatusDot = (status) => {
    if (status === 'Delivered')        return 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]';
    if (status === 'Return Requested') return 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]';
    if (status === 'Returned')         return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]';
    return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]';
  };

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

      ) : orders.length === 0 ? (
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
          {orders.map((item, index) => {
            const productId = item.productId?.$oid || item.productId;
            const status = statusConfig[item.status] || statusConfig['Order Placed'];

            return (
              <div key={index}
                className="p-4 bg-white rounded-xl border border-gray-100 flex flex-col lg:flex-row lg:items-center gap-4 transition-all duration-300 hover:border-(--color-green)/30 hover:shadow-md group">

                {/* Product Info */}
                <div className="flex flex-1 gap-4 items-center">
                  <NavLink to={`/product/${productId}`}>
                    <img className='w-16 h-16 object-cover rounded-lg shadow-sm group-hover:scale-105 transition-transform' src={item.image} alt={item.title} />
                  </NavLink>
                  <div className="flex-1 min-w-0">
                    <NavLink to={`/product/${productId}`}>
                      <h3 className="font-semibold text-gray-800 hover:text-(--color-green) transition-colors truncate">{item.title}</h3>
                    </NavLink>
                    <p className="text-xs text-gray-500 mt-1">
                      {currency}{item.price} • Qty: {item.quantity} • {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2 lg:w-40 shrink-0">
                  <span className={`w-2.5 h-2.5 rounded-full ${getStatusDot(item.status)}`} />
                  <span className="text-sm font-semibold text-gray-700 uppercase tracking-tight">{item.status}</span>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 shrink-0 lg:w-50 lg:ml-auto">
                  {item.status === 'Return Requested' && (
                    <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-100 uppercase">Return Pending</span>
                  )}
                  {item.status === 'Returned' && (
                    <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100 uppercase">Returned</span>
                  )}
                  {(item.status === 'Order Placed' || item.status === 'Packing') && (
                    <button onClick={() => cancelOrderHandler(item.orderId)}
                      className="cursor-pointer px-4 py-2 text-[11px] text-red-600 font-bold border border-red-100 rounded-lg hover:bg-red-600 hover:text-white transition-all uppercase">
                      Cancel
                    </button>
                  )}
                  {item.status === 'Delivered' && (
                    <button
                      onClick={() => openReviewModal(item.orderId, item.productId, item.title, item.image)}
                      disabled={reviewedOrders[`${item.orderId}_${item.productId}`]}
                      className={`cursor-pointer px-3 py-2 text-xs font-bold border rounded transition-all active:scale-95
                        ${reviewedOrders[`${item.orderId}_${item.productId}`]
                          ? 'text-gray-400 border-gray-100 cursor-not-allowed'
                          : 'text-amber-600 border-amber-200 hover:bg-amber-500 hover:text-white'
                        }`}>
                      {reviewedOrders[`${item.orderId}_${item.productId}`] ? '✓ REVIEWED' : '★ REVIEW'}
                    </button>
                  )}
                  {item.status === 'Delivered' && (
                    <button onClick={() => returnOrderHandler(item.orderId)}
                      className="cursor-pointer px-4 py-2 text-[11px] text-orange-600 font-bold border border-orange-200 rounded-lg hover:bg-orange-500 hover:text-white transition-all uppercase">
                      Return
                    </button>
                  )}
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