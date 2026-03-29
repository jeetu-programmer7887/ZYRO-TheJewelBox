import React, { useContext, useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ShopContext } from '../../config/ShopContext';
import Swal from 'sweetalert2';
import {
    ShieldCheck, Gem, Truck, Star, Heart, Share2,
    Eye, X, ChevronLeft, ChevronRight, Sparkles
} from 'lucide-react';
import axios from 'axios';

export const Product = () => {
    const { productId } = useParams();
    const { allProducts, currency, addToCart, user, addToWishlist, wishlist, backendUrl } = useContext(ShopContext);
    const [productData, setProductData] = useState(null);
    const [mainImage, setMainImage] = useState('');
    const [activeTab, setActiveTab] = useState('description');
    const [currentSlide, setCurrentSlide] = useState(0);
    const scrollRef = useRef(null);
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);
    const navigate = useNavigate();

    const handleWishlistClick = (_id) => {
        addToWishlist(_id);
    };

    const isWishlisted = useMemo(() => {
        return wishlist?.includes(productData?._id);
    }, [wishlist, productData]);

    // Integrated Share Logic
    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: productData.title,
                url: window.location.href,
            }).catch(() => console.log('Error sharing'));
        } else {
            navigator.clipboard.writeText(window.location.href);
            Swal.fire({
                toast: true,
                position: 'bottom-end',
                icon: 'success',
                title: 'Link copied to clipboard',
                showConfirmButton: false,
                timer: 1500
            });
        }
    };

    const handleAddToCart = (_id) => {
        if (!user.isLoggedIn) {
            Swal.fire({
                title: 'Login Required',
                text: `Please "log in" to add items to your cart!`,
                icon: 'info',
                showCancelButton: true,
                confirmButtonColor: '#2e4a3e',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Go to Login',
                cancelButtonText: 'Maybe Later',
                scrollbarPadding: false
            }).then((result) => {
                if (result.isConfirmed) {
                    navigate("/login", {
                        state: { redirectTo: "/cart" }
                    });
                }
            });
            return;
        }

        addToCart(_id);

        Swal.fire({
            icon: 'success',
            title: 'Added to cart',
            toast: true,
            position: 'bottom-end',
            background: '#2e4a3e',
            color: '#ffffff',
            iconColor: '#ffffff',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true,
            didOpen: (toast) => {
                const progressBar = toast.querySelector('.swal2-timer-progress-bar');
                if (progressBar) {
                    progressBar.style.backgroundColor = '#c6a664';
                }
            }
        });

        navigate('/cart');
    }

    const downloadImage = async (url) => {
        const btn = document.getElementById('zyro-download-btn');

        btn.disabled = true;
        btn.innerHTML = '⏳ Fetching image...';
        btn.style.background = '#b0955e';
        btn.style.opacity = '0.8';
        btn.style.cursor = 'not-allowed';

        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error('Fetch failed');

            btn.innerHTML = '📦 Downloading...';

            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = 'zyro-jewellery.jpg';
            a.click();
            URL.revokeObjectURL(blobUrl);

            btn.innerHTML = '✅ Downloaded!';
            btn.style.background = 'var(--color-gold)';
            btn.style.opacity = '1';

        } catch {
            btn.innerHTML = '❌ Failed — Tap to retry';
            btn.style.background = '#b76e79';
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            btn.disabled = false;
            btn.onclick = () => downloadImage(url);
        }
    };

    const handleTryOnRedirect = async () => {
        const productImage = mainImage || productData?.images?.[0];

        if (!productImage) {
            Swal.fire({
                title: 'Oops!',
                text: 'Product image is not available. Please try again later.',
                icon: 'error',
                confirmButtonColor: '#2e4a3e',
            });
            return;
        }

        const prompt = `I am uploading two images:\n1. The jewellery product image\n2. My photo\n\nGenerate a realistic image of me wearing that exact jewellery. Keep the focus on my face and make sure the face consistency is maintained well. Do not change anything else about my appearance, outfit but you can change the suitable background if required.`;

        try {
            await navigator.clipboard.writeText(prompt);

            Swal.fire({
                title: '✨ AI Try-On Ready!',
                html: `
                <p style="font-size: 0.9rem; color: #374151; line-height: 1.8;">
                    Your try-on prompt has been copied!<br/><br/>
                    <strong style="color: #2e4a3e;">Steps to follow:</strong><br/>
                    1️⃣ Download the jewellery image below<br/>
                    2️⃣ Click <strong style="color: #2e4a3e;">"Open AI Studio"</strong> &amp; paste the prompt
                        <kbd style="background:#e9e9e9; color:#2e4a3e; padding:1px 6px; border-radius:4px; font-size:0.8rem;">Ctrl+V</kbd><br/>
                    3️⃣ Upload the downloaded image + your photo together<br/>
                    4️⃣ Hit send &amp; see yourself in the jewellery! 💍
                </p>
                <button
                    id="zyro-download-btn"
                    style="margin-top:14px; padding: 11px 24px;
                    background: #c6a664; color: #2e4a3e; border-radius:10px; border: 2px solid #2e4a3e;
                    font-size:0.85rem; font-weight:700; cursor:pointer; width:100%;
                    letter-spacing: 0.05em; transition: all 0.3s ease;">
                    ⬇️ Download Jewellery Image
                </button>
            `,
                background: '#fff8f1',
                color: '#374151',
                iconColor: '#c6a664',
                confirmButtonColor: '#2e4a3e',
                confirmButtonText: '🚀 Open AI Studio',
                showCancelButton: true,
                cancelButtonText: 'Cancel',
                cancelButtonColor: 'var(--color-slateGray)',
                scrollbarPadding: false,
                didOpen: () => {
                    const btn = document.getElementById('zyro-download-btn');
                    if (btn) btn.addEventListener('click', () => downloadImage(productImage));
                },
            }).then((result) => {
                if (result.isConfirmed) {
                    window.open("https://gemini.google.com/app", "_blank");
                }
            });

        } catch (err) {
            Swal.fire({
                title: 'Copy This Prompt',
                input: 'textarea',
                inputValue: prompt,
                inputAttributes: { rows: 6, readonly: true },
                text: 'Auto-copy failed. Please copy the prompt manually, then open AI Studio.',
                background: '#fff8f1',
                color: '#374151',
                confirmButtonColor: '#2e4a3e',
                confirmButtonText: '🚀 Open AI Studio',
            }).then((result) => {
                if (result.isConfirmed) {
                    window.open("https://gemini.google.com/app", "_blank");
                }
            });
        }
    };

    useEffect(() => {
        const fetchProductData = async () => {
            try {
                // Using the specific 'details' endpoint with the productId from useParams()
                const response = await axios.get(`${backendUrl}/api/products/details/${productId}`);

                if (response.data.success) {
                    const product = response.data.product;
                    setProductData(product);

                    // Set the initial main image if images exist
                    if (product.images && product.images.length > 0) {
                        setMainImage(product.images[0]);
                    }
                }
            } catch (error) {
                console.error("Error fetching product details:", error);
            }
        };

        if (productId) {
            fetchProductData();
        }
    }, [productId, backendUrl]);

    const handleScroll = () => {
        if (scrollRef.current) {
            const width = scrollRef.current.offsetWidth;
            const index = Math.round(scrollRef.current.scrollLeft / width);
            setCurrentSlide(index);
        }
    };

    const openViewer = (index) => {
        setViewerIndex(index);
        setIsViewerOpen(true);
        document.body.style.overflow = 'hidden';
    };

    if (!productData) return <>
        <div className="bg-(--color-green)/1 lg:pb-20 lg:pt-10 mt-20 lg:mt-20 pt-5 px-4 pb-20 md:px-10 lg:px-15">
            <style>
                {`
                @keyframes infinity-flow {
                    0% { stroke-dashoffset: 440; }
                    100% { stroke-dashoffset: 0; }
                }
                .animate-infinity {
                    animation: infinity-flow 2.5s linear infinite;
                }
                `}
            </style>
            <div className="flex flex-col items-center justify-center min-h-[45vh] space-y-6">
                <div className="relative">
                    <svg width="120" height="60" viewBox="0 0 100 50" className="text-(--color-green)">
                        {/* Background Track */}
                        <path
                            d="M25,45 C5,45 5,5 25,5 C45,5 55,45 75,45 C95,45 95,5 75,5 C55,5 45,45 25,45 Z"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="4"
                            strokeOpacity="0.1"
                        />
                        {/* Animated Path */}
                        <path
                            d="M25,45 C5,45 5,5 25,5 C45,5 55,45 75,45 C95,45 95,5 75,5 C55,5 45,45 25,45 Z"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray="110 330"
                            className="animate-infinity"
                        />
                    </svg>
                </div>
                <p className="text-sm font-semibold tracking-[0.3em] text-(--color-green) animate-pulse uppercase">
                    Loading Product Details...
                </p>
            </div>

        </div>;
    </>
    const discountPercentage = productData.comparePrice
        ? Math.round(((productData.comparePrice - productData.price) / productData.comparePrice) * 100)
        : 0;

    return (
        <div className="bg-white min-h-screen">
            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes pulse-soft {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.8; }
                }
                .animate-pulse-soft { animation: pulse-soft 2s infinite; }
            `}</style>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-10 mt-10">
                <div className="flex flex-col lg:flex-row gap-8">

                    {/* --- LEFT: Image Gallery --- */}
                    <div className="w-full lg:w-1/2 flex flex-col gap-4">
                        <div className="block sm:hidden relative">
                            <div ref={scrollRef} onScroll={handleScroll} className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar rounded-lg">
                                {productData.images.map((img, idx) => (
                                    <div key={idx} className="min-w-full snap-center aspect-square" onClick={() => openViewer(idx)}>
                                        <img src={img} alt="" className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-center gap-2 mt-4">
                                {productData.images.map((_, idx) => (
                                    <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${currentSlide === idx ? 'bg-zinc-800 w-6' : 'bg-gray-300 w-1.5'}`} />
                                ))}
                            </div>
                        </div>

                        <div className="hidden sm:flex flex-col gap-4">
                            <div className="relative group w-full max-h-130 overflow-hidden rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                                <img src={mainImage} alt={productData.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-end justify-center pb-12">
                                    <div className="flex gap-4 translate-y-10 group-hover:translate-y-0 transition-transform duration-500">
                                        <button
                                            onClick={() => handleWishlistClick(productData._id)}
                                            className={`cursor-pointer p-4 rounded-full shadow-xl transition-all hover:bg-(--color-green) ${isWishlisted ? 'bg-red-50 text-red-500' : 'bg-white text-gray-900 hover:bg-(--color-green) hover:text-white'
                                                }`}
                                        >
                                            <Heart size={20} fill={isWishlisted ? "currentColor" : "none"} />
                                        </button>
                                        <button onClick={handleShare} className="cursor-pointer p-4 bg-white rounded-full shadow-xl hover:bg-(--color-green) hover:text-white transition-all hover:scale-110">
                                            <Share2 size={20} />
                                        </button>
                                        <button onClick={() => openViewer(productData.images.indexOf(mainImage))} className="cursor-pointer p-4 bg-white rounded-full shadow-xl hover:bg-(--color-green) hover:text-white transition-all hover:scale-110">
                                            <Eye size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-center gap-3 py-2">
                                {productData.images.map((img, idx) => (
                                    <div key={idx} onClick={() => setMainImage(img)} className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all w-20 h-20 shrink-0 ${mainImage === img ? 'border-zinc-900 shadow-md' : 'border-transparent bg-gray-50'}`}>
                                        <img src={img} alt="thumbnail" className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* --- RIGHT: Information Section --- */}
                    <div className="w-full lg:w-1/2 flex flex-col">
                        <div className="mb-4">
                            <h1 className="text-xl sm:text-4xl font-semibold text-gray-900 mb-4">{productData.title}</h1>
                            <div className="flex items-center gap-3">
                                <div className="flex text-amber-400">
                                    <Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} />
                                </div>
                                <span className="text-sm text-gray-400 font-medium">4.0 (122 Reviews)</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 mb-8">
                            <span className="text-2xl sm:text-4xl font-bold text-gray-900">{currency}{productData.price}</span>
                            {productData.comparePrice > productData.price && (
                                <>
                                    <span className="text-lg text-gray-400 line-through font-light">{currency} {productData.comparePrice}</span>
                                    <span className="bg-(--color-gold) text-(--color-green) border border-(--color-green) px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest animate-pulse-soft">
                                        {discountPercentage}% OFF
                                    </span>
                                </>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-10">
                            <HighlightItem icon={<Gem size={20} className="text-amber-700" />} label="Material" value={productData.material} />
                            <HighlightItem icon={<ShieldCheck size={20} className="text-amber-700" />} label="Quality" value="Anti-Tarnish" />
                        </div>

                        <div>
                            {FomoStock(productData.variants.reduce((acc, variant) => acc + variant.stock, 0))}
                        </div>

                        {/* Integrated Actions Section */}
                        <div className="flex flex-col gap-4">
                            <button
                                onClick={() => handleAddToCart(productData._id)}
                                disabled={productData.variants.reduce((acc, variant) => acc + variant.stock, 0) === 0}
                                className={`w-full py-5 rounded-2xl font-bold uppercase tracking-widest transition-all shadow-lg ease-in-out duration-300 ${productData.variants.reduce((acc, variant) => acc + variant.stock, 0) === 0
                                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                    : "bg-(--color-green) hover:bg-(--color-gold) hover:brightness-110 active:scale-[0.98] text-white cursor-pointer"
                                    }`}
                            >
                                {productData.variants.reduce((acc, variant) => acc + variant.stock, 0) === 0 ? "Out of Stock" : "Add to Bag"}
                            </button>
                            <button
                                onClick={handleTryOnRedirect}
                                className="w-full cursor-pointer py-4 bg-white border-2 border-(--color-green) text-(--color-green) rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 hover:bg-(--color-green) hover:text-(--color-gold) active:scale-[0.98] shadow-sm"
                            >
                                <Sparkles size={20} className="animate-pulse" />
                                Try On with GEMINI AI
                            </button>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => handleWishlistClick(productData._id)}
                                    className={`cursor-pointer flex-1 border-2 py-4 rounded-2xl font-bold uppercase tracking-widest transition-all active:scale-[0.98]  ease-in-out duration-400 flex items-center justify-center gap-2 ${isWishlisted
                                        ? 'border-red-200 bg-red-50 text-red-500'
                                        : 'border-(--color-green) text-zinc-900 hover:bg-(--color-gold) hover:text-white'
                                        }`}
                                >
                                    <Heart size={18} fill={isWishlisted ? "currentColor" : "none"} />
                                    {isWishlisted ? 'Wishlisted' : 'Wishlist'}
                                </button>
                                <button onClick={handleShare}
                                    className="cursor-pointer flex-1 border-2 border-(--color-green) text-zinc-900 py-4 rounded-2xl font-bold 
                                    uppercase tracking-widest hover:bg-(--color-gold) hover:text-white transition-all active:scale-[0.98]  ease-in-out duration-400 flex items-center justify-center gap-2">
                                    <Share2 size={18} /> Share
                                </button>
                            </div>
                        </div>

                        <div className="mt-6 space-y-4 bg-gray-50 rounded-2xl p-6 border border-gray-100">
                            <DeliveryItem icon={<Truck size={20} />} title="Fast Delivery" desc="Ships within 48 hours." />
                            <DeliveryItem icon={<ShieldCheck size={20} />} title="Warranty" desc="Lifetime Plating Warranty." />
                        </div>
                    </div>
                </div>

                {/* --- Tabs Section --- */}
                <div className="mt-12 border-t border-gray-100 pt-10">
                    <div className="flex gap-8 mb-8 border-b border-gray-200 overflow-x-auto no-scrollbar">
                        {['description', 'care & maintenance', 'shipping & return'].map((tab) => (
                            <button key={tab} onClick={() => setActiveTab(tab)} className={`cursor-pointer pb-4 text-xs font-bold uppercase tracking-widest relative ${activeTab === tab ? 'text-zinc-900' : 'text-gray-400'}`}>
                                {tab}
                                {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-zinc-900" />}
                            </button>
                        ))}
                    </div>
                    <div className="min-h-40 text-gray-600 text-sm leading-relaxed">
                        {activeTab === 'description' && <p>{productData.description}</p>}
                        {activeTab === 'care & maintenance' && (
                            <div className="animate-fadeIn space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-900">Handling Tips</h4>
                                        <ul className="space-y-3 text-sm text-gray-600 leading-relaxed">
                                            <li className="flex gap-3">
                                                <span className="text-zinc-400">•</span>
                                                Store in original packaging or a soft pouch to avoid scratches.
                                            </li>
                                            <li className="flex gap-3">
                                                <span className="text-zinc-400">•</span>
                                                Avoid contact with water, perfume, hairspray, and lotions.
                                            </li>
                                            <li className="flex gap-3">
                                                <span className="text-zinc-400">•</span>
                                                Remove before swimming, washing hands, or intense exercise.
                                            </li>
                                            <li className="flex gap-3">
                                                <span className="text-zinc-400">•</span>
                                                Avoid hard contact against objects that can chip gemstones.
                                            </li>
                                        </ul>
                                    </div>

                                    <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100">
                                        <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-900 mb-3">Our Promise</h4>
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            ZYRO jewellery is crafted for occasional elegance. Should your plating fade over time,
                                            we offer <span className="font-bold text-zinc-700">complimentary re-plating</span>.
                                        </p>
                                        <div className="mt-4 pt-4 border-t border-stone-200">
                                            <p className="text-[11px] text-gray-400 uppercase font-medium">Warranty Note</p>
                                            <p className="text-[11px] text-gray-500 mt-1">
                                                Free re-plating within warranty. Shipping to ZYRO office is covered by the customer,
                                                return shipping is on us.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'shipping & return' && (
                            <div className="animate-fadeIn">
                                <p className="text-sm sm:text-base lg:text-md text-gray-600 leading-relaxed">
                                    ZYRO’s top priority is to ensure customer satisfaction.
                                    You may request a return within 48 hours of receiving your order.
                                    An unboxing video is mandatory for return claims (for full guidelines, please refer to our Return Policy)
                                    and must clearly show the sealed package, the complete unboxing process, and the issue. Product(s) can
                                    be returned within 48 hours only if the jewellery piece is clearly shown as missing or defective in the unboxing video.
                                    Product(s) cannot be returned under any other circumstances. Please note that refunds are not provided; eligible orders
                                    will receive a replacement product.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- FULLSCREEN IMAGE VIEWER --- */}
            {isViewerOpen && (
                <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center animate-fadeIn">
                    <div className="relative w-full h-full flex items-center justify-center p-4">
                        <img
                            src={productData.images[viewerIndex]}
                            alt="Product Image"
                            className="max-w-full max-h-[75vh] object-contain select-none"
                        />
                    </div>
                    <div className="absolute bottom-8 flex items-center gap-6">
                        <button onClick={() => setViewerIndex(prev => prev === 0 ? productData.images.length - 1 : prev - 1)} className="cursor-pointer w-14 h-14 bg-(--color-green) rounded-full flex items-center justify-center shadow-md text-white hover:bg-(--color-gold) transition"><ChevronLeft size={24} /></button>
                        <button onClick={() => { setIsViewerOpen(false); document.body.style.overflow = 'unset'; }} className="cursor-pointer w-14 h-14 bg-(--color-green) rounded-full flex items-center justify-center shadow-md text-white hover:bg-(--color-gold) transition"><X size={24} /></button>
                        <button onClick={() => setViewerIndex(prev => prev === productData.images.length - 1 ? 0 : prev + 1)} className="cursor-pointer w-14 h-14 bg-(--color-green) rounded-full flex items-center justify-center shadow-md text-white hover:bg-(--color-gold) transition"><ChevronRight size={24} /></button>
                    </div>
                </div>
            )}
        </div>
    );
};

const HighlightItem = ({ icon, label, value }) => (
    <div className="p-4 rounded-2xl bg-green-50 border border-stone-200 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-4">
        <div className="p-2 bg-white rounded-lg border border-stone-200">
            {icon}
        </div>
        <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                {label}
            </p>
            <p className="text-sm font-semibold text-gray-800">
                {value}
            </p>
        </div>
    </div>
);

const DeliveryItem = ({ icon, title, desc }) => (
    <div className="flex items-start gap-4">
        <div className="text-zinc-900 mt-0.5">{icon}</div>
        <div>
            <p className="text-sm font-semibold mb-1">{title}</p>
            <p className="text-xs text-gray-500">{desc}</p>
        </div>
    </div>
);

const FomoStock = (count) => {
    if (!count && count !== 0) return null;

    const isOutOfStock = count === 0;

    const MAX_STOCK_FOR_BAR = 20;
    const percentage = Math.min((count / MAX_STOCK_FOR_BAR) * 100, 100);

    // ── Urgency tiers mapped to project colour tokens ──────────────────────
    // Critical  (≤3)  → gold accent text  +  gold bar  (mirrors the "% OFF" badge)
    // Warning   (≤8)  → zinc-900 text     +  green bar (muted urgency)
    // Healthy   (9+)  → green-700 text    +  green bar
    const barStyle =
        count <= 3 ? 'bg-(--color-gold)' :
            count <= 8 ? 'bg-(--color-green)' :
                'bg-(--color-green)';

    const textStyle =
        count <= 3 ? 'text-amber-700' :
            count <= 8 ? 'text-zinc-900' :
                'text-zinc-900';

    const dotPing =
        count <= 3 ? 'bg-amber-400' :
            count <= 8 ? 'bg-(--color-green)' :
                'bg-(--color-green)';

    const dotSolid =
        count <= 3 ? 'bg-amber-600' :
            'bg-(--color-green)';

    const urgencyLabel =
        count <= 3 ? '🔥 Almost gone!' :
            count <= 8 ? '⚡ Selling fast' :
                '🟢 In stock';

    return (
        <div className="mb-6 animate-fadeIn">
            {isOutOfStock ? (
                /* ── Out of stock — mirrors DeliveryItem / muted stone palette ── */
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border border-stone-200">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-500 shrink-0" />
                    <span className="text-gray-600 font-bold text-xs uppercase tracking-widest">
                        Out of Stock
                    </span>
                </div>
            ) : (
                /* ── In stock — mirrors HighlightItem card aesthetic ─────────── */
                <div className="p-4 rounded-2xl bg-green-50 border border-stone-200 shadow-sm">

                    {/* Top row: pulsing dot + count label + urgency badge */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            {/* Pulsing live dot */}
                            <span className="relative flex h-2.5 w-2.5 shrink-0">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${dotPing}`} />
                                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${dotSolid}`} />
                            </span>
                            <span className="text-gray-800 font-medium text-sm sm:text-base">
                                Only{' '}
                                <span className={`font-bold ${textStyle}`}>{count}</span>
                                {' '}left in stock
                            </span>
                        </div>

                        {/* Urgency badge — mirrors the "% OFF" pill styling */}
                        <span className="bg-(--color-gold) text-(--color-green) border border-(--color-green) px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest animate-pulse-soft">
                            {urgencyLabel}
                        </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-white h-2 rounded-full overflow-hidden border border-stone-200">
                        <div
                            className={`${barStyle} h-full rounded-full transition-all duration-1000 ease-out`}
                            style={{ width: `${percentage}%` }}
                        />
                    </div>

                    {/* Sub-label for critical stock */}
                    {count <= 3 && (
                        <p className="text-[11px] text-amber-700 font-medium mt-2">
                            Order soon — this item is about to sell out.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};