import { useState, useContext, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  const backendUrl = import.meta.env?.VITE_BACKEND_URL;

  const handleSendOtp = async () => {
    // Email not entered
    if (!email) return toast.error("Please enter your registered email");
    setIsLoading(true);

    try {
      const res = await axios.post(backendUrl + "/api/user/forgot-password", {
        email,
      });

      if (res.data.success) {
        toast.success(res.data.message);
        navigate("/reset-password", {
          state: {
            email: email,
          },
        });
      }
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || "Something went wrong. Try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSendOtp();
    }
  };

  return (
    <div className="verify flex flex-col items-center pt-35 md:pt-30 pb-12 md:pb-24 bg-(--color-lightgreen) min-h-screen">
      {/* Responsive Title */}
      <h1 className="title text-2xl md:text-3xl text-(--color-gold) text-center px-4">
        Reset Your Password!
      </h1>

      {/* Responsive Card Container */}
      <div className="bg-white text-black p-6 md:p-8 rounded-2xl shadow-2xl space-y-6 md:space-y-8 w-[90%] sm:w-3/4 md:w-1/2 lg:w-1/3 mx-auto mt-6 md:mt-10 mb-10">
        <p className="text-gray-700 text-center text-sm other leading-relaxed">
          Enter your registered email for verification.
        </p>

        <div className="space-y-2">
          <label className="block text-sm other">
            <span className="font-semibold">Email Address</span>
          </label>
          <input
            className="w-full border border-gray-300 text-sm p-3 other rounded-lg focus:outline-none focus:ring-1 focus:ring-(--color-gold)"
            type="email"
            value={email}
            required={true}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isLoading}
            placeholder="name@example.com"
          />
        </div>

        <button
          onClick={handleSendOtp}
          disabled={isLoading || !email}
          className={`w-full py-3 other rounded-lg text-white font-semibold transition-all duration-500 
            ${
              isLoading || !email
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-(--color-green) hover:bg-(--color-gold) cursor-pointer"
            }`}
        >
          {isLoading ? "SENDING..." : "SEND OTP"}
        </button>
      </div>
    </div>
  );
};

export default ForgotPassword;
