import React, { useContext, useState, useEffect } from 'react';
import { ShopContext } from '../config/ShopContext.jsx';
import WishlistCard from '../Components/WishlistCard';
import { Link } from 'react-router-dom';

const Wishlist = () => {
    const { wishlist, allProducts } = useContext(ShopContext);
    const [loading, setLoading] = useState(true);

    // Logic to wait for data before deciding to show the list or empty state
    useEffect(() => {
        if (allProducts && allProducts.length >= 0 && wishlist) {
            const timer = setTimeout(() => setLoading(false), 800); // Slight delay for smooth transition
            return () => clearTimeout(timer);
        }
    }, [allProducts, wishlist]);

    const wishlistItems = wishlist
        .map(id => allProducts.find(product => product._id === id))
        .filter(Boolean)
        .slice()
        .reverse();

    useEffect(() => {
        console.log("Items : ", wishlistItems)
    })

    return (
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

           <h1 className="text-2xl lg:text-4xl text-(--color-green) mb-8 other">My Wishlist</h1>

            {loading ? (
                /* --- INFINITY LOADER --- */
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
                        Loading Favorites
                    </p>
                </div>
            ) : wishlistItems.length > 0 ? (
                /* --- GRID VIEW --- */
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">
                    {wishlistItems.map((item) => (
                        <WishlistCard key={item._id} product={item} />
                    ))}
                </div>
            ) : (
                /* --- EMPTY STATE --- */
                <div className="text-center py-15 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                    <div className="flex justify-center mb-4">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="64"
                            height="64"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            className="text-red-500"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="1"
                                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                            />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-serif text-gray-500">Your wishlist is empty</h2>
                    <p className="text-gray-400 mt-2 mb-8">Save items you love to find them easily later.</p>
                    <Link
                        to="/"
                        className="inline-block bg-(--color-green) text-white px-10 py-3 rounded-full font-medium hover:bg-(--color-gold) transition-all transform hover:scale-105"
                    >
                        Explore Collection
                    </Link>
                </div>
            )}
        </div>
    );
};

export default Wishlist;