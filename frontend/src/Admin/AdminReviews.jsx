import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { ShopContext } from '../config/ShopContext';
import { toast } from 'react-toastify';
import { Star, Trash2 } from 'lucide-react';

const AdminReviews = () => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterRating, setFilterRating] = useState('All');
    const [searchName, setSearchName] = useState('');
    const [featuredFilter, setFeaturedFilter] = useState('All');
    const { backendUrl } = useContext(ShopContext);

    const fetchReviews = async () => {
        try {
            const { data } = await axios.get(`${backendUrl}/api/review/all`, {
                withCredentials: true
            });
            if (data.success) setReviews(data.reviews);
        } catch {
            toast.error("Failed to load reviews");
        } finally {
            setLoading(false);
        }
    };

    const deleteReview = async (reviewId) => {
        if (!window.confirm("Delete this review?")) return;
        try {
            const { data } = await axios.delete(`${backendUrl}/api/review/${reviewId}`, {
                withCredentials: true
            });
            if (data.success) {
                setReviews(prev => prev.filter(r => r._id !== reviewId));
                toast.success("Review deleted");
            }
        } catch {
            toast.error("Failed to delete review");
        }
    };

    const toggleFeatured = async (reviewId, currentFeatured) => {
        try {
            const { data } = await axios.patch(
                `${backendUrl}/api/review/feature/${reviewId}`,
                {},
                { withCredentials: true }
            );
            if (data.success) {
                setReviews(prev => prev.map(r =>
                    r._id === reviewId ? { ...r, featured: !currentFeatured } : r
                ));
                toast.success(data.message);
            }
        } catch {
            toast.error("Failed to update review");
        }
    };

    useEffect(() => { fetchReviews(); }, []);

    const renderStars = (count) => (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} size={12}
                    className={s <= count ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />
            ))}
        </div>
    );

    const filtered = reviews.filter(r => {
        const matchRating = filterRating === 'All' || r.rating === Number(filterRating);
        const name = `${r.userId?.firstName || ''} ${r.userId?.lastName || ''}`.toLowerCase();
        const matchName = searchName === '' ||
            name.includes(searchName.toLowerCase()) ||
            r.productId?.title?.toLowerCase().includes(searchName.toLowerCase());
        const matchFeatured =
            featuredFilter === 'All' ? true :
                featuredFilter === 'Featured' ? r.featured : !r.featured;
        return matchRating && matchName && matchFeatured;
    });

    const avgRating = reviews.length
        ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
        : 0;

    const ratingCounts = [5, 4, 3, 2, 1].map(star => ({
        star,
        count: reviews.filter(r => r.rating === star).length,
        pct: reviews.length
            ? Math.round(reviews.filter(r => r.rating === star).length / reviews.length * 100)
            : 0
    }));

    return (
        <div className="min-h-screen bg-[#f9faf9]">
            <div className="max-w-6xl mx-auto pb-24">

                {/* ── Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-[#e9e9e9]">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-[#2e4a3e] flex items-center justify-center shadow-sm shrink-0">
                            <Star size={19} className="text-[#c6a664]" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold text-[#2e4a3e] tracking-tight leading-tight">
                                Review Management
                            </h1>
                            <p className="text-xs text-[#7e8180] mt-0.5">
                                {reviews.length} total · {reviews.filter(r => r.featured).length} featured on homepage
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Stats Row ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">

                    {/* Average Rating */}
                    <div className="bg-white rounded-2xl border border-[#e9e9e9] p-6 flex items-center gap-6">
                        <div className="text-center shrink-0">
                            <p className="text-5xl font-black text-[#2e4a3e]">{avgRating}</p>
                            <div className="flex justify-center mt-1">{renderStars(Math.round(avgRating))}</div>
                            <p className="text-[10px] text-[#7e8180] mt-1 uppercase tracking-widest">{reviews.length} reviews</p>
                        </div>
                        <div className="flex-1 space-y-1.5">
                            {ratingCounts.map(({ star, count, pct }) => (
                                <div key={star} className="flex items-center gap-2">
                                    <span className="text-[10px] text-[#7e8180] w-3 shrink-0">{star}</span>
                                    <Star size={9} className="text-yellow-400 fill-yellow-400 shrink-0" />
                                    <div className="flex-1 h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
                                        <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="text-[10px] text-[#7e8180] w-6 text-right shrink-0">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { label: "5 Star", value: ratingCounts[0].count, color: "text-emerald-600", bg: "bg-emerald-50" },
                            { label: "4 Star", value: ratingCounts[1].count, color: "text-blue-600", bg: "bg-blue-50" },
                            { label: "3★ & below", value: ratingCounts[2].count + ratingCounts[3].count + ratingCounts[4].count, color: "text-amber-600", bg: "bg-amber-50" },
                            { label: "With Photos", value: reviews.filter(r => r.image).length, color: "text-purple-600", bg: "bg-purple-50" },
                        ].map((s, i) => (
                            <div key={i} className={`${s.bg} rounded-2xl p-4 flex flex-col justify-between border border-white`}>
                                <p className="text-[10px] font-bold text-[#7e8180] uppercase tracking-widest">{s.label}</p>
                                <p className={`text-3xl font-black ${s.color} mt-2`}>{s.value}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Featured Filter Tabs ── */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    {['All', 'Featured', 'Not Featured'].map(tab => (
                        <button key={tab}
                            onClick={() => setFeaturedFilter(tab)}
                            className={`px-4 py-2 text-[11px] font-bold rounded-xl border transition-all cursor-pointer uppercase tracking-widest
                ${featuredFilter === tab
                                    ? 'bg-[#2e4a3e] text-[#c6a664] border-[#2e4a3e]'
                                    : 'bg-white text-[#7e8180] border-[#e9e9e9] hover:border-[#2e4a3e]'
                                }`}>
                            {tab === 'Featured' ? '★ ' : ''}{tab}
                        </button>
                    ))}
                    <span className="ml-auto text-[11px] text-[#7e8180]">
                        {reviews.filter(r => r.featured).length} / {reviews.length} featured on homepage
                    </span>
                </div>

                {/* ── Search + Rating Filter ── */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <input
                        type="text"
                        placeholder="Search by customer or product..."
                        value={searchName}
                        onChange={e => setSearchName(e.target.value)}
                        className="flex-1 pl-4 pr-4 py-2.5 border border-[#e9e9e9] bg-white rounded-xl text-sm text-[#374151] outline-none focus:border-[#2e4a3e] transition-all"
                    />
                    <select
                        onChange={e => setFilterRating(e.target.value)}
                        className="appearance-none px-4 py-2.5 border border-[#e9e9e9] bg-white rounded-xl text-sm text-[#374151] outline-none cursor-pointer focus:border-[#2e4a3e] transition-all"
                    >
                        <option value="All">All Ratings</option>
                        {[5, 4, 3, 2, 1].map(s => <option key={s} value={s}>{s} Star</option>)}
                    </select>
                </div>

                {/* ── Reviews List ── */}
                {loading ? (
                    <div className="flex items-center justify-center py-32">
                        <div className="w-8 h-8 border-2 border-t-[#2e4a3e] border-gray-200 rounded-full animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <Star size={36} className="text-[#e9e9e9] mb-4" />
                        <p className="text-base font-bold text-[#374151]">No reviews found</p>
                        <p className="text-sm text-[#7e8180] mt-1">Try adjusting your filters</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {filtered.map((review) => (
                            <div key={review._id}
                                className={`bg-white border rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-200
                  ${review.featured
                                        ? 'border-[#c6a664]/50 shadow-sm shadow-[#c6a664]/10'  // ✅ gold border when featured
                                        : 'border-[#e9e9e9] hover:border-[#c6a664]/40'
                                    }`}>

                                {/* Color strip */}
                                <div className={`h-0.75 w-full ${review.rating === 5 ? 'bg-emerald-400' :
                                        review.rating === 4 ? 'bg-blue-400' :
                                            review.rating === 3 ? 'bg-amber-400' : 'bg-red-400'
                                    }`} />

                                {/* ✅ Featured banner */}
                                {review.featured && (
                                    <div className="flex items-center gap-2 px-5 py-2 bg-amber-50 border-b border-amber-100">
                                        <span className="text-amber-500 text-xs">★</span>
                                        <p className="text-[11px] font-bold text-amber-700 uppercase tracking-widest">
                                            Featured on Homepage
                                        </p>
                                    </div>
                                )}

                                <div className="p-5 grid grid-cols-1 lg:grid-cols-[200px_1fr_140px] gap-5 items-start">

                                    {/* ── Left: Customer info ── */}
                                    <div className="flex lg:flex-col gap-3 lg:gap-4 lg:border-r border-[#e9e9e9] lg:pr-5">
                                        <div className="w-10 h-10 rounded-xl bg-[#f0f5f3] flex items-center justify-center shrink-0">
                                            <span className="text-lg font-bold text-[#2e4a3e]">
                                                {review.userId?.firstName?.[0] || '?'}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-[#374151]">
                                                {review.userId?.firstName} {review.userId?.lastName}
                                            </p>
                                            <p className="text-[10px] text-[#7e8180] mt-0.5">{review.userId?.email}</p>
                                            <div className="mt-2 flex items-center gap-1.5">
                                                {renderStars(review.rating)}
                                                <span className="text-xs font-bold text-[#2e4a3e]">{review.rating}/5</span>
                                            </div>
                                            <p className="text-[10px] text-[#7e8180] mt-1.5">
                                                {new Date(review.createdAt).toLocaleDateString('en-IN', {
                                                    day: 'numeric', month: 'short', year: 'numeric'
                                                })}
                                            </p>
                                            <span className="inline-flex items-center gap-1 mt-2 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                ✓ Verified Purchase
                                            </span>
                                        </div>
                                    </div>

                                    {/* ── Center: Review content ── */}
                                    <div className="space-y-3">
                                        {review.productId && (
                                            <div className="flex items-center gap-2 bg-[#f9faf9] rounded-xl px-3 py-2 w-fit">
                                                {review.productId.thumbnail && (
                                                    <img src={review.productId.thumbnail}
                                                        className="w-7 h-7 rounded-lg object-cover" alt="" />
                                                )}
                                                <p className="text-xs font-semibold text-[#374151]">{review.productId.title}</p>
                                            </div>
                                        )}
                                        <p className="text-sm text-[#374151] leading-relaxed">"{review.review}"</p>
                                        {review.image && (
                                            <img src={review.image} alt="Review"
                                                className="w-24 h-24 object-cover rounded-xl border border-[#e9e9e9] cursor-pointer hover:scale-105 transition-transform"
                                                onClick={() => window.open(review.image, '_blank')}
                                            />
                                        )}
                                    </div>

                                    {/* ── Right: Actions ── */}
                                    <div className="flex lg:flex-col items-stretch gap-2 lg:border-l border-[#e9e9e9] lg:pl-5">

                                        {/* ✅ Feature toggle */}
                                        <button
                                            onClick={() => toggleFeatured(review._id, review.featured)}
                                            className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold border rounded-xl transition-all cursor-pointer
                        ${review.featured
                                                    ? 'bg-[#2e4a3e] text-[#c6a664] border-[#2e4a3e]'
                                                    : 'text-[#2e4a3e] border-[#2e4a3e]/30 hover:bg-[#2e4a3e] hover:text-[#c6a664]'
                                                }`}>
                                            {review.featured ? '★ Featured' : '☆ Feature'}
                                        </button>

                                        {/* Delete */}
                                        <button
                                            onClick={() => deleteReview(review._id)}
                                            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 border border-red-100 rounded-xl hover:bg-red-600 hover:text-white transition-all cursor-pointer">
                                            <Trash2 size={12} /> Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminReviews;