import React, { useState, useContext } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { ShopContext } from '../config/ShopContext';

export default function AddProduct() {
  const { backendUrl } = useContext(ShopContext);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '', slug: '', brand: '', category: '', description: '',
    material: '', plating: '', price: '', comparePrice: '',
    isAntiTarnish: false, featured: false, isActive: true
  });

  const [tags, setTags] = useState("");
  const [variants, setVariants] = useState([{ color: '', sku: '', stock: 0 }]);
  const [images, setImages] = useState({ image1: null, image2: null, image3: null, image4: null });

  const onChangeHandler = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleVariantChange = (index, e) => {
    const newVariants = [...variants];
    newVariants[index][e.target.name] = e.target.value;
    setVariants(newVariants);
  };

  const addVariant = () => setVariants([...variants, { color: '', sku: '', stock: 0 }]);
  const removeVariant = (index) => setVariants(variants.filter((_, i) => i !== index));

  const onSubmitHandler = async (e) => {
    e.preventDefault();

    if (!formData.category) {
      return toast.error("Please select a category");
    }

    if (!images.image1) {
      return toast.error("Please add at least one product image");
    }

    setLoading(true);
    try {
      const sendData = new FormData();
      Object.keys(formData).forEach(key => sendData.append(key, formData[key]));
      sendData.append("tags", JSON.stringify(tags.split(',').map(tag => tag.trim())));

      const validVariants = variants.filter(v => v.sku.trim() !== "");
      sendData.append("variants", JSON.stringify(validVariants));

      if (images.image1) sendData.append("image1", images.image1);
      if (images.image2) sendData.append("image2", images.image2);
      if (images.image3) sendData.append("image3", images.image3);
      if (images.image4) sendData.append("image4", images.image4);

      const response = await axios.post(`${backendUrl}/api/admin/add`, sendData);

      if (response.data.success) {
        toast.success("Product Created Successfully");
        setTimeout(() => {
          window.location.href = '/admin/list';
        }, 1500);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error adding product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto sm:px-6 mb-20 transition-all duration-300">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 mt-4 gap-2">
        <div>
          <h3 className="text-xl font-bold text-gray-700">Add New Product</h3>
        </div>
        <p className="text-[10px] text-(--color-gold) font-bold tracking-widest uppercase">Luxury Inventory Management</p>
      </div>

      <form onSubmit={onSubmitHandler} className="grid grid-cols-1 lg:grid-cols-[1.8fr_1fr] gap-6 md:gap-8">

        {/* Left Column: Product Info & Variants */}
        <div className="space-y-6">
          <div className="bg-gray-50 p-5 md:p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-(--color-gold) rounded-full"></div>
              <h4 className="font-bold text-(--color-green) tracking-tight">General Information</h4>
            </div>

            <div className="grid grid-cols-1 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Product Title</label>
                <input name="title" onChange={onChangeHandler} placeholder="e.g. Openable Flower Bangle" className="w-full border border-gray-200 p-3.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-(--color-green)/20 focus:border-(--color-green) transition-all" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Description</label>
                <textarea name="description" onChange={onChangeHandler} placeholder="Tell more about the product ..." className="w-full border border-gray-200 p-3.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-(--color-green)/20 focus:border-(--color-green) h-40 resize-none" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Brand</label>
                <input name="brand" onChange={onChangeHandler} placeholder="eg. JEMA" className="border border-gray-200 p-3.5 rounded-xl text-sm outline-none focus:border-(--color-green)" required/>
              </div>

              {/* CATEGORY DROPDOWN */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Category</label>
                <select
                  name="category"
                  onChange={onChangeHandler}
                  className="border border-gray-200 p-3.5 text-gray-700 rounded-xl text-sm outline-none focus:border-(--color-green) bg-gray-50 cursor-pointer"
                  defaultValue=""
                >
                  <option value="" disabled>Select Category</option>
                  <option value="Bracelet">Bracelet</option>
                  <option value="Ring">Ring</option>
                  <option value="Necklace">Necklace</option>
                  <option value="Earring">Earring</option>
                </select>
              </div>

              {/* TAGS INPUT - Integrated Change */}
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Tags (separated by commas)</label>
                <input 
                  type="text" 
                  value={tags} 
                  onChange={(e) => setTags(e.target.value)} 
                  placeholder="eg. Contemporary, crystal stone, Bestseller..." 
                  className="border border-gray-200 p-3.5 rounded-xl text-sm outline-none focus:border-(--color-green)" 
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Material</label>
                <input name="material" onChange={onChangeHandler} placeholder="eg. Zinc Alloys" className="border border-gray-200 p-3.5 rounded-xl text-sm outline-none focus:border-(--color-green)" required/>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Plating</label>
                <input name="plating" onChange={onChangeHandler} placeholder="eg. Gold" className="border border-gray-200 p-3.5 rounded-xl text-sm outline-none focus:border-(--color-green)" required/>
              </div>

            </div>
          </div>

          {/* Variants Section */}
          <div className="bg-gray-50 p-5 md:p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-(--color-gold) rounded-full"></div>
                <h4 className="font-bold text-(--color-green) tracking-tight">Inventory Variants</h4>
              </div>
              <button type="button" onClick={addVariant} className="bg-green-50 cursor-pointer text-(--color-green) px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-(--color-gold) hover:text-white transition-all underline-none tracking-widest">
                + ADD NEW
              </button>
            </div>

            <div className="space-y-4">
              {variants.map((variant, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-[1.5fr_1.5fr_1fr_0.2fr] gap-3 bg-green-50/50 p-3 rounded-lg border border-green-100 items-end">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-green-700 uppercase">Color/Style</label>
                    <input name="color" placeholder="Peach/Crystal" onChange={(e) => handleVariantChange(index, e)} className="bg-gray-50 border border-gray-200 p-2 rounded text-sm outline-none" required />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-green-700 uppercase">SKU</label>
                    <input name="sku" placeholder="PR3688" onChange={(e) => handleVariantChange(index, e)} className="bg-gray-50 border border-gray-200 p-2 rounded text-sm outline-none" required />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-green-700 uppercase">Stock</label>
                    <input name="stock" type="number" placeholder="0" onChange={(e) => handleVariantChange(index, e)} className="bg-gray-50 border border-gray-200 p-2 rounded text-sm outline-none" required />
                  </div>
                  {variants.length > 1 && (
                    <button onClick={() => removeVariant(index)} type="button" className="text-red-400 hover:text-red-600 mb-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Media & Publish */}
        <div className="space-y-6">
          {/* Media Card */}
          <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1.5 h-6 bg-(--color-gold) rounded-full"></div>
              <h4 className="font-bold text-(--color-green) tracking-tight">Product Images</h4>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(num => (
                <label key={num} className="cursor-pointer border-2 border-dashed border-gray-200 hover:border-(--color-gold) w-full aspect-square flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden transition-colors">
                  <input type="file" hidden onChange={(e) => setImages(prev => ({ ...prev, [`image${num}`]: e.target.files[0] }))} />
                  {images[`image${num}`] ? (
                    <img src={URL.createObjectURL(images[`image${num}`])} alt="preview" className="object-cover h-full w-full" />
                  ) : (
                    <div className="text-center">
                      <svg className="w-6 h-6 mx-auto text-gray-300 group-hover:text-(--color-gold)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      <p className="text-[10px] text-gray-400 mt-1 uppercase">Image {num}</p>
                    </div>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Pricing Card */}
          <div className="bg-gray-50 p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-(--color-gold) rounded-full"></div>
              <h4 className="font-bold text-(--color-green) tracking-tight">Price Details</h4>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase">ZYRO Price (₹)</label>
                <input name="price" type="number" onChange={onChangeHandler} className="border border-gray-200 p-3.5 rounded-xl text-base font-bold outline-none focus:border-(--color-gold)" placeholder="299.00" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Market Price (₹)</label>
                <input name="comparePrice" type="number" onChange={onChangeHandler} className="border border-gray-200 p-3.5 rounded-xl text-sm outline-none focus:border-(--color-gold)" placeholder="2499.00" required />
              </div>
            </div>
            <div className="flex flex-col gap-3 pt-2">
              <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors border border-transparent hover:border-gray-100">
                <input type="checkbox" name="isAntiTarnish" onChange={onChangeHandler} className="w-4 h-4 rounded accent-(--color-gold)" />
                <span className="text-[11px] font-bold text-gray-600 uppercase tracking-tight">Anti-Tarnish Coating</span>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors border border-transparent hover:border-gray-100">
                <input type="checkbox" name="featured" onChange={onChangeHandler} className="w-4 h-4 rounded accent-(--color-gold)" />
                <span className="text-[11px] font-bold text-gray-600 uppercase tracking-tight">Featured Collection</span>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-(--color-green) hover:bg-(--color-gold) cursor-pointer text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-gray-200 transition-all transform active:scale-[0.97] disabled:bg-gray-300 disabled:text-(--color-green) disabled:cursor-not-allowed"
          >
            {loading ? "Establishing Product..." : "Publish to Store"}
          </button>
        </div>
      </form>
    </div>
  );
}