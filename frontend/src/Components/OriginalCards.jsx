import { useState, useEffect, useMemo, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShopContext } from '../config/ShopContext';
import Swal from 'sweetalert2';

const Cards = ({ product }) => {
    const { _id, id, title, image, hoverImage, price, originalPrice, discount } = product || {};
    const [imageLoaded, setImageLoaded] = useState(false);
    const { addToCart, user, addToWishlist, wishlist } = useContext(ShopContext);
    const navigate = useNavigate();

    const isWishlisted = useMemo(() => wishlist?.includes(_id), [wishlist, _id]);
    const [isHovered, setIsHovered] = useState(false);

    const wishlistStyles = isWishlisted
        ? 'bg-red-50 border-red-200'
        : 'bg-gray-50 border-gray-200';

    const wishlistIconColor = isWishlisted
        ? "primary:#e83a30,secondary:#e83a30"
        : "primary:#333333,secondary:#333333";

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
        <div className="card-item mx-1 bg-gray-100 flex flex-col h-full rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:drop-shadow-lg transition-all duration-300">

            {/* Image Section */}
            <Link to={`/product/${id}`} className="relative w-full aspect-4/5 sm:aspect-square overflow-hidden group bg-gray-50">
                {hoverImage && (
                    <img
                        className="w-full h-full object-cover absolute inset-0 transition-transform duration-700 ease-in-out group-hover:scale-110"
                        src={hoverImage}
                        alt="Product Hover"
                    />
                )}
                <img
                    className={`w-full h-full object-cover absolute inset-0 z-10 transition-all duration-700 ease-in-out group-hover:scale-110 ${imageLoaded && hoverImage ? 'group-hover:opacity-0' : 'opacity-100'
                        }`}
                    src={image}
                    alt={title}
                />
            </Link>

            {/* Content Section */}
            <div className="info p-2 sm:p-4 flex flex-col grow text-center">
                <Link to={`/product/${id}`} className="grow">
                    <h2 className="text-[13px] sm:text-base font-medium text-(--color-gold) line-clamp-1 mb-1 sm:mb-2">
                        {title}
                    </h2>

                    <div className="flex flex-col items-center justify-center mb-2">
                        <span className="font-bold text-sm sm:text-lg text-gray-900">₹ {price}</span>
                        <div className="flex items-center gap-1.5">
                            {originalPrice && (
                                <span className="line-through text-gray-400 text-[10px] sm:text-xs">₹ {originalPrice}</span>
                            )}
                            {discount > 0 && (
                                <span className="text-green-600 text-[10px] sm:text-xs font-bold uppercase"> SAVE {discount}%</span>
                            )}
                        </div>
                    </div>
                </Link>

                {/* Mobile & Tablet Action Row */}
                <div className="flex gap-2 mt-auto">
                    {/* Wishlist Button */}
                    <button
                        onClick={handleWishlistClick}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                        className={`cursor-pointer flex-1 py-2 rounded-lg flex items-center justify-center border transition-all duration-500 ease-in-out active:scale-95 ${wishlistStyles} hover:bg-red-50 hover:border-red-200`}
                    >
                        <lord-icon
                            src="https://cdn.lordicon.com/nvsfzbop.json"
                            trigger="hover"
                            colors={(isHovered || isWishlisted)
                                ? "primary:#e83a30,secondary:#e83a30,tertiary:#e83a30"
                                : "primary:#333333,secondary:transparent"
                            }
                            style={{ width: "20px", height: "20px" }}
                        />
                    </button>

                    {/* Add to Cart Button */}
                    <button
                        onClick={handleAddToCartClick}
                        className="cursor-pointer flex-3 py-2 bg-(--color-green) text-white text-[10px] sm:text-xs font-semibold rounded-lg flex items-center justify-center gap-2 active:scale-95 transition-all duration-500 ease-in-out hover:bg-(--color-gold)"
                    >
                        <lord-icon
                            src="https://cdn.lordicon.com/zmvzumis.json"
                            trigger="hover"
                            colors="primary:#ffffff,secondary:#ffffff"
                            style={{ width: "16px", height: "16px" }}
                        />
                        <span className="hidden min-[400px]:inline">ADD TO BAG</span>
                        <span className="inline min-[400px]:hidden">ADD</span>
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Cards