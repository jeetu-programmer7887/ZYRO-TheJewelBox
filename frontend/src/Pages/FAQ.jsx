import { useEffect } from "react";
import { NavLink } from "react-router-dom";
import FAQItem from "../Components/FAQItem";

const FAQ = () => {
  // Define the list of Frequently Asked Questions
  const faqs = [
    {
      question: "Do you sell real or artificial jewelry?",
      answer:
        "ZYRO specializes in high-quality artificial jewelry that looks and feels luxurious — perfect for special occasions.",
    },
    {
      question: "How can I place an order?",
      answer:
        "Simply browse through our collections, add your favorites to the cart, and complete your purchase securely through our checkout page.",
    },
    {
      question: "What are your shipping charges?",
      answer:
        "We provide free shipping across India for orders above ₹999. For smaller orders, a nominal delivery fee applies.",
    },
    {
      question: "Can I return or exchange a product?",
      answer:
        "Absolutely. You can initiate a return or exchange within 7 days of receiving your order, provided the product is unused and in its original packaging.",
    },
  ];

  return (
    <>
      <section
        className="faq-section bg-gray-50 min-h-screen 
          pt-24 md:pt-30 
          pb-12 md:pb-20 
          px-4 sm:px-8 md:px-12 lg:px-20" // Enhanced responsive padding
      >
        {/* Responsive Title: text-3xl on mobile, text-4xl on desktop, centered */}
        <h2 className="text-center text-3xl md:text-4xl other font-title text-(--color-gold) mb-8 md:mb-12">
          Frequently Asked Questions
        </h2>

        {/* Responsive Card/Container for FAQs */}
        <div
          className="max-w-4xl mx-auto 
            bg-white rounded-2xl shadow-xl 
            p-5 sm:p-8 md:p-10 
            space-y-4 md:space-y-5" // Adjusted spacing
        >
          {faqs.map((faq, index) => (
            // FAQItem is expected to be a controlled component
            <FAQItem key={index} question={faq.question} answer={faq.answer} />
          ))}
        </div>

        {/* Contact Section */}
        <div className="text-center mt-10 md:mt-12">
          <p className="other text-base md:text-lg text-(--color-gold)">
            Didn't find what you were looking for?
          </p>
          <NavLink to="/contact">
            <button
              className="bg-(--color-green) text-white 
                mt-4 md:mt-6 
                inline-block px-6 py-3 
                rounded-lg 
                hover:bg-(--color-gold) hover:cursor-pointer 
                transition-all duration-500 ease-in 
                text-sm md:text-base font-medium"
            >
              Contact Us
            </button>
          </NavLink>
        </div>
      </section>
    </>
  );
};

export default FAQ;
