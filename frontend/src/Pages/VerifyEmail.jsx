import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { useContext } from "react";
import { ShopContext } from "../config/ShopContext";
import { completeLogin } from "../Utility/auth";

const VerifyEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useContext(ShopContext);
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const email = location.state?.email;
  const showSuccessToast = location.state?.showSuccessToast;
  const toastShownRef = useRef(false);
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const [timer, setTimer] = useState(location.state?.needsResend ? 0 : 300);
  const [isExpired, setIsExpired] = useState(!!location.state?.needsResend);
  const [isResending, setIsResending] = useState(false);

  // No email in navigation state (e.g. page refreshed): start over
  useEffect(() => {
    if (!email) navigate("/signup", { replace: true });
  }, [email, navigate]);

  const handleResend = async () => {
    if (isResending) return;
    setIsResending(true);
    try {
      const { data } = await axios.post(backendUrl + "/api/user/resend-otp", { email, purpose: "verify" });
      toast.success(data.message || "A new code has been sent");
      setOtp("");
      setIsExpired(false);
      setTimer(data.otpExpiresIn || 300);
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't resend the code");
    } finally {
      setIsResending(false);
    }
  };

  const handleVerify = async () => {
    if (isVerifying) return;
    setIsVerifying(true);
    try {
      const response = await axios.post(backendUrl + "/api/user/verify-email", {
        email,
        otp,
      });

      if (response.data.success) {
        toast.success("Signup Successful! Enjoy Shopping");
        completeLogin({ role: "user", data: response.data, setUser, navigate, destination: "/" });
      }
    } catch (error) {
      const message = error.response?.data?.message || "Verification failed";
      toast.error(message);
      // Code burned or expired: let them request a new one right here
      if (/expired|Too many/i.test(message)) {
        setIsExpired(true);
        setTimer(0);
      }
      setOtp("");
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    if (showSuccessToast && !toastShownRef.current) {
      toastShownRef.current = true;
      toast.success("Verification code sent to your email");
    }
  }, [showSuccessToast]);

  // Auto submit the otp
  useEffect(() => {
    if (otp.length === 6 && !isExpired && !isVerifying) {
      handleVerify();
    }
  }, [otp]);

  // TIMER LOGIC
  useEffect(() => {
    if (timer <= 0) {
      setIsExpired(true);
      return;
    }

    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer, navigate]);

  return (
    <>
      <div className="verify flex flex-col items-center pt-24 md:pt-30 pb-12 md:pb-24 bg-(--color-lightgreen) min-h-screen">
        <h1 className="title text-2xl md:text-3xl text-(--color-gold) text-center px-4">
          Verify Your Email
        </h1>

        {/* Responsive Container for Verification Card */}
        <div
          className="bg-white text-black p-6 sm:p-8 rounded-2xl shadow-2xl space-y-6 sm:space-y-8 w-[90%] sm:w-3/4 md:w-1/2 lg:w-1/3 mx-auto mt-6"
        >
          <p className="text-gray-700 text-center text-sm leading-relaxed">
            We have sent a 6-digit verification code to <br />
            <b className="text-(--color-gold) break-all">{email}</b>
          </p>

          {isExpired ? (
            <div className="text-center space-y-2">
              <p className="text-red-600 text-sm font-semibold">This code has expired.</p>
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="text-sm font-semibold text-(--color-green) underline underline-offset-4 disabled:opacity-50"
              >
                {isResending ? "Sending..." : "Send a new code"}
              </button>
            </div>
          ) : (
            <p className="text-center text-gray-600 text-sm font-semibold">
              Code expires in {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}
            </p>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-semibold">Enter OTP</label>
            <input
              className="border border-gray-300 semibold w-full p-3 rounded-lg text-center text-lg tracking-[0.4em] outline-none focus:ring-2 focus:ring-(--color-gold) transition"
              type="text"
              maxLength={6}
              inputMode="numeric"
              pattern="\d*"
              autoFocus={true}
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
              disabled={isExpired || isVerifying}
            />
          </div>

          <button
            disabled={true}
            className={`w-full py-3 rounded-lg text-white font-medium transition-all duration-500 cursor-not-allowed
          ${isVerifying ? "bg-(--color-green)" : "bg-gray-500"}`}
          >
            {isVerifying ? "Verifying your OTP..." : "Auto verification"}
          </button>
        </div>
      </div>
    </>
  );
};

export default VerifyEmail;