import React, { useState } from "react";

const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Thank you for contacting us! We'll get back to you soon 💌");
    setFormData({ name: "", email: "", message: "" });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-8 rounded-2xl shadow-lg space-y-5"
    >
      <div>
        <label className="block text-sm font-semibold text-(--color-green)">Name</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-(--color-gold)"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-(--color-green)">Email</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-(--color-gold)"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-(--color-green)">Message</label>
        <textarea
          name="message"
          rows="4"
          value={formData.message}
          onChange={handleChange}
          required
          className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-(--color-gold)"
        ></textarea>
      </div>

      <button
        type="submit"
        className="w-full bg-(--color-green) text-white py-3 rounded-lg hover:bg-(--color-gold) transition hover:cursor-pointer"
      >
        Send Message
      </button>
    </form>
  );
};

export default ContactForm;
