import { NavLink } from "react-router-dom";

const Footer = () => {
  const linkClass =
    "relative w-fit after:content-[''] after:absolute after:left-0 after:-bottom-0.5 after:h-[1px] after:w-0 after:bg-black after:transition-all after:duration-300 hover:after:w-full";

  return (
    <div className="w-full bg-(--color-lightgray) text-black py-12 px-6">
      <div
        className="max-w-7xl mx-auto grid gap-12 
                      sm:grid-cols-2 
                      lg:grid-cols-3"
      >
        {/* ABOUT */}
        <div className="flex flex-col gap-4">
          <h1 className="font-bold text-lg title"><span className="font-semibold">About Us</span></h1>
          <p className="text-base para">
            ZYRO isn't just crystals, it's passion poured into every ornament.
            Our dedicated team of over 108 full-time experts, designers, and
            stylists collaborate meticulously to deliver unparalleled quality
            and unmatched customer satisfaction.
          </p>
        </div>

        {/* SHOP */}
        <div className="flex flex-col gap-4 sm:ml-20">
          <h1 className="font-bold text-lg title"><span className="font-semibold">Shop Now</span></h1>
          <ul className="flex flex-col gap-2 para text-base">
            <NavLink to="/category/earrings" className={linkClass}>
              <li>Earrings</li>
            </NavLink>
            <NavLink to="/category/necklaces" className={linkClass}>
              <li>Necklace</li>
            </NavLink>
            <NavLink to="/category/rings" className={linkClass}>
              <li>Ring</li>
            </NavLink>
            <NavLink to="/category/bracelets" className={linkClass}>
              <li>Bracelet</li>
            </NavLink>
          </ul>
        </div>

        {/* HELP */}
        <div className="flex flex-col gap-4">
          <h1 className="font-bold text-lg title"><span className="font-semibold">Help</span></h1>
          <ul className="flex flex-col para gap-2 text-base">
            <NavLink to="/about" className={linkClass}>
              <li>About Us</li>
            </NavLink>
            <NavLink to="/contact" className={linkClass}>
              <li>Contact Us</li>
            </NavLink>
            <NavLink to="/faq" className={linkClass}>
              <li>FAQs</li>
            </NavLink>
            <NavLink to="/returnPolicy" className={linkClass}>
              <li>Returns Policy</li>
            </NavLink>
            <NavLink to="/privacyPolicy" className={linkClass}>
              <li>Privacy Policy</li>
            </NavLink>
            <NavLink to="/shippingPolicy" className={linkClass}>
              <li>Shipping Policy</li>
            </NavLink>
          </ul>
        </div>
      </div>

      {/* COPYRIGHT */}
      <div className="mt-12 flex items-center justify-center text-center text-sm">
        Copyright ⓒ 2025 ZYRO. All rights reserved.
      </div>
    </div>
  );
};

export default Footer;
