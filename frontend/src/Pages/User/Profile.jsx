import React, { useState, useContext, useEffect } from 'react';
import { ShopContext } from '../../config/ShopContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

const Inputfield = ({ label, name, value, type, disabled = false, handleChange }) => (
  <div className="flex flex-col">
    <label htmlFor={name} className="mb-1 para text-(--color-gold) font-bold text-sm">{label}</label>
    <input
      id={name}
      type={type}
      name={name}
      value={value}
      disabled={disabled}
      onChange={handleChange}
      className={`border border-gray-300 rounded-lg text-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-(--color-gold) py-2 px-3 w-full ${disabled ? "bg-gray-200 cursor-not-allowed" : "bg-white"}`}
    />
  </div>
);

const SelectField = ({ label, name, value, options, handleChange }) => (
  <div className="flex flex-col">
    <label htmlFor={name} className="mb-1 para text-(--color-gold) font-bold text-sm">{label}</label>
    <select
      id={name}
      name={name}
      value={value}
      onChange={handleChange}
      className="border border-gray-300 rounded-lg text-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-(--color-gold) py-2 px-3 w-full bg-white"
    >
      <option value="" disabled>Select Gender</option>
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

const DisplayField = ({ label, value }) => (
  <div className="min-w-0">
    <p className="mb-1 para text-(--color-gold) font-bold text-sm">{label}</p>
    <p className="text-gray-500 text-sm font-medium wrap-break-word">{value || "Not Added"}</p>
  </div>
);

// ── Helpers ──

const formatDateToDisplay = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

// ── Main Component ──

const Profile = () => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const { user, setUser } = useContext(ShopContext);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", mobile: "", pincode: "", birthdate: "", gender: ""
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.isLoggedIn && !isEditing) {
      setFormData({
        firstName:  user.firstName  || "",
        lastName:   user.lastName   || "",
        email:      user.email      || "",
        mobile:     user.mobile     || "",
        pincode:    user.pincode    || "",
        birthdate:  user.birthdate ? formatDateToDisplay(user.birthdate) : "",
        gender:     user.gender     || "",
      });
    }
  }, [user, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

const handleSave = async () => {
    // Age Validation Logic
    if (formData.birthdate) {
      const today = new Date();
      const birthDate = new Date(formData.birthdate);
      
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      if (age < 13) {
        toast.error("You must be at least 13 years old to use ZYRO.");
        return;
      }
    }

    try {
      const { email, ...updateData } = formData;
      const response = await axios.patch(backendUrl + "/api/user/update-profile", updateData);
      if (response.data.success) {
        const fullUsername = `${formData.firstName} ${formData.lastName}`.trim();
        setUser({ ...user, ...formData, username: fullUsername });
        toast.success(response.data.message || "Details updated successfully");
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Profile update failed");
    }
  };

  const handleCancel = () => setIsEditing(false);
  const handleChangePassword = () => navigate("/forgot-password");

  const executeDelete = async () => {
    try {
      const response = await axios.delete(backendUrl + "/api/user/delete-profile");
      if (response.data.success) {
        toast.success(response.data.message);
        setTimeout(() => { window.location.href = "/"; }, 1500);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Account could not be deleted.");
    }
  };

  const handleLogout = async () => {
    try {
      const role = localStorage.getItem('role');
      const endpoint = role === 'admin' ? "/api/admin/logout" : "/api/user/logout";
      const { data } = await axios.post(backendUrl + endpoint);
      if (data.success) {
        localStorage.removeItem('role');
        setUser({ firstName: "", lastName: "", isLoggedIn: false });
        toast.success(data.message || "Logged out successfully");
        setTimeout(() => { window.location.href = '/'; }, 1500);
      }
    } catch (err) {
      toast.error("Logout failed. Please try again.");
      console.error("Logout error:", err);
    }
  };

  const handleDelete = () => {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#2e4a3e',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
      scrollbarPadding: false,
    }).then(result => result.isConfirmed && executeDelete());
  };

  const fields = [
    { label: "First Name",     name: "firstName", type: "text" },
    { label: "Last Name",      name: "lastName",  type: "text" },
    { label: "Email",          name: "email",     type: "email", disabled: true },
    { label: "Mobile Number",  name: "mobile",    type: "text" },
    { label: "Pincode",        name: "pincode",   type: "text" },
    { label: "Birthdate",      name: "birthdate", type: "date" },
    { label: "Gender",         name: "gender",    type: "select", options: ["Male", "Female", "Other"] },
  ];

  // ── Styles ──
  const primaryBtn = `
    flex-1 sm:flex-none px-5 py-2.5 bg-(--color-green) text-white title text-sm 
    rounded-xl hover:bg-(--color-gold) transition-all duration-200 ease-in-out 
    cursor-pointer whitespace-nowrap text-center min-w-0
  `;
  const deleteBtn = `
    flex-1 hover:bg-red-200 sm:flex-none px-5 py-2.5 border border-red-400 text-red-600 bg-gray-100
    rounded-xl hover:bg-red-50 transition-all font-medium text-sm 
    cursor-pointer whitespace-nowrap text-center min-w-0
  `;

  return (
    <div className="bg-white m-2 sm:m-4 lg:m-5 p-4 sm:p-5 lg:p-6 space-y-6 sm:space-y-8 border border-(--color-green)/20 shadow-2xl rounded-lg">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-lg sm:text-xl font-semibold text-(--color-green) title">
          Personal Information
        </h1>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className={`${primaryBtn} sm:flex-none w-full sm:w-auto`}>
            Edit Profile
          </button>
        )}
      </div>

      {/* Fields Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 text-sm">
        {fields.map(field =>
          isEditing ? (
            field.type === "select"
              ? <SelectField key={field.name} {...field} value={formData[field.name]} handleChange={handleChange} />
              : <Inputfield   key={field.name} {...field} value={formData[field.name]} handleChange={handleChange} />
          ) : (
            <DisplayField key={field.name} label={field.label} value={formData[field.name]} />
          )
        )}
      </div>

      {/* Action Buttons */}
      <div className="pt-2 flex flex-col sm:flex-row flex-wrap gap-3">
        {isEditing ? (
          <>
            <button onClick={handleSave}   className={`${primaryBtn} w-full sm:w-auto`}>Save Changes</button>
            <button onClick={handleCancel} className={`${primaryBtn} w-full sm:w-auto`}>Cancel</button>
          </>
        ) : (
          <>
            <button onClick={handleChangePassword} className={`${primaryBtn} w-full sm:w-auto`}>Change Password</button>
            <button onClick={handleLogout}          className={`${primaryBtn} w-full sm:w-auto`}>Logout</button>
            <button onClick={handleDelete}          className={`${deleteBtn}  w-full sm:w-auto`}>Delete Account</button>
          </>
        )}
      </div>

    </div>
  );
};

export default Profile;