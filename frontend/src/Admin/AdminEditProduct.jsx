import { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { ShopContext } from '../config/ShopContext';
import { useNavigate, useParams } from 'react-router-dom';


export default function AdminEditProduct() {
    const { backendUrl } = useContext(ShopContext); // Removed allProducts
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        title: '', slug: '', brand: '', category: '', description: '',
        material: '', plating: '', price: '', comparePrice: '',
        isAntiTarnish: false, featured: false, isActive: true
    });

    const [tags, setTags] = useState("");
    const [variants, setVariants] = useState([{ color: '', sku: '', stock: 0 }]);
    const [images, setImages] = useState({ image1: '', image2: '', image3: '', image4: '' });

    useEffect(() => {
        const fetchProductDetails = async () => {
            try {
                setLoading(true);
                // Fetching full details from the database via the product ID
                const { data } = await axios.get(`${backendUrl}/api/products/details/${id}`);

                if (data.success) {
                    const product = data.product;
                    setFormData({
                        title: product.title || '',
                        slug: product.slug || '',
                        brand: product.brand || '',
                        category: product.category || '',
                        description: product.description || '',
                        material: product.material || '',
                        plating: product.plating || '',
                        price: product.price || '',
                        comparePrice: product.comparePrice || '',
                        isAntiTarnish: product.isAntiTarnish || false,
                        featured: product.featured || false,
                        isActive: product.isActive || true
                    });
                    setTags(product.tags ? product.tags.join(', ') : "");
                    setVariants(product.variants || [{ color: '', sku: '', stock: 0 }]);
                    setImages({
                        image1: product.images?.[0] || '',
                        image2: product.images?.[1] || '',
                        image3: product.images?.[2] || '',
                        image4: product.images?.[3] || '',
                    });
                } else {
                    toast.error(data.message);
                }
            } catch (error) {
                console.error("Error fetching product:", error);
                toast.error("Failed to load product details");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchProductDetails();
        }
    }, [id, backendUrl]);

    const onChangeHandler = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleImageChange = (key, value) => {
        setImages(prev => ({ ...prev, [key]: value }));
    };

    const handleVariantChange = (index, e) => {
        const { name, value } = e.target;
        const newVariants = [...variants];
        newVariants[index][name] = value;
        setVariants(newVariants);
    };

    const addVariant = () => setVariants([...variants, { color: '', sku: '', stock: 0 }]);
    const removeVariant = (index) => setVariants(variants.filter((_, i) => i !== index));

    const onSubmitHandler = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...formData,
                tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag !== ""),
                variants: variants,
                images: Object.values(images).filter(url => url && url.trim() !== ""),
                thumbnail: Object.values(images).find(url => url && url.trim() !== "") || ""
            };

            const { data } = await axios.put(`${backendUrl}/api/admin/${id}/edit`, payload);

            if (data.success) {
                toast.success("Product Updated Successfully");

                setTimeout(() => {
                    navigate("/admin/list");
                }, 1500);

            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error("Frontend Update Error:", error);
            toast.error(error.response?.data?.message || "Error updating product");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <>
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
                    Loading Product Details..
                </p>
            </div>

        </div>;
    </>

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-20">
            <div className="flex justify-between items-center mb-8 mt-4">
                <h3 className="text-xl font-bold text-(--color-green)">Edit Product: <span className="text-(--color-gold)">{formData.title}</span></h3>
                <button onClick={() => navigate(-1)} className="text-xs cursor-pointer font-bold text-(--color-green) hover:text-(--color-gold) uppercase tracking-widest flex items-center gap-1">
                    <span className='text-sm'>&lt;</span> Back to List
                </button>
            </div>

            <form onSubmit={onSubmitHandler} className="grid grid-cols-1 lg:grid-cols-[1.8fr_1fr] gap-8">

                {/* Left Column */}
                <div className="space-y-6">
                    <div className="bg-gray-50 p-5 md:p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-(--color-gold) rounded-full"></div>
                            <h4 className="font-bold text-(--color-green) tracking-tight">General Information</h4>
                        </div>

                        <div className="grid grid-cols-1 gap-5">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Product Title</label>
                                <input name="title" value={formData.title} onChange={onChangeHandler} className="w-full border border-gray-200 p-3.5 rounded-xl text-sm outline-none focus:border-(--color-green) bg-white" required />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Description</label>
                                <textarea name="description" value={formData.description} onChange={onChangeHandler} className="w-full border border-gray-200 p-3.5 rounded-xl text-sm outline-none h-40 resize-none focus:border-(--color-green) bg-white" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Brand</label>
                                <input name="brand" value={formData.brand} onChange={onChangeHandler} className="border border-gray-200 p-3.5 rounded-xl text-sm outline-none bg-white" required />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Category</label>
                                <select name="category" value={formData.category} onChange={onChangeHandler} className="border border-gray-200 p-3.5 rounded-xl text-sm outline-none bg-white cursor-pointer">
                                    <option value="Bracelet">Bracelet</option>
                                    <option value="Ring">Ring</option>
                                    <option value="Necklace">Necklace</option>
                                    <option value="Earring">Earring</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-1.5 sm:col-span-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Tags (comma separated)</label>
                                <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} className="border border-gray-200 p-3.5 rounded-xl text-sm outline-none bg-white" required />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Material</label>
                                <input name="material" value={formData.material} onChange={onChangeHandler} className="border border-gray-200 p-3.5 rounded-xl text-sm outline-none bg-white" required />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Plating</label>
                                <input name="plating" value={formData.plating} onChange={onChangeHandler} className="border border-gray-200 p-3.5 rounded-xl text-sm outline-none bg-white" required />
                            </div>
                        </div>
                    </div>

                    {/* Inventory Variants */}
                    <div className="bg-gray-50 p-5 md:p-8 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="font-bold text-(--color-green)">Inventory Variants</h4>
                            <button type="button" onClick={addVariant} className="text-(--color-green) text-[10px] font-black uppercase tracking-widest hover:text-(--color-gold) cursor-pointer">+ Add New</button>
                        </div>
                        <div className="space-y-4">
                            {variants.map((variant, index) => (
                                <div key={index} className="grid grid-cols-1 sm:grid-cols-[1.5fr_1.5fr_1fr_0.2fr] gap-3 bg-white p-3 rounded-xl border border-gray-100 items-end shadow-xs">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-gray-400 uppercase">Color</label>
                                        <input name="color" value={variant.color} onChange={(e) => handleVariantChange(index, e)} className="border border-gray-100 p-2 rounded-lg text-sm" required />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-gray-400 uppercase">SKU</label>
                                        <input name="sku" value={variant.sku} onChange={(e) => handleVariantChange(index, e)} className="border border-gray-100 p-2 rounded-lg text-sm" required />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-gray-400 uppercase">Stock</label>
                                        <input name="stock" type="number" value={variant.stock} onChange={(e) => handleVariantChange(index, e)} className="border border-gray-100 p-2 rounded-lg text-sm" required />
                                    </div>
                                    {variants.length > 1 && (
                                        <button onClick={() => removeVariant(index)} type="button" className="text-red-400 mb-2 hover:text-red-600 transition-colors cursor-pointer text-xl font-bold">×</button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Media & Price */}
                <div className="space-y-6">
                    {/* 4. Updated Media Input for URLs */}
                    <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-(--color-gold) rounded-full"></div>
                            <h4 className="font-bold text-(--color-green) tracking-tight">Product Image URLs</h4>
                        </div>

                        <div className="space-y-5">
                            {[1, 2, 3, 4].map(num => (
                                <div key={num} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Image URL {num}</label>
                                        {images[`image${num}`] && <span className="text-[8px] text-green-500 font-bold uppercase"> Link</span>}
                                    </div>
                                    <div className="flex gap-3 items-center">
                                        {/* Preview Thumbnail */}
                                        <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden shrink-0">
                                            {images[`image${num}`] ? (
                                                <img src={images[`image${num}`]} alt="" className="w-full h-full object-cover" onError={(e) => e.target.src = 'https://placehold.co/100x100?text=Error'} />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-300">N/A</div>
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            value={images[`image${num}`]}
                                            onChange={(e) => handleImageChange(`image${num}`, e.target.value)}
                                            placeholder="https://example.com/image.jpg"
                                            className="flex-1 border border-gray-200 p-2.5 rounded-xl text-xs outline-none focus:border-(--color-green)"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-(--color-gold) rounded-full"></div>
                            <h4 className="font-bold text-(--color-green)">Pricing & Visibility</h4>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">ZYRO Price (₹)</label>
                            <input name="price" type="number" value={formData.price} onChange={onChangeHandler} className="border border-gray-200 p-3.5 rounded-xl font-bold outline-none bg-white focus:border-(--color-gold)" required />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Retail Price (₹)</label>
                            <input name="comparePrice" type="number" value={formData.comparePrice} onChange={onChangeHandler} className="border border-gray-200 p-3.5 rounded-xl outline-none bg-white focus:border-(--color-gold)" required />
                        </div>
                        <div className="space-y-3 pt-2">
                            <label className="flex items-center gap-3 p-2 cursor-pointer hover:bg-white rounded-lg transition-colors group">
                                <input type="checkbox" name="isAntiTarnish" checked={formData.isAntiTarnish} onChange={onChangeHandler} className="accent-(--color-gold) w-4 h-4" />
                                <span className="text-[11px] font-bold text-gray-600 uppercase group-hover:text-(--color-green)">Anti-Tarnish Coating</span>
                            </label>
                            <label className="flex items-center gap-3 p-2 cursor-pointer hover:bg-white rounded-lg transition-colors group">
                                <input type="checkbox" name="featured" checked={formData.featured} onChange={onChangeHandler} className="accent-(--color-gold) w-4 h-4" />
                                <span className="text-[11px] font-bold text-gray-600 uppercase group-hover:text-(--color-green)">Featured Collection</span>
                            </label>
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="w-full cursor-pointer bg-(--color-green) hover:bg-(--color-gold) text-white py-4 rounded-2xl font-bold uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all disabled:bg-gray-300">
                        {loading ? "Processing..." : "Update Product"}
                    </button>
                </div>
            </form>
        </div>
    );
}