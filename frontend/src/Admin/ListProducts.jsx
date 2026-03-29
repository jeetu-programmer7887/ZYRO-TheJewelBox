import React, { useContext, useState, useMemo, useEffect } from 'react';
import { ShopContext } from '../config/ShopContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { exportToCSV } from '../Utility/exportCSV.js';
import { useNavigate, useLocation } from 'react-router-dom';

const AdminListProducts = () => {
  const { allProducts, currency, backendUrl } = useContext(ShopContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStock, setFilterStock] = useState("All");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const stockFilter = params.get('filter');
    if (stockFilter === 'low-stock') {
      setFilterStock("Low Stock");
    }
  }, [location]);

  const categories = useMemo(() => {
    if (!allProducts) return [];
    return ["All", ...new Set(allProducts.map(item => item.category))];
  }, [allProducts]);

  const filteredProducts = useMemo(() => {
    return allProducts?.filter(item => {
      const totalStock = item.variants?.reduce((acc, v) => acc + v.stock, 0) || 0;
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === "All" || item.category === filterCategory;

      let matchesStock = true;
      if (filterStock === "Low Stock") {
        matchesStock = totalStock > 0 && totalStock < 10;
      } else if (filterStock === "Out of Stock") {
        matchesStock = totalStock === 0;
      }

      return matchesSearch && matchesCategory && matchesStock;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [allProducts, searchTerm, filterCategory, filterStock]);

  const removeProduct = async (_id) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#2e4a3e',
      confirmButtonText: 'Yes, delete it!',
      scrollbarPadding: false
    });

    if (result.isConfirmed) {
      try {
        const { data } = await axios.delete(`${backendUrl}/api/admin/remove/${_id}`);
        if (data.success) {
          toast.success(data.message);
          setTimeout(() => { window.location.reload(); }, 1500);
        } else {
          toast.error(data.message);
        }
      } catch (error) {
        toast.error("An error occurred while deleting.");
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto sm:px-6 lg:px-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h3 className="text-2xl font-bold text-gray-800 tracking-tight">Product Management</h3>
          <p className="text-sm text-gray-500 font-medium">Showing: {filteredProducts?.length || 0} items</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button
            onClick={() => {
              const dataToExport = filteredProducts.map(p => ({
                Title: p.title,
                Category: p.category,
                Price: p.price,
                Total_Stock: p.variants?.reduce((acc, v) => acc + v.stock, 0) || 0,
                Status: p.isActive ? "Active" : "Inactive"
              }));
              exportToCSV(dataToExport, "ZYRO_Inventory");
            }}
            className="flex cursor-pointer items-center gap-2 px-4 py-2.5 bg-(--color-green) text-(--color-gold) rounded-xl font-bold text-xs hover:bg-(--color-gold) hover:text-white transition-all shadow-sm shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            EXPORT CSV
          </button>
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-(--color-gold) outline-none text-sm"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-sm font-medium focus:ring-2 focus:ring-(--color-gold) outline-none cursor-pointer"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={filterStock}
            onChange={(e) => setFilterStock(e.target.value)}
            className={`px-4 py-2.5 border rounded-xl bg-white text-sm font-semibold outline-none cursor-pointer transition-colors ${filterStock !== "All" ? "border-orange-500 text-orange-600 ring-1 ring-orange-100" : "border-gray-300"
              }`}
          >
            <option value="All">All Stock Levels</option>
            <option value="Low Stock">Low Stock (&lt;10)</option>
            <option value="Out of Stock">Out of Stock (0)</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {filteredProducts && filteredProducts.length > 0 ? (
          filteredProducts.map((item) => {
            const totalStock = item.variants?.reduce((acc, v) => acc + v.stock, 0) || 0;
            const isLowStock = totalStock > 0 && totalStock < 10;
            const isOut = totalStock === 0;

            return (
              <div
                key={item._id}
                // FIXED: Increased the last column width from 60px/80px to 90px/110px
                className={`flex flex-col sm:grid sm:grid-cols-[80px_1.5fr_1fr_1fr_1fr_90px] lg:grid-cols-[100px_2fr_1fr_1fr_1fr_110px] gap-4 items-center border p-4 rounded-2xl shadow-sm transition-all duration-300 hover:shadow-xl group ${isOut ? 'border-red-200 bg-red-50' : isLowStock ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-white'
                  }`}
              >
                <div className="w-20 h-20 sm:w-16 sm:h-16 lg:w-20 lg:h-20 shrink-0">
                  <img
                    src={item.images?.[0] || item.thumbnail}
                    alt={item.title}
                    className="w-full h-full object-cover rounded-xl border border-gray-100 bg-gray-50"
                  />
                </div>

                <div className="flex flex-col gap-1 w-full min-w-0 text-center sm:text-left">
                  <p className="text-sm lg:text-base font-bold text-(--color-green)" title={item.title}>
                    {item.title}
                  </p>
                </div>

                <div className="hidden sm:flex flex-col items-center justify-center bg-gray-100/50 py-2 px-3 rounded-xl w-full">
                  <p className="text-gray-400 text-[9px] uppercase font-bold">Category</p>
                  <p className="font-bold text-(--color-green) text-xs lg:text-sm truncate w-full text-center">
                    {item.category}
                  </p>
                </div>

                <div className="flex flex-col items-center w-full">
                  <p className="text-gray-400 text-[9px] uppercase font-bold">Price</p>
                  <div className="flex flex-wrap justify-center items-baseline gap-1.5">
                    <span className="text-sm lg:text-base font-bold text-(--color-green)">{currency}{item.price}</span>
                  </div>
                </div>

                <div className="flex flex-col items-center w-full bg-white/50 py-2 rounded-xl border border-black/5">
                  <p className="text-gray-400 text-[9px] uppercase font-bold">Total Stock</p>
                  <p className={`font-black text-xs lg:text-base ${isOut ? 'text-red-600' : isLowStock ? 'text-orange-600' : 'text-green-700'
                    }`}>
                    {totalStock}
                    {isOut && <span className="block text-[8px] uppercase text-center w-full">Out</span>}
                    {isLowStock && <span className="block text-[8px] uppercase text-center w-full">Low</span>}
                  </p>
                </div>

                {/* FIXED: Added gap-1 and ensured flex-nowrap so buttons stay side-by-side */}
                <div className="flex justify-center items-center flex-nowrap gap-1 w-full sm:w-auto shrink-0 border-t sm:border-none pt-3 sm:pt-0">
                  <button
                    onClick={() => navigate(`/admin/edit/${item._id}`)}
                    className="p-2 cursor-pointer text-(--color-gold) hover:bg-blue-50 rounded-xl transition-colors shrink-0"
                  >
                    <svg className="w-5 h-5 lg:w-6 lg:h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  <button
                    onClick={() => removeProduct(item._id)}
                    className="p-2 cursor-pointer text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0"
                  >
                    <svg className="w-5 h-5 lg:w-6 lg:h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 shadow-inner">
            <p className="text-gray-400 font-medium italic">No products match your current filters.</p>
            <button onClick={() => { setFilterCategory("All"); setFilterStock("All"); setSearchTerm(""); }} className="mt-4 text-(--color-gold) font-bold text-sm underline underline-offset-4">Reset All Filters</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminListProducts;