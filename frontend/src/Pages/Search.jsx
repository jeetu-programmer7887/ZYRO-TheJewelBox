import { useContext, useState, useMemo } from 'react';
import { ShopContext } from '../config/ShopContext';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';

const Search = () => {
    const { allProducts, currency } = useContext(ShopContext);
    const [searchTerm, setSearchTerm] = useState("");

    // Filter Logic
    const filteredProducts = useMemo(() => {
        if (!allProducts) return [];
        if (!searchTerm.trim()) return [];

        const searchWords = searchTerm.toLowerCase().split(" ");

        return allProducts.filter(item => {
            const title = item.title?.toLowerCase() || "";
            const category = item.category?.toLowerCase() || "";

            return searchWords.every(word =>
                title.includes(word) || category.includes(word)
            );
        });
    }, [allProducts, searchTerm]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 mt-15 min-h-screen">

            {/* Search Header */}
            <div className="flex flex-col items-center mb-12">
                <h1 className="text-3xl font-bold text-(--color-green) mb-6">Search our Collection</h1>

                <div className="relative w-full max-w-2xl">
                    <input
                        type="text"
                        autoFocus
                        placeholder="Search title, category..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-6 py-4 text-lg border-2 border-gray-100 rounded-2xl shadow-sm focus:border-(--color-gold) focus:ring-0 outline-none transition-all pr-16"
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>

                {searchTerm && (
                    <p className="mt-4 text-(--color-green) animate-pulse text-lg font-semibold">
                        Showing {filteredProducts.length} items for your search
                    </p>
                )}
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {filteredProducts.map((item) => (
                    <div key={item.slug} className="group bg-gray-100 flex flex-col h-full rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:drop-shadow-lg transition-all duration-300">

                        {/* Image Section */}
                        <Link to={`/product/${item._id}`} className="relative w-full aspect-4/5 sm:aspect-square overflow-hidden bg-gray-50">
                            <img
                                className="w-full h-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-110"
                                src={item.images?.[0] || item.image}
                                alt={item.title}
                            />
                        </Link>

                        {/* Content Section */}
                        <div className="p-3 sm:p-4 flex flex-col grow text-center">
                            <Link to={`/product/${item._id}`} className="grow">
                                <h2 className="text-[13px] sm:text-base font-medium text-(--color-gold) line-clamp-1 mb-3">
                                    {item.title}
                                </h2>
                            </Link>

                            {/* Price & Button Container - Forced Column on all screens */}
                            <div className="flex flex-col gap-3 border-gray-200">

                                {/* Line 1: Price and Discount */}
                                <div className="flex items-center justify-center gap-2">
                                    <span className="text-base sm:text-lg font-bold text-(--color-green)">
                                        {currency} {item.price}
                                    </span>

                                    {item.comparePrice > item.price && (
                                        <span className="px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded-full bg-green-100 text-green-700">
                                            {Math.round(((item.comparePrice - item.price) / item.comparePrice) * 100)}% OFF
                                        </span>
                                    )}
                                </div>

                                {/* Line 2: View Product Button */}
                                <Link
                                    to={`/product/${item._id}`}
                                    className="w-full py-2 bg-(--color-green) text-white text-[10px] sm:text-xs font-bold rounded-lg transition-all duration-300 hover:bg-(--color-gold) active:scale-95 whitespace-nowrap flex items-center justify-center gap-2 px-3"
                                >
                                    <Eye size={14} strokeWidth={2.5} />
                                    VIEW PRODUCT
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {searchTerm && filteredProducts.length === 0 && (
                <div className="text-center py-24">
                    <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">No results found</h3>
                    <p className="text-gray-500 mt-2">Try searching for something else.</p>
                </div>
            )}

            {/* Initial State */}
            {!searchTerm && (
                <div className="text-center py-24 text-(--color-gold)">
                    <p className="text-xl italic font-medium">Type to explore our collection...</p>
                </div>
            )}
        </div>
    );
};

export default Search;