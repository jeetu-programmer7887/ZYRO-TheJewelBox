import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { ShopContext } from '../../config/ShopContext';

const formatDate = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatTimeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return formatDate(date);
};

const AnimatedNumber = ({ value }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) return;
    const duration = 1200;
    const stepTime = Math.max(Math.floor(duration / end), 10);
    const timer = setInterval(() => {
      start += Math.ceil(end / (duration / stepTime));
      if (start >= end) { setDisplay(end); clearInterval(timer); }
      else setDisplay(start);
    }, stepTime);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{display}</span>;
};

const Coins = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const { backendUrl } = useContext(ShopContext);

  //  Real API call
  useEffect(() => {
    const fetchCoins = async () => {
      try {
        setLoading(true);
        const { data: res } = await axios.get(backendUrl + '/api/order/fetch-coins', {
          withCredentials: true
        });
        if (res.success) {
          setData({
            coins: res.coins || 0,
            totalCoinsEarned: res.totalCoinsEarned || 0,
            coinsHistory: res.coinsHistory || []
          });
        } else {
          setError('Failed to load coins');
        }
      } catch (err) {
        console.error('Coins fetch error:', err);
        setError('Could not connect to server');
      } finally {
        setLoading(false);
      }
    };
    fetchCoins();
  }, [backendUrl]);

  const filtered = data?.coinsHistory?.filter(h =>
    activeTab === 'all' ? true :
      activeTab === 'earned' ? h.type === 'earned' :
        h.type === 'deducted'
  ) || [];

  const coinValue = data ? data.coins * 5 : 0;

  if (loading) return (
    <div className='bg-white lg:min-h-[80vh] lg:mx-5 lg:mt-5 lg:p-5 border border-(--color-green)/20 shadow-2xl rounded-lg flex items-center justify-center'>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-t-[#c9a96e] border-gray-200 rounded-full animate-spin" />
        <p className="text-xs text-gray-400 tracking-widest uppercase">Loading your coins...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className='bg-white lg:min-h-[80vh] lg:mx-5 lg:mt-5 lg:p-5 border border-(--color-green)/20 shadow-2xl rounded-lg flex items-center justify-center'>
      <div className="flex flex-col items-center gap-3">
        <p className="text-4xl">⚠️</p>
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes coinFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(5deg); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .coin-float { animation: coinFloat 3s ease-in-out infinite; }
        .shimmer-text {
          background: linear-gradient(90deg, #c9a96e 0%, #f5d79e 40%, #c9a96e 60%, #8b6914 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s linear infinite;
        }
        .history-row {
          animation: fadeSlideUp 0.4s ease forwards;
          opacity: 0;
        }
        .tab-active {
          background: #1a1208;
          color: #c9a96e;
        }
      `}</style>

      <div className='bg-white p-4 lg:min-h-[80vh] lg:mx-5 lg:mt-5 space-y-6 lg:p-6 border border-(--color-green)/20 shadow-2xl rounded-lg'>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="title text-xl text-(--color-green) tracking-widest uppercase">Your Coins</div>
        </div>

        {/* Top Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Main balance card */}
          <div className="md:col-span-2 relative overflow-hidden rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, #1a1208 0%, #2d1e0a 30%, #1a1208 100%)' }}>
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10" style={{ background: '#c9a96e' }} />
            <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full opacity-5" style={{ background: '#c9a96e' }} />
            <div className="relative z-10">
              <p className="text-[10px] tracking-[3px] text-[#c9a96e]/70 uppercase mb-3">Available Balance</p>
              <div className="flex items-center gap-4 mb-4">
                <lord-icon
                  src="https://cdn.lordicon.com/cukgelaw.json"
                  trigger="loop"
                  state="loop-cycle"
                  style={{ width: "50px", height: "50px" }}
                >
                </lord-icon>
                <div>
                  <script src="https://cdn.lordicon.com/lordicon.js"></script>
                  <div className="shimmer-text text-5xl font-black tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
                    <AnimatedNumber value={data.coins} />
                  </div>
                  <p className="text-[11px] text-[#c9a96e]/60 mt-1 tracking-wider">ZYRO COINS</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-2.5 w-fit">
                <span className="text-sm text-[#c9a96e]">≈</span>
                <span className="text-[#e8dcc8] font-bold text-sm">₹{coinValue.toLocaleString('en-IN')}</span>
                <span className="text-[#c9a96e]/50 text-xs">redeemable value</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-col gap-4">
            <div className="flex-1 rounded-2xl p-4 border border-amber-100 bg-linear-to-br from-amber-50 to-yellow-50">
              <p className="text-[9px] tracking-[2px] text-amber-500 uppercase font-bold mb-2">Total Earned</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl">📈</span>
                <span className="text-2xl font-black text-amber-600" style={{ fontFamily: 'Georgia, serif' }}>
                  {data.totalCoinsEarned}
                </span>
              </div>
              <p className="text-[10px] text-amber-400 mt-1">lifetime coins</p>
            </div>
            <div className="flex-1 rounded-2xl p-4 border border-green-100 bg-linear-to-br from-green-50 to-emerald-50">
              <p className="text-[9px] tracking-[2px] text-green-600 uppercase font-bold mb-2">Max Discount</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏷️</span>
                <span className="text-2xl font-black text-green-600" style={{ fontFamily: 'Georgia, serif' }}>10%</span>
              </div>
              <p className="text-[10px] text-green-400 mt-1">per order cap</p>
            </div>
          </div>
        </div>

        {/* How to earn */}
        <div className="rounded-2xl border border-gray-100 p-5 bg-gray-50/50">
          <p className="text-[10px] tracking-[3px] text-(--color-green) uppercase font-bold mb-4">How to Earn Coins</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: '📦', title: 'Place an Order', desc: 'Earn 5–10 random coins', highlight: true },
              { icon: '', title: 'Order Delivered', desc: 'Coins added automatically' },
              { icon: '🛍️', title: 'Redeem at Checkout', desc: 'Use coins for up to 10% off' },
            ].map((item, i) => (
              <div key={i} className={`rounded-xl p-4 flex items-start gap-3 ${item.highlight ? 'bg-[#1a1208]/5 border border-[#c9a96e]/20' : 'bg-white border border-gray-100'}`}>
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="text-xs font-bold text-gray-700">{item.title}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction History */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
            <p className="text-[10px] tracking-[3px] text-(--color-green) uppercase font-bold">Transaction History</p>

            {/* Tab Navigation: Now wraps better on small screens */}
            <div className="flex bg-gray-100 p-1 rounded-xl gap-1 w-full sm:w-auto overflow-x-auto no-scrollbar">
              {['all', 'earned', 'deducted'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 sm:flex-none px-3 py-2 text-[10px] uppercase tracking-widest font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${activeTab === tab ? 'tab-active' : 'text-gray-400'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-300">
              <p className="text-4xl mb-3">🪙</p>
              <p className="text-sm text-gray-400 px-4">
                {activeTab === 'all' ? 'No transactions yet — complete an order to earn coins!'
                  : activeTab === 'earned' ? 'No coins earned yet'
                    : 'No coins deducted yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((item, i) => (
                <div
                  key={i}
                  className="history-row flex items-start sm:items-center justify-between p-3 sm:p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition-all bg-white shadow-sm sm:shadow-none"
                  style={{ animationDelay: `${i * 0.07}s` }}
                >
                  {/* Left Side: Icon and Info */}
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                    <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg
              ${item.type === 'earned' ? 'bg-green-50' :
                        item.type === 'expired' ? 'bg-gray-50' : 'bg-red-50'}`}>
                      {item.type === 'earned' ? '⬆️' : item.type === 'expired' ? '⏰' : '⬇️'}
                    </div>

                    <div className="min-w-0"> {/* min-w-0 prevents flex items from overflowing */}
                      <p className="text-sm font-semibold text-gray-800 truncate sm:whitespace-normal">{item.reason}</p>

                      {/* Mobile-friendly Date and Expiry layout */}
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <p className="text-[11px] text-gray-400 whitespace-nowrap">{formatTimeAgo(item.date)}</p>

                        {item.type === 'earned' && item.expiresAt && (
                          <p className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter sm:tracking-normal
                    ${new Date(item.expiresAt) - Date.now() < 7 * 86400000
                              ? 'bg-red-50 text-red-500 border border-red-100'
                              : 'bg-amber-50 text-amber-600 border border-amber-100'
                            }`}>
                            Exp: {formatDate(item.expiresAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Values */}
                  <div className="text-right shrink-0 ml-2">
                    <p className={`text-base sm:text-lg font-black leading-none
              ${item.type === 'earned' ? 'text-green-600' :
                        item.type === 'expired' ? 'text-gray-400' : 'text-red-500'}`}
                      style={{ fontFamily: 'Georgia, serif' }}>
                      {item.type === 'earned' ? '+' : '-'}{item.coins}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1 font-medium">
                      {item.type === 'earned' ? `+₹${item.coins * 5}` : `-₹${item.coins * 5}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center pt-2 pb-1">
          <p className="text-[11px] para text-gray-400">
            Coins are awarded after your order is delivered · Max 10% discount per order · Coins expire in 1 month
          </p>
        </div>

      </div>
    </>
  );
};

export default Coins;