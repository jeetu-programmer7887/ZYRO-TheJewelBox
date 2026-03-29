import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { ShopContext } from '../config/ShopContext';
import { exportToCSV } from '../Utility/exportCSV';
import { useNavigate } from 'react-router-dom';
import {
    ShoppingBag, Users, AlertTriangle, TrendingUp, PieChart as PieIcon,
    BarChart3, ArrowUpRight, Clock, ChevronRight, Download, IndianRupee,
    Sparkles, Activity
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const { backendUrl, currency } = useContext(ShopContext);
    const [range, setRange] = useState('7');
    const navigate = useNavigate();

    const COLORS = ['#2e4a3e', '#c6a664', '#b76e79', '#374151', '#7e8180'];

    const rangeText = {
        'today': 'Today',
        '7': '7 Days',
        '30': '30 Days',
        '90': '3 Months'
    };

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`${backendUrl}/api/admin/stats?range=${range}`, { withCredentials: true });
                if (response.data.success) setStats(response.data);
            } catch (error) {
                console.error("Error fetching dashboard stats:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [backendUrl, range]);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh] bg-[#f9faf9]">
            <div className="flex flex-col items-center gap-5">
                <div className="relative w-14 h-14">
                    <div className="absolute inset-0 rounded-full border-4 border-[#e9e9e9]" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-[#2e4a3e] border-r-[#c6a664] animate-spin" />
                </div>
                <p className="text-[#7e8180] text-xs font-semibold tracking-[3px] uppercase">Syncing Analytics…</p>
            </div>
        </div>
    );

    if (!stats) return (
        <div className="p-10 text-center text-[#b76e79] font-semibold">Connection Error</div>
    );

    const { kpis, charts, topProducts, recentOrders, exportData } = stats;

    return (
        <div className="min-h-screen bg-[#f9faf9]">
            {/* Subtle top accent line */}
            <div className="max-w-350 mx-auto pb-6 space-y-8">

                {/* ════════════════════════════
                    HEADER
                ════════════════════════════ */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2.5 mb-1">
                            <div className="w-8 h-8 rounded-lg bg-[#2e4a3e] flex items-center justify-center">
                                <Sparkles size={14} className="text-[#c6a664]" />
                            </div>
                            <span className="text-[10px] font-semibold text-[#7e8180] uppercase tracking-[4px]">
                                ZYRO Store Intelligence
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold text-[#2e4a3e] tracking-tight">
                            Executive Dashboard
                        </h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Range selector */}
                        <div className="flex items-center bg-white border border-[#e9e9e9] p-1 rounded-xl shadow-sm">
                            {Object.entries(rangeText).map(([key, label]) => (
                                <button
                                    key={key}
                                    onClick={() => setRange(key)}
                                    className={`px-4 py-2 text-[11px] font-semibold rounded-lg transition-all duration-150 cursor-pointer ${range === key
                                            ? 'bg-[#2e4a3e] text-[#c6a664] shadow-sm'
                                            : 'text-[#7e8180] hover:text-[#2e4a3e]'
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* Export button */}
                        <button
                            onClick={() => {
                                const dataToExport = exportData.map(o => ({
                                    OrderID: o._id,
                                    Date: new Date(o.createdAt).toLocaleDateString(),
                                    Customer: `${o.userId?.firstName || 'Guest'} ${o.userId?.lastName || ''}`,
                                    Email: o.userId?.email || 'N/A',
                                    Total_Value: o.amount,
                                    Status: o.status
                                }));
                                exportToCSV(dataToExport, `ZYRO_Sales_Report_${rangeText[range]}`);
                            }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-[#2e4a3e] hover:bg-[#1a2e27]
                                       text-[#c6a664] rounded-xl text-[11px] font-semibold uppercase tracking-widest
                                       transition-all duration-150 active:scale-95 shadow-sm cursor-pointer border-none"
                        >
                            <Download size={14} strokeWidth={2.5} />
                            Download Report
                        </button>
                    </div>
                </div>

                <div className="h-1 w-full bg-linear-to-r from-[#2e4a3e] via-[#c6a664] to-[#b76e79]" />

                {/* ════════════════════════════
                    KPI CARDS
                ════════════════════════════ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title="Total Revenue"
                        value={`${currency}${kpis.totalRevenue.toLocaleString()}`}
                        icon={<IndianRupee size={20} />}
                        iconBg="bg-[#c6a664]"
                        trend="+12.4%"
                        trendUp
                    />
                    <StatCard
                        title="Orders Placed"
                        value={kpis.totalOrders}
                        icon={<ShoppingBag size={20} />}
                        iconBg="bg-[#2e4a3e]"
                        trend="+8.1%"
                        trendUp
                    />
                    <StatCard
                        title="Active Users"
                        value={kpis.totalCustomers}
                        icon={<Users size={20} />}
                        iconBg="bg-[#374151]"
                        trend="+3.7%"
                        trendUp
                    />
                    <div onClick={() => navigate('/admin/list?filter=low-stock')} className="cursor-pointer">
                        <StatCard
                            title="Low Stock"
                            value={kpis.lowStockCount}
                            icon={<AlertTriangle size={20} />}
                            iconBg={kpis.lowStockCount > 0 ? 'bg-[#b76e79]' : 'bg-[#7e8180]'}
                            isAlert={kpis.lowStockCount > 0}
                            trend="Needs attention"
                        />
                    </div>
                </div>

                {/* ════════════════════════════
                    PRIMARY CHARTS
                ════════════════════════════ */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                    {/* Revenue Area Chart */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e9e9e9] p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-[#2e4a3e]/10 flex items-center justify-center">
                                    <TrendingUp size={15} className="text-[#2e4a3e]" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-[#2e4a3e]">Revenue Performance</h3>
                                    <p className="text-[10px] text-[#7e8180] font-medium uppercase tracking-wider mt-0.5">
                                        {rangeText[range]}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                                <ArrowUpRight size={12} strokeWidth={2.5} />
                                <span className="text-[10px] font-semibold">12.4%</span>
                            </div>
                        </div>
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={charts.salesTrend} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
                                    <defs>
                                        <linearGradient id="colorRevGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2e4a3e" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#2e4a3e" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="_id" tick={{ fontSize: 10, fontWeight: 500, fill: '#7e8180' }} axisLine={false} tickLine={false} dy={8} />
                                    <YAxis tick={{ fontSize: 10, fontWeight: 500, fill: '#7e8180' }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '12px', border: 'none',
                                            backgroundColor: '#2e4a3e', color: '#fff',
                                            boxShadow: '0 10px 30px rgba(46,74,62,0.3)',
                                            fontSize: '12px', fontWeight: 500
                                        }}
                                        itemStyle={{ color: '#c6a664', fontWeight: 600 }}
                                    />
                                    <Area type="monotone" dataKey="revenue" stroke="#2e4a3e" fillOpacity={1}
                                        fill="url(#colorRevGrad)" strokeWidth={2.5} dot={false}
                                        activeDot={{ r: 5, fill: '#2e4a3e', stroke: '#c6a664', strokeWidth: 2 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Pie Chart */}
                    <div className="bg-white rounded-2xl border border-[#e9e9e9] p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-center gap-2.5 mb-6">
                            <div className="w-8 h-8 rounded-lg bg-[#c6a664]/15 flex items-center justify-center">
                                <PieIcon size={15} className="text-[#c6a664]" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-[#2e4a3e]">Stock Distribution</h3>
                                <p className="text-[10px] text-[#7e8180] font-medium uppercase tracking-wider mt-0.5">
                                    By category
                                </p>
                            </div>
                        </div>
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={charts.categoryDistribution}
                                        dataKey="count"
                                        nameKey="_id"
                                        innerRadius={65}
                                        outerRadius={90}
                                        paddingAngle={5}
                                    >
                                        {charts.categoryDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '10px', border: 'none',
                                            backgroundColor: 'var(--color-gold)', color: 'var(--color-green)',
                                            fontSize: '11px'
                                        }}
                                    />
                                    <Legend
                                        verticalAlign="bottom" height={36} iconType="circle"
                                        wrapperStyle={{ fontSize: '10px', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* ════════════════════════════
                    OPERATIONAL GRID
                ════════════════════════════ */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

                    {/* Order Lifecycle Bar Chart */}
                    <div className="bg-white rounded-2xl border border-[#e9e9e9] p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-center gap-2.5 mb-6">
                            <div className="w-8 h-8 rounded-lg bg-[#2e4a3e]/10 flex items-center justify-center">
                                <BarChart3 size={15} className="text-[#2e4a3e]" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-[#2e4a3e]">Order Lifecycle</h3>
                                <p className="text-[10px] text-[#7e8180] font-medium uppercase tracking-wider mt-0.5">
                                    Status breakdown
                                </p>
                            </div>
                        </div>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={charts.orderStatusDistribution} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="_id" tick={{ fontSize: 10, fontWeight: 500, fill: '#7e8180' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10, fontWeight: 500, fill: '#7e8180' }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '10px', border: 'none',
                                            backgroundColor: '#2e4a3e', color: '#fff',
                                            fontSize: '11px'
                                        }}
                                        itemStyle={{ color: '#c6a664' }}
                                    />
                                    <Bar dataKey="count" fill="#c6a664" radius={[8, 8, 0, 0]} barSize={36} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Bestseller Leaderboard */}
                    <div className="bg-[#2e4a3e] rounded-2xl p-6 shadow-sm relative overflow-hidden">
                        {/* Decorative blobs */}
                        <div className="absolute top-0 right-0 w-40 h-40 bg-[#c6a664] opacity-[0.07] rounded-full -mr-16 -mt-16 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-28 h-28 bg-[#c6a664] opacity-[0.05] rounded-full -ml-10 -mb-10 pointer-events-none" />

                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-[#c6a664]/20 flex items-center justify-center">
                                        <ArrowUpRight size={15} className="text-[#c6a664]" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-white">Bestseller Rank</h3>
                                        <p className="text-[10px] text-[#c6a664]/70 font-medium uppercase tracking-wider mt-0.5">
                                            Top performers
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => navigate('/admin/list')}
                                    className="flex items-center gap-1 text-[10px] font-semibold text-[#c6a664] hover:text-white
                                               transition-all duration-150 uppercase tracking-widest cursor-pointer border-none bg-transparent"
                                >
                                    View all <ChevronRight size={12} strokeWidth={2.5} />
                                </button>
                            </div>

                            <div className="space-y-2.5">
                                {topProducts.map((p, i) => (
                                    <div
                                        key={p._id}
                                        className="flex items-center gap-4 p-3.5 bg-white/5 hover:bg-white/10
                                                   rounded-xl transition-all duration-150 border border-white/8 group/item"
                                    >
                                        {/* Rank + image */}
                                        <div className="relative shrink-0">
                                            <img
                                                src={p.image}
                                                className="w-12 h-12 rounded-xl object-cover border-2 border-[#c6a664]/30
                                                           group-hover/item:border-[#c6a664]/60 transition-all"
                                                alt=""
                                            />
                                            <span className="absolute -top-2 -left-2 w-6 h-6 bg-[#c6a664] text-[#2e4a3e]
                                                             rounded-lg flex items-center justify-center text-[10px] font-bold shadow-lg">
                                                {i + 1}
                                            </span>
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-white truncate leading-snug">{p.title}</p>
                                            <p className="text-[10px] font-medium text-[#c6a664]/80 mt-0.5 uppercase tracking-wider">
                                                {p.totalSold} shipped
                                            </p>
                                        </div>

                                        {/* Revenue */}
                                        <p className="text-sm font-bold text-[#c6a664] shrink-0">
                                            {currency}{p.revenue.toLocaleString()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ════════════════════════════
                    RECENT ORDERS TABLE
                ════════════════════════════ */}
                <div className="bg-white rounded-2xl border border-[#e9e9e9] shadow-sm overflow-hidden">

                    {/* Table header bar */}
                    <div className="px-6 py-4 bg-[#2e4a3e] flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-[#c6a664]/20 flex items-center justify-center">
                                <Activity size={13} className="text-[#c6a664]" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-white">Real-Time Traffic</h3>
                                <p className="text-[9px] text-[#c6a664]/70 font-medium uppercase tracking-wider mt-0.5">
                                    Latest orders
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/admin/orders')}
                            className="flex items-center gap-1 text-[10px] font-semibold text-[#c6a664]
                                       hover:text-white transition-all duration-150 uppercase tracking-widest
                                       cursor-pointer border-none bg-transparent"
                        >
                            Logistics Hub <ChevronRight size={12} strokeWidth={2.5} />
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-175">
                            <thead>
                                <tr className="text-[10px] font-semibold text-[#7e8180] uppercase tracking-widest bg-[#f9faf9] border-b border-[#e9e9e9]">
                                    <th className="px-6 py-3.5">Customer</th>
                                    <th className="px-6 py-3.5">Order ID</th>
                                    <th className="px-6 py-3.5 text-center">Value</th>
                                    <th className="px-6 py-3.5 text-center">Status</th>
                                    <th className="px-6 py-3.5 text-right">Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f9faf9]">
                                {recentOrders.map((order, idx) => (
                                    <tr
                                        key={order._id}
                                        className="group hover:bg-[#fff8f1] transition-all duration-150"
                                    >
                                        {/* Customer */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-[#2e4a3e]/10 flex items-center justify-center shrink-0">
                                                    <span className="text-xs font-bold text-[#2e4a3e]">
                                                        {(order.userId?.firstName?.[0] || 'G').toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-[#2e4a3e] leading-none">
                                                        {order.userId?.firstName || 'Guest'} {order.userId?.lastName || ''}
                                                    </p>
                                                    <p className="text-[10px] text-[#7e8180] font-medium mt-0.5">
                                                        {order.userId?.email || 'Walk-in Customer'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Order ID */}
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-[11px] font-semibold text-[#c6a664]
                                                             bg-[#2e4a3e] px-2.5 py-1.5 rounded-lg">
                                                #{order._id.slice(-10).toUpperCase()}
                                            </span>
                                        </td>

                                        {/* Value */}
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-sm font-bold text-[#2e4a3e]">
                                                {currency}{order.amount.toLocaleString()}
                                            </span>
                                        </td>

                                        {/* Status badge */}
                                        <td className="px-6 py-4 text-center">
                                            <StatusBadge status={order.status} />
                                        </td>

                                        {/* Time */}
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-[11px] font-medium text-[#7e8180]">
                                                {new Date(order.createdAt).toLocaleTimeString([], {
                                                    hour: '2-digit', minute: '2-digit', hour12: true
                                                })}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>{/* /container */}
        </div>
    );
};

/* ── Stat Card ── */
const StatCard = ({ title, value, icon, iconBg, trend, trendUp, isAlert }) => (
    <div className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all duration-200 group
                    ${isAlert ? 'border-[#b76e79]/40 hover:border-[#b76e79]/60' : 'border-[#e9e9e9] hover:border-[#c6a664]/40'}`}>
        <div className="flex items-start justify-between mb-4">
            <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center text-white
                            group-hover:scale-105 transition-transform duration-200 shadow-sm`}>
                {icon}
            </div>
            {trend && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isAlert
                        ? 'bg-[#b76e79]/10 text-[#b76e79]'
                        : trendUp
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-[#fff8f1] text-[#b0955e]'
                    }`}>
                    {trend}
                </span>
            )}
        </div>
        <p className="text-[10px] font-semibold text-[#7e8180] uppercase tracking-widest mb-1.5">{title}</p>
        <p className="text-2xl font-bold text-[#2e4a3e] tracking-tight">{value}</p>
    </div>
);

/* ── Status Badge ── */
const StatusBadge = ({ status }) => {
    const config = {
        'Delivered': 'bg-emerald-50 text-emerald-700 border-emerald-200',
        'Cancelled': 'bg-red-50 text-red-700 border-red-200',
        'Shipped': 'bg-purple-50 text-purple-700 border-purple-200',
        'Out for delivery': 'bg-orange-50 text-orange-700 border-orange-200',
        'Packing': 'bg-amber-50 text-amber-700 border-amber-200',
        'Order Placed': 'bg-blue-50 text-blue-700 border-blue-200',
    };
    const cls = config[status] || 'bg-[#f9faf9] text-[#374151] border-[#e9e9e9]';
    return (
        <span className={`inline-flex items-center gap-1.5 text-[9px] font-semibold uppercase
                         tracking-widest px-2.5 py-1 rounded-lg border ${cls}`}>
            {status}
        </span>
    );
};

export default AdminDashboard;