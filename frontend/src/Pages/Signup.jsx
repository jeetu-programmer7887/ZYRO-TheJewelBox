import { useState, useContext, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import { useGoogleLogin } from "@react-oauth/google";
import { ShopContext } from "../config/ShopContext";

const Signup = () => {
  const navigate = useNavigate();

  // Get backend URL from environment variables
  const backendUrl = import.meta.env.VITE_BACKEND_URL; 

  const { setUser } = useContext(ShopContext);

  const [showPassword, setshowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    fname: "",
    lname: "",
    email: "",
    password: "",
  });

  // Toggle Password Visibility
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
      const response = await axios.post(backendUrl + "/api/user/register", {
        firstName: formData.fname,
        lastName: formData.lname,
        email: formData.email,
        password: formData.password,
      });

      if (response.data.success) {
        navigate("/verify-email", {
          state: {
            email: formData.email,
            showSuccessToast: true,
          },
        });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Signup failed");
    } finally {
      setIsLoading(false);
    }
  };

  const signupGoogle = useGoogleLogin({
    onSuccess: async (res) => {
      try {
        // Step 1: Get User Info from Google
        const userInfoResponse = await axios.get(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: { Authorization: `Bearer ${res.access_token}` },
            withCredentials: false,
          }
        );
        const userInfo = userInfoResponse.data;

        // Step 2: Register/Login with your backend
        const response = await axios.post(backendUrl + "/api/user/google", {
            firstName: userInfo.given_name,
            lastName: userInfo.family_name,
            email: userInfo.email,
            googleId: userInfo.sub, // 'sub' is the unique Google ID
        });
        
        if (response.data.success) {
          toast.success("Signup Successful! Enjoy Shopping");
          setUser({
            username: response.data.username,
            email : response.data.email,
            isLoggedIn: true,
          });

          setTimeout(() => {
            navigate("/");
          }, 2000);
        }
      } catch (error) {
        if (error.response?.data?.message) {
          toast.error(error.response.data.message);
        } else {
          toast.error("Failed to sign in with Google");
        }
        console.error("Google login error:", error);
      }
    },

    onError: (err) => {
      console.error("Google OAuth error:", err);
      toast.error("Failed to connect with Google");
    },
  });


  return (
    <>
      <div className="signup pt-35 md:pt-30 pb-12 md:pb-24 flex flex-col items-center gap-6 bg-(--color-lightgreen) min-h-screen">
        
        {/* Responsive Title Size */}
        <h1 className="title text-2xl md:text-3xl text-(--color-gold) text-center px-4">
          Signup with ZYRO
        </h1>
        
        <form
          onSubmit={handleSubmit}
          // RESPONSIVE WIDTHS: 
          className="bg-white other text-black p-6 md:p-8 rounded-2xl shadow-2xl space-y-5 w-[90%] sm:w-3/4 md:w-1/2 lg:w-1/3 mx-auto mb-10 md:mb-25"
        >
          {/* Google Auth Section */}
          <div className="googleAuth flex flex-col items-center space-y-6 md:space-y-10 justify-center mb-6 md:mb-10">
            <div className="customGoogleButton flex justify-center w-full">
              <button
                type="button"
                onClick={() => signupGoogle()}
                // Button made full width on mobile for better touch targets
                className="flex items-center justify-center gap-2 w-full md:w-auto px-6 py-2 rounded-full bg-white border border-gray-300 hover:bg-gray-100 transition-all hover:cursor-pointer"
              >
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google"
                  className="w-5 h-5"
                />
                <span className="text-gray-700 text-sm font-medium">
                  Sign in with Google
                </span>
              </button>
            </div>
            
            {/* Responsive Flexbox Layout for divider */}
            <div className="flex items-center justify-center w-full gap-2 px-2">
              {/* Left Line */}
              <div 
                className="h-0.75 flex-1 rounded-full" 
                style={{ background: "linear-gradient(270deg, var(--color-gold) 4.18%, rgba(196, 196, 196, 0) 77.28%)" }}
              ></div>
              
              {/* Text */}
              <span className="text-xs text-gray-400 whitespace-nowrap">
                  or continue with
              </span>
              
              {/* Right Line */}
              <div 
                className="h-0.75 flex-1 rounded-full" 
                style={{ background: "linear-gradient(90deg, var(--color-gold) 4.18%, rgba(196, 196, 196, 0) 77.28%)" }}
              ></div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">First Name</label>
            <input
              type="text"
              name="fname"
              value={formData.fname}
              onChange={handleChange}
              required
              disabled={isLoading}
              className="w-full border text-sm border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-(--color-gold)"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Last Name</label>
            <input
              type="text"
              name="lname"
              value={formData.lname}
              onChange={handleChange}
              disabled={isLoading}
              className="w-full border text-sm border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-(--color-gold)"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={isLoading}
              className="w-full border text-sm border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-(--color-gold)"
            />
          </div>

          {/* Password Field with Integrated Toggle Feature */}
          <div className="relative">
            <label className="block text-sm font-semibold mb-1">Password</label>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={isLoading}
              className="w-full border border-gray-300 text-sm p-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-(--color-gold)"
            />
            <button
              type="button"
              onClick={toggleShowPassword}
              disabled={isLoading}
              // Aligned with the input box (top-6 accounts for the label height + margin)
              className="absolute flex justify-center items-center top-6 right-0 w-15 h-11 cursor-pointer"
            >
              <img
                className="size-6"
                src={
                  showPassword
                    ? "/images/opened_eye.svg"
                    : "/images/closed_eye.svg"
                }
                alt="Toggle Password Visibility"
              />
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 rounded-lg text-white font-medium transition-all ease-in-out duration-500 
            ${
              isLoading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-(--color-green) hover:bg-(--color-gold) hover:cursor-pointer"
            }`}
          >
            {isLoading ? "SIGNING UP..." : "SIGN ME UP"}
          </button>
          
          <p className="para text-center pt-2">
            <span className="text-sm">
              Already have an account?
              <NavLink to={"/login"} className={"text-(--color-gold) font-semibold ml-1"}>
                LOG IN
              </NavLink>
            </span>
          </p>
        </form>
      </div>
    </>
  );
};

export default Signup;