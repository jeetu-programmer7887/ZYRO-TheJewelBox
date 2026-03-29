import { useState, useEffect, useMemo, useContext, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShopContext } from '../config/ShopContext';
import Swal from 'sweetalert2';

const Cards = ({ product }) => {
    // Destructure variants to calculate stock
    const { _id, id, title, image, hoverImage, price, originalPrice, discount, variants } = product || {};
    
    // Calculate total stock from variants
    const totalStock = variants?.reduce((acc, variant) => acc + (variant.stock || 0), 0) || 0;
    const isOutOfStock = totalStock <= 0;

    const [imageLoaded, setImageLoaded] = useState(false);
    const { addToCart, user, addToWishlist, wishlist } = useContext(ShopContext);
    const navigate = useNavigate();

    const cartBtnRef = useRef(null);

    const isWishlisted = useMemo(() => wishlist?.includes(_id), [wishlist, _id]);
    const [isWishlistHovered, setIsWishlistHovered] = useState(false);
    const [isCartHovered, setIsCartHovered] = useState(false);

    const wishlistStyles = isWishlisted
        ? 'bg-red-50 border-red-200'
        : 'bg-white border-gray-100';

    useEffect(() => {
        if (hoverImage) {
            const img = new Image();
            img.src = hoverImage;
            img.onload = () => setImageLoaded(true);
        }
    }, [hoverImage]);

    const handleWishlistClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        addToWishlist(_id);
    };

    const handleAddToCartClick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        // 1. Prevent adding if out of stock
        if (isOutOfStock) return;

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
                scrollbarPadding: false,
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
            iconColor: '#ffffff',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true,
            didOpen: (toast) => {
                const progressBar = toast.querySelector('.swal2-timer-progress-bar');
                if (progressBar) progressBar.style.backgroundColor = '#c6a664';
            }
        });
    };

    return (
        <div className="card-item mx-1 bg-gray-100 flex flex-col h-full rounded-xl overflow-hidden border border-gray-100 transition-all duration-500 hover:border-(--color-green)/30 hover:shadow-2xl hover:-translate-y-1 group/card">

            {/* Image Container */}
            <div className="relative w-full aspect-4/5 sm:aspect-square overflow-hidden bg-gray-50 group/image">
                
                {/* SOLD OUT BADGE */}
                {isOutOfStock && (
                    <div className="absolute top-3 left-3 z-30 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                        SOLD OUT
                    </div>
                )}

                <Link to={`/product/${_id}`}>
                    {hoverImage && (
                        <img
                            className="w-full h-full object-cover absolute inset-0 transition-transform duration-700 ease-in-out group-hover/image:scale-100"
                            src={hoverImage}
                            alt="Product Hover"
                        />
                    )}
                    <img
                        className={`w-full h-full object-cover absolute inset-0 z-10 transition-all duration-700 ease-in-out group-hover/image:scale-110 ${imageLoaded && hoverImage ? 'group-hover/image:opacity-0' : 'opacity-100'
                            }`}
                        src={image}
                        alt={title}
                    />
                </Link>

                {/* Wishlist Button */}
                <div className="absolute left-3 bottom-3 z-20 opacity-100 sm:opacity-0 sm:translate-y-4 sm:group-hover/image:translate-y-0 sm:group-hover/image:opacity-100 transition-all duration-300 ease-out">
                    <button
                        onClick={handleWishlistClick}
                        onMouseEnter={() => setIsWishlistHovered(true)}
                        onMouseLeave={() => setIsWishlistHovered(false)}
                        className={`cursor-pointer w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border border-gray-200 transition-all duration-300 active:scale-95 ${wishlistStyles} hover:scale-110 shadow-sm`}
                    >
                        <lord-icon
                            src="https://cdn.lordicon.com/nvsfzbop.json"
                            trigger="hover"
                            colors={(isWishlistHovered || isWishlisted)
                                ? "primary:#e83a30,secondary:#e83a30,tertiary:#e83a30"
                                : "primary:#333333,secondary:transparent"
                            }
                            style={{ width: "22px", height: "22px" }}
                        />
                    </button>
                </div>
            </div>

            {/* Content Section */}
            <div className="info p-3 sm:p-4 flex flex-col grow text-center">
                <Link to={`/product/${id}`} className="grow">
                    <h2 className="text-[13px] sm:text-base font-medium text-(--color-gold) line-clamp-1 mb-1 sm:mb-2 hover:underline transition-colors">
                        {title}
                    </h2>

                    <div className="flex flex-col items-center justify-center mb-3">
                        <span className="font-bold text-sm sm:text-lg text-gray-900">₹ {price}</span>
                        <div className="flex items-center gap-1.5">
                            {originalPrice && (
                                <span className="line-through text-gray-400 text-[10px] sm:text-xs">₹ {originalPrice}</span>
                            )}
                            {discount > 0 && (
                                <span className="text-green-600 text-[10px] sm:text-xs font-bold uppercase tracking-wider"> SAVE {discount}%</span>
                            )}
                        </div>
                    </div>
                </Link>

                {/* Add to Bag Button */}
                <button
                    ref={cartBtnRef}
                    onClick={handleAddToCartClick}
                    disabled={isOutOfStock}
                    onMouseEnter={() => !isOutOfStock && setIsCartHovered(true)}
                    onMouseLeave={() => setIsCartHovered(false)}
                    className={`w-full py-2 border text-[11px] sm:text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all duration-500 
                        ${isOutOfStock 
                            ? 'bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed opacity-80' 
                            : 'cursor-pointer bg-green-50 border-(--color-green) text-(--color-green) active:scale-95 hover:bg-(--color-green) hover:text-white hover:shadow-lg'
                        }`}
                >
                    {!isOutOfStock && (
                        <lord-icon
                            src="https://cdn.lordicon.com/zmvzumis.json"
                            trigger="hover"
                            target=".cursor-pointer" 
                            colors={isCartHovered ? "primary:#ffffff,secondary:#ffffff" : "primary:#2e4a3e,secondary:#2e4a3e"}
                            style={{ width: "18px", height: "18px" }}
                        />
                    )}
                    <span>{isOutOfStock ? 'OUT OF STOCK' : 'ADD TO BAG'}</span>
                </button>
            </div>
        </div>
    )
}

export default Cards;