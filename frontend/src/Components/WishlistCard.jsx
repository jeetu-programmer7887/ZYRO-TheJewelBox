import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShopContext } from '../config/ShopContext.jsx';
import { IoHeart, IoHeartOutline } from "react-icons/io5"; 
import Swal from 'sweetalert2';

const WishlistCard = ({ product }) => {
    // Destructure variants to check stock
    const { _id, slug, title, thumbnail, images, price, variants } = product || {};
    const id = _id;

    // Calculate total stock across all variants
    const totalStock = variants?.reduce((acc, variant) => acc + (variant.stock || 0), 0) || 0;
    const isOutOfStock = totalStock <= 0;

    const displayImage = thumbnail || images[0];
    const hoverImage = images?.[1];

    const [imageLoaded, setImageLoaded] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);

    const { addToCart, user, removeFromWishlist } = useContext(ShopContext);
    const navigate = useNavigate();

    useEffect(() => {
        if (hoverImage) {
            const img = new Image();
            img.src = hoverImage;
            img.onload = () => setImageLoaded(true);
        }
    }, [hoverImage]);

    const handleRemove = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsRemoving(true);
        setTimeout(() => {
            removeFromWishlist(_id);
            Swal.fire({
                icon: 'info',
                title: 'Removed from wishlist',
                toast: true,
                position: 'bottom-end',
                showConfirmButton: false,
                timer: 1500,
                background: '#f8f8f8',
            });
        }, 300);
    };

    const handleAddToCart = (e) => {
        e.preventDefault();
        e.stopPropagation();

        // 1. Check for stock first
        if (isOutOfStock) {
            Swal.fire({
                title: 'Out of Stock',
                text: 'We are sorry, but this item is currently unavailable.',
                icon: 'warning',
                confirmButtonColor: '#2e4a3e',
            });
            return;
        }

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
            }).then((result) => {
                if (result.isConfirmed) {
                    navigate("/login", { state: { redirectTo: "/cart" } });
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
            timer: 2000,
            showConfirmButton: false,
        });
    };

    return (
        <div 
            className={`card-item mx-1 bg-gray-100 flex flex-col h-full rounded-xl overflow-hidden border border-gray-200 shadow-sm transition-all duration-300 ease-in-out
                ${isRemoving ? 'opacity-0 scale-95 blur-sm' : 'opacity-100 scale-100 hover:drop-shadow-lg'}
            `}
        >
            {/* IMAGE SECTION */}
            <div className="relative w-full aspect-4/5 sm:aspect-square overflow-hidden group bg-gray-50">
                {/* Out of Stock Overlay Badge */}
                {isOutOfStock && (
                    <div className="absolute top-3 left-3 z-30 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded">
                        SOLD OUT
                    </div>
                )}

                <Link to={`/product/${id}`}>
                    {hoverImage && (
                        <img
                            className={`w-full h-full object-cover absolute inset-0 transition-transform duration-700 ease-in-out group-hover:scale-110`}
                            src={hoverImage}
                            alt="Product Hover"
                        />
                    )}
                    <img
                        className={`w-full h-full object-cover absolute inset-0 z-10 transition-all duration-700 ease-in-out group-hover:scale-110 ${
                            imageLoaded && hoverImage ? 'group-hover:opacity-0' : 'opacity-100'
                        }`}
                        src={displayImage}
                        alt={title}
                    />
                </Link>

                <button
                    onClick={handleRemove}
                    className="group/heart absolute top-3 right-3 z-20 cursor-pointer w-9 h-9 bg-white/60 backdrop-blur-md rounded-full flex items-center justify-center transition-all border border-gray-300 duration-300 hover:bg-white shadow-sm"
                    aria-label="Remove from wishlist"
                >
                    <IoHeart 
                        size={20} 
                        className="text-red-600 transition-all duration-300 group-hover/heart:opacity-0 group-hover/heart:scale-50 absolute" 
                    />
                    <IoHeartOutline 
                        size={20} 
                        className="text-gray-400 opacity-0 transition-all duration-300 group-hover/heart:opacity-100 group-hover/heart:scale-110" 
                    />
                </button>
            </div>

            {/* CONTENT SECTION */}
            <div className="info p-2 sm:p-4 flex flex-col grow text-center">
                <Link to={`/product/${id}`} className="grow">
                    <h2 className="text-[13px] sm:text-base font-medium text-(--color-gold) line-clamp-1 mb-1 sm:mb-2">
                        {title}
                    </h2>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-0 sm:gap-2 mb-3">
                        <span className="font-bold text-sm sm:text-lg text-gray-900">
                            ₹ {price}
                        </span>
                    </div>
                </Link>

                <div className="flex gap-2 mt-auto">
                    <button
                        onClick={handleAddToCart}
                        disabled={isOutOfStock}
                        className={`group/btn w-full py-3 border text-[10px] sm:text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all duration-500 ease-in-out
                            ${isOutOfStock 
                                ? 'bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed' 
                                : 'cursor-pointer border-gray-400 text-black hover:text-white hover:bg-(--color-green) active:scale-95'}
                        `}
                    >
                        {!isOutOfStock && (
                            <div className="flex items-center justify-center transition-all duration-500 group-hover/btn:brightness-0 group-hover/btn:invert">
                                <lord-icon
                                    src="https://cdn.lordicon.com/zmvzumis.json"
                                    trigger="hover"
                                    colors="primary:#000000,secondary:#000000"
                                    style={{ width: "16px", height: "16px" }}
                                />
                            </div>
                        )}
                        
                        <span className="uppercase">
                            {isOutOfStock ? 'Out of Stock' : 'Add to Bag'}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WishlistCard;