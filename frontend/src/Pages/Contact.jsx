import React, { useState } from "react";
import HeroSection from "../Components/HeroSection";
import axios from "axios";
import Swal from "sweetalert2";
import { Loader2, MapPin, Phone, Mail, ArrowRight } from "lucide-react";

const SUBJECTS = [
  "Order Inquiry",
  "Product Question",
  "Collaboration",
  "Feedback",
  "Other",
];

const Contact = () => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focused, setFocused] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const dataObject = Object.fromEntries(formData.entries());
    setIsSubmitting(true);

    try {
      const { data } = await axios.post(`${backendUrl}/api/admin/contact`, dataObject);
      if (data.success) {
        Swal.fire({
          title: "MESSAGE SENT",
          text: "The ZYRO Team has received your inquiry. We will get back to you soon.",
          icon: "success",
          confirmButtonColor: "#2e4a3e",
          iconColor: "#c6a664",
          scrollbarPadding: false,
          customClass: { title: "font-black uppercase italic tracking-tighter" },
        });
        e.target.reset();
      }
    } catch (error) {
      Swal.fire({
        title: "SUBMISSION FAILED",
        text: error.response?.data?.message || "Our servers are busy. Please try again later.",
        icon: "error",
        confirmButtonColor: "#2e4a3e",
        scrollbarPadding: false,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldClass = (name) =>
    `w-full px-4 py-3.5 bg-[#faf9f7] rounded-xl border text-sm transition-all duration-200 focus:outline-none resize-none ${
      focused === name
        ? "border-[#2e4a3e] shadow-[0_0_0_3px_rgba(46,74,62,0.08)]"
        : "border-stone-200"
    }`;

  const labelClass =
    "block text-[10px] font-bold uppercase tracking-[0.15em] text-stone-400 mb-1.5 ml-0.5";

  return (
    <>
      <HeroSection
        bgImage="https://images.pexels.com/photos/32797482/pexels-photo-32797482.jpeg"
        title={"Get In Touch With \nZYRO"}
        textsize={"60px"}
        topTitle={"55"}
        showTyping={false}
      />

      <section className="flex flex-col md:flex-row justify-center px-5 md:px-20 items-stretch gap-10 py-20 bg-(--font-lightPink)">

        {/* ── Left — Info Panel ── */}
        <div className="w-full md:w-2/5 flex flex-col justify-between">
          <div className="space-y-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c6a664]">
              Reach Out
            </p>
            <h2 className="title text-4xl leading-tight text-(--font-green)">
              We'd love to<br />hear from you.
            </h2>
            <p className="text-base text-(--font-gray) para leading-relaxed max-w-sm">
              Whether you have questions about our jewelry, your order, or
              collaborations — our concierge team is here to help.
            </p>
          </div>

          {/* Contact Details */}
          <div className="mt-10 space-y-4">
            {[
              { icon: MapPin, label: "Address", value: "123 ZYRO Lane, Mumbai, India" },
              { icon: Phone, label: "Phone", value: "+91 9876543210" },
              { icon: Mail, label: "Email", value: "zyrojewellery9395@gmail.com" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3.5 group">
                <div className="mt-0.5 w-9 h-9 rounded-full bg-[#2e4a3e]/10 flex items-center justify-center shrink-0 group-hover:bg-[#2e4a3e] transition-colors duration-200">
                  <Icon size={15} className="text-[#2e4a3e] group-hover:text-[#c6a664] transition-colors duration-200" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{label}</p>
                  <p className="text-sm text-stone-700 font-medium">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right — Form ── */}
        <div className="w-full md:w-3/6">
          <form
            onSubmit={handleSubmit}
            className="bg-[#F9F7F5] rounded-2xl shadow-sm border border-stone-100 p-8 md:p-10 space-y-5"
          >
            <div className="mb-2">
              <h3 className="text-lg font-bold text-(--color-gold) tracking-tight">Send a Message</h3>
              <p className="text-xs text-stone-400 mt-0.5">(All fields are required)</p>
            </div>

            {/* Name + Email row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Full Name</label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="Your full name"
                  onFocus={() => setFocused("name")}
                  onBlur={() => setFocused(null)}
                  className={fieldClass("name")}
                />
              </div>
              <div>
                <label className={labelClass}>Email Address</label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="jogndoe123@gmail.com"
                  onFocus={() => setFocused("email")}
                  onBlur={() => setFocused(null)}
                  className={fieldClass("email")}
                />
              </div>
            </div>

            {/* Subject dropdown */}
            <div>
              <label className={labelClass}>Subject</label>
              <select
                name="subject"
                required
                defaultValue=""
                onFocus={() => setFocused("subject")}
                onBlur={() => setFocused(null)}
                className={`${fieldClass("subject")} text-stone-600 appearance-none cursor-pointer`}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%232e4a3e' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 1rem center",
                }}
              >
                <option value="" disabled>Select a subject…</option>
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Message */}
            <div>
              <label className={labelClass}>Message</label>
              <textarea
                name="message"
                rows={5}
                required
                placeholder="Tell us how we can help you…"
                onFocus={() => setFocused("message")}
                onBlur={() => setFocused(null)}
                className={fieldClass("message")}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-[#2e4a3e] text-white font-semibold uppercase tracking-[0.15em] text-sm rounded-xl hover:bg-(--color-gold) transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer group"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Sending…
                </>
              ) : (
                <>
                  Send Message
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-200" />
                </>
              )}
            </button>
          </form>
        </div>
      </section>
    </>
  );
};

export default Contact;