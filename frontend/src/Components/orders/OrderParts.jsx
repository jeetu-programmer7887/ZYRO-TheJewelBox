import { useEffect, useRef, useState } from 'react';
import { formatMoney, formatTime, paymentTone, refundTone } from './orderFormat';

/** Payment badge rendered from the server's paymentStatus / paymentLabel. */
export const PaymentBadge = ({ order }) => {
  if (!order?.paymentLabel) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${paymentTone(order.paymentStatus)}`}>
      {order.paymentLabel}
      {order.paymentMethod && <span className="font-medium normal-case opacity-70">· {order.paymentMethod}</span>}
    </span>
  );
};

/** Subtotal / delivery / coin discount / total, exactly as priced by the server. */
export const PriceBreakdown = ({ pricing, currency }) => {
  if (!pricing) return null;
  return (
    <div className="text-xs text-gray-600 space-y-1 min-w-48">
      <div className="flex justify-between gap-6"><span>Subtotal</span><span>{formatMoney(currency, pricing.subtotal)}</span></div>
      <div className="flex justify-between gap-6">
        <span>Delivery</span>
        <span>{Number(pricing.deliveryFee) > 0 ? formatMoney(currency, pricing.deliveryFee) : 'Free'}</span>
      </div>
      {Number(pricing.coinDiscount) > 0 && (
        <div className="flex justify-between gap-6 text-(--color-gold)">
          <span>Coin discount</span><span>−{formatMoney(currency, pricing.coinDiscount)}</span>
        </div>
      )}
      <div className="flex justify-between gap-6 pt-1 border-t border-gray-100 font-bold text-(--color-green) text-sm">
        <span>Total</span><span>{formatMoney(currency, pricing.total)}</span>
      </div>
    </div>
  );
};

/** Refund note from the server's refundLabel / refundAmount. */
export const RefundNote = ({ order, currency }) => {
  if (!order?.refundLabel) return null;
  return (
    <div className={`text-[11px] px-2 py-1 rounded-lg w-fit border ${refundTone(order.refundStatus)}`}>
      💳 {order.refundLabel}
      {Number(order.refundAmount) > 0 && <span className="font-semibold"> · {formatMoney(currency, order.refundAmount)}</span>}
    </div>
  );
};

const pad = (n) => String(n).padStart(2, '0');

/**
 * "Pay by hh:mm · mm:ss left" for an order the server says is payable.
 * When the deadline passes it calls onExpire once so the page can ask the
 * server for the order's real state.
 */
export const PayCountdown = ({ expiresAt, onExpire }) => {
  const [now, setNow] = useState(() => Date.now());
  const firedRef = useRef(false);
  const deadline = expiresAt ? new Date(expiresAt).getTime() : null;
  const remaining = deadline ? Math.max(0, deadline - now) : null;

  useEffect(() => {
    if (!deadline) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [deadline]);

  useEffect(() => {
    if (remaining === 0 && !firedRef.current) {
      firedRef.current = true;
      onExpire?.();
    }
  }, [remaining, onExpire]);

  if (!deadline) return null;
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);

  return (
    <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg">
      Pay by {formatTime(expiresAt)}
      {remaining > 0 ? ` · ${pad(mins)}:${pad(secs)} left` : ' · checking…'}
    </span>
  );
};
