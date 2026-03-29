import { useState, useContext, useEffect } from "react"; 
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { ShopContext } from "../config/ShopContext";

const Login = () => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const { setUser } = useContext(ShopContext);

  const navigate = useNavigate();
  const location = useLocation();

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setshowPassword] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [timeLeft, setTimeLeft] = useState(90); 

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // --- Timer Logic ---
  useEffect(() => {
    let timer;
    if (isOtpSent && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      // Logic when timer expires
      toast.error("OTP expired. Please login again.");
      setIsOtpSent(false);
      setTimeLeft(90);
      setOtp("");
    }

    return () => clearInterval(timer);
  }, [isOtpSent, timeLeft]);

  // Helper to format seconds into MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const toggleShowPassword = () => {
    setshowPassword(!showPassword);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!isOtpSent) {
        const response = await axios.post(backendUrl + "/api/user/login", {
          email: formData.email,
          password: formData.password,
        });

        const { data } = response;

        if (data.isAdmin) {
          if (data.password) {
            toast.info("Verification code sent to your admin email.");
            setTimeLeft(90);
            setIsOtpSent(true);
          } else {
            toast.error(data.message);
          }
        } else if (data.success) {
          localStorage.setItem("role", "user");
          setUser({ username: data.username, email: data.email, isLoggedIn: true });
          callSuccessToast(data.message);
        }
      } else {
        const response = await axios.post(backendUrl + "/api/admin/verify", {
          email: formData.email,
          otp: otp,
        });

        const { data } = response;

        if (data.success) {
          localStorage.setItem("role", "admin");
          setUser({ username: "ADMIN PANEL", email: formData.email, isLoggedIn: true });
          callSuccessToast("Admin Verified Successfully", "/admin");
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const callSuccessToast = (message, targetLocation) => {
    toast.success(message || "Login Successful!", {
      position: "top-right",
      autoClose: 1000,
      theme: "light",
    });


    setTimeout(() => {
      const destination = location.state?.redirectTo || targetLocation || "/";
      window.location.href = destination;
    }, 1500);
  };

  const loginGoogle = useGoogleLogin({
    onSuccess: async (res) => {
      try {
        const userInfoResponse = await axios.get(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          { headers: { Authorization: `Bearer ${res.access_token}` }, withCredentials: false }
        );
        const userInfo = userInfoResponse.data;

        const response = await axios.post(backendUrl + "/api/user/google", {
          firstName: userInfo.given_name,
          lastName: userInfo.family_name,
          email: userInfo.email,
          isGoogleAuth: true,
          googleId: userInfo.sub,
        });

        if (response.data.success) {
          localStorage.setItem("role", "user");
          setUser({ username: response.data.username, email: response.data.email, isLoggedIn: true });
          callSuccessToast();
        }
      } catch (error) {
        toast.error("Failed to sign in with Google");
      }
    },
  });

  return (
    <div className="signup pt-35 md:pt-30 pb-12 md:pb-24 flex flex-col items-center gap-6 bg-(--color-lightgreen) min-h-screen">
      <h1 className="title text-2xl md:text-3xl text-(--color-gold) text-center px-4">
        {isOtpSent ? "Admin Verification" : "Login to ZYRO"}
      </h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white other text-black p-6 md:p-8 rounded-2xl shadow-2xl space-y-6 md:space-y-10 w-[90%] sm:w-3/4 md:w-1/2 lg:w-1/3 mx-auto mb-10 md:mb-25"
      >
        {!isOtpSent ? (
          <>
            <div className="googleAuth flex flex-col items-center space-y-6 md:space-y-10 justify-center mb-6 md:mb-10">
              <button
                type="button"
                onClick={() => loginGoogle()}
                className="flex items-center justify-center gap-2 w-full md:w-auto px-6 py-2 rounded-full bg-white border border-gray-300 hover:bg-gray-100 transition-all cursor-pointer"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-5 h-5" />
                <span className="text-gray-700 text-sm font-medium">Sign in with Google</span>
              </button>

              <div className="flex items-center justify-center w-full gap-2 px-2">
                <div className="h-0.75 flex-1 rounded-full" style={{ background: "linear-gradient(270deg, var(--color-gold) 4.18%, rgba(196,196,196, 0) 77.28%)" }}></div>
                <span className="text-xs text-gray-400 whitespace-nowrap">or continue with</span>
                <div className="h-0.75 flex-1 rounded-full" style={{ background: "linear-gradient(90deg, var(--color-gold) 4.18%, rgba(196,196,196, 0) 77.28%)" }}></div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 text-sm p-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-(--color-gold)"
              />
            </div>

            <div className="relative">
              <label className="block text-sm font-semibold mb-1">Password</label>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full border text-sm border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-(--color-gold)"
              />
              <button type="button" onClick={toggleShowPassword} className="absolute flex justify-center items-center top-6 right-0 w-15 h-11 cursor-pointer">
                <img className="size-6" src={showPassword ? "/images/opened_eye.svg" : "/images/closed_eye.svg"} alt="Toggle" />
              </button>
              <p className="para mt-3 text-left">
                <NavLink to="/forgot-password" size="sm" className="text-(--color-gold) text-sm hover:underline">Forgot your password?</NavLink>
              </p>
            </div>
          </>
        ) : (
          <div className="animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-semibold">Enter OTP</label>
              <span className={`text-sm font-mono ${timeLeft < 20 ? 'text-red-500 animate-pulse' : 'text-gray-500'}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
            <input
              type="text"
              maxLength="6"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              required
              className="w-full border border-gray-300 text-center tracking-widest text-lg p-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-(--color-gold)"
            />
            <p className="text-xs text-gray-500 mt-2 text-center">
              An OTP has been sent to <b>{formData.email}</b>
            </p>
            <button
              type="button"
              onClick={() => {
                setIsOtpSent(false);
                setTimeLeft(90);
              }}
              className="text-xs text-(--color-gold) mt-4 w-full text-center hover:underline cursor-pointer"
            >
              Back to Login
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-3 rounded-lg text-white font-medium transition-all ease-in-out duration-500 
          ${isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-(--color-green) hover:bg-(--color-gold) cursor-pointer"}`}
        >
          {isLoading ? "Processing..." : isOtpSent ? "Verify OTP" : "Continue to Login"}
        </button>

        {!isOtpSent && (
          <p className="para text-center pt-2">
            <span className="text-sm">
              New to ZYRO?{" "}
              <NavLink to="/signup" className="text-(--color-gold) font-semibold">Create an Account</NavLink>
            </span>
          </p>
        )}
      </form>
    </div>
  );
};

export default Login;