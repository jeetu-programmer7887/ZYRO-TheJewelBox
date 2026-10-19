// Presentation helpers for order screens. No business rules live here:
// eligibility, totals, windows and labels all come from the backend.

export const orderIdOf = (order) => String(order?._id?.$oid || order?._id || '');

export const shortOrderId = (order) => orderIdOf(order).slice(-8).toUpperCase();

export const formatMoney = (currency, value) =>
  `${currency}${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export const formatTime = (value) =>
  value ? new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';

export const formatDateTime = (value) =>
  value ? `${formatDate(value)}, ${formatTime(value)}` : '';

// Prefer the server's explanation; fall back to a generic message.
export const apiMessage = (error, fallback = 'Something went wrong. Please try again.') =>
  error?.response?.data?.message || fallback;

// Visual tone for a payment status code (colour only).
export const paymentTone = (paymentStatus) => {
  if (['captured', 'cod_collected', 'refunded'].includes(paymentStatus)) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (['failed', 'expired'].includes(paymentStatus)) return 'bg-red-50 text-red-600 border-red-100';
  return 'bg-amber-50 text-amber-700 border-amber-100';
};

export const refundTone = (refundStatus) => {
  if (refundStatus === 'processed') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (refundStatus === 'failed') return 'bg-red-50 text-red-600 border-red-100';
  return 'bg-sky-50 text-sky-700 border-sky-100';
};
