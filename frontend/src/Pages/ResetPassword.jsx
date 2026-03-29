import { useState, useEffect } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

// Fallback for preview environment
const backendUrl = import.meta.env?.VITE_BACKEND_URL;

const ResetPassword = () => {
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState(1);
  const [timer, setTimer] = useState(90);
  const [isExpired, setIsExpired] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // States for Password Visibility
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const email = location.state?.email;

  // Toggle functions for password visibility
  const toggleShowNewPassword = () => setShowNewPassword(!showNewPassword);
  const toggleShowConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword);

  useEffect(() => {
    if (step !== 1) return;

    if (timer <= 0) {
      setIsExpired(true);
      toast.error("OTP expired! Redirecting to login...");
      setTimeout(() => navigate("/login"), 2000);
    }

    const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [timer, step, navigate]);

  // VERIFY OTP
  const handleVerifyOtp = async () => {
    if (!otp) return toast.error("Otp is required");

    setIsVerifying(true);
    try {
      const res = await axios.post(
        backendUrl + "/api/user/reset-password/verify-otp",
        { email, otp }
      );

      if (res.data.success) {
        toast.success("OTP Verified");
        setStep(2);
      }
    } catch (err) {
      const message = err.response?.data?.message || "Verification Failed";
      if (message.includes("OTP could not verified.")) {
        toast.error(message);
        setTimeout(() => navigate("/login"), 2000);
      } else {
        toast.error(message);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  // Auto-verify OTP when 6 digits are entered
  useEffect(() => {
    if (otp.length === 6 && !isExpired && !isVerifying && step === 1) {
      handleVerifyOtp();
    }
  }, [otp]);

  // RESET PASSWORD
  const handleResetPassword = async () => {
    if (!newPassword) return toast.error("Enter new password");
    if (!confirmPassword) return toast.error("Enter confirm password");
    if (newPassword !== confirmPassword) return toast.error("Passwords are different");

    try {
      const res = await axios.patch(backendUrl + "/api/user/reset-password", {
        email,
        newPassword,
      });

      if (res.data.success) {
        toast.success("Password updated successfully");
        navigate("/login");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <div className="verify flex flex-col items-center pt-35 md:pt-30 pb-12 md:pb-24 bg-(--color-lightgreen) min-h-screen">
      <h1 className="title text-2xl md:text-3xl text-(--color-gold) text-center px-4">
        Reset Password
      </h1>

      {/* Responsive Card Container */}
      <div className="bg-white text-black p-6 md:p-8 rounded-2xl shadow-2xl space-y-6 md:space-y-8 w-[90%] sm:w-3/4 md:w-1/2 lg:w-1/3 mx-auto mt-6 md:mt-10 mb-10">
        
        {/* STEP 1 → OTP Verification */}
        {step === 1 && (
          <>
            <p className="text-gray-700 text-center text-sm leading-relaxed">
              Enter the OTP sent to <br />
              <b className="text-(--color-gold)">{email}</b>
            </p>

            {/* Timer Display */}
            <p className="text-center text-red-600 text-lg font-semibold">
              Time left: {timer}s
            </p>

            <div className="space-y-2">
              <label className="block text-sm font-semibold">Enter OTP</label>
              <input
                className="border border-gray-300 semibold w-full p-3 rounded-lg text-center text-lg tracking-[0.4em]"
                type="text"
                maxLength={6}
                inputMode="numeric"
                pattern="\d*"
                autoFocus={true}
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                disabled={isExpired}
              />
            </div>

            <button
              disabled={true}
              className={`w-full py-3 rounded-lg text-white transition-all duration-500 cursor-not-allowed
                ${isVerifying ? "bg-(--color-green)" : "bg-gray-400"}`}
            >
              {isVerifying ? "Verifying your OTP..." : "Auto verification"}
            </button>
          </>
        )}

        {/* STEP 2 → New Password */}
        {step === 2 && (
          <>
            <p className="text-gray-700 text-center text-sm">
              OTP verified! Set your new password.
            </p>

            <div className="space-y-4">
              {/* New Password Field */}
              <div className="space-y-2 relative">
                <label className="block text-sm font-semibold">New Password</label>
                <input
                  className="w-full border border-gray-300 text-sm p-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-(--color-gold)"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={toggleShowNewPassword}
                  // Responsive positioning for the eye icon
                  className="absolute flex justify-center items-center top-7 md:top-[1.85rem] right-0 w-12 h-10 md:w-15 md:h-11 cursor-pointer"
                >
                   {/* Replace with your image tags in production */}
                   <img
                    className="size-5 md:size-6"
                    src={showNewPassword ? "/images/opened_eye.svg" : "/images/closed_eye.svg"}
                    alt="Toggle"
                  />
                </button>
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2 relative">
                <label className="block text-sm font-semibold">Confirm Password</label>
                <input
                  className="w-full border border-gray-300 text-sm p-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-(--color-gold)"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={toggleShowConfirmPassword}
                  className="absolute flex justify-center items-center top-7 md:top-[1.85rem] right-0 w-12 h-10 md:w-15 md:h-11 cursor-pointer"
                >
                  <img
                    className="size-5 md:size-6"
                    src={showConfirmPassword ? "/images/opened_eye.svg" : "/images/closed_eye.svg"}
                    alt="Toggle"
                  />
                </button>
              </div>
            </div>

            <button
              onClick={handleResetPassword}
              className="w-full py-3 rounded-lg text-white transition-all duration-500 bg-(--color-green) hover:bg-(--color-gold) cursor-pointer"
            >
              RESET PASSWORD
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;