import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShopContext } from '../config/ShopContext.jsx';
import Swal from 'sweetalert2';

const WishlistCard = ({ product }) => {
    const { _id, slug, title, thumbnail, images, price } = product || {};
    const id = slug;

    const displayImage = thumbnail || images[0];
    const hoverImage = images?.[1];

    const [imageLoaded, setImageLoaded] = useState(false);
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
    };

    const handleAddToCart = (e) => {
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
        <div className="card-item mx-1 bg-gray-100 flex flex-col h-full rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:drop-shadow-lg transition-all duration-300">

            {/* IMAGE SECTION */}
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
                    src={displayImage}
                    alt={title}
                />
            </Link>

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
                        onClick={handleRemove}
                        className="cursor-pointer flex-1 py-2 bg-white border border-gray-200 rounded-lg flex items-center justify-center active:scale-95 transition-all hover:bg-red-50 hover:border-red-200"
                        aria-label="Remove item"
                    >
                        <lord-icon
                            src="https://cdn.lordicon.com/skkahier.json"
                            trigger="hover"
                            colors="primary:#e83a30,secondary:#e83a30"
                            style={{ width: "18px", height: "18px" }}
                        />
                    </button>

                    <button
                        onClick={handleAddToCart}
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
    );
};

export default WishlistCard;