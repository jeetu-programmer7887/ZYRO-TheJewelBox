import { useEffect } from 'react';

const ShippingPolicy = () => {

  return (
    <>
      <div 
        className="
          pb-12 md:pb-25 
          px-4 sm:px-8 md:px-12 lg:mt-20 mt-20  
          bg-gray-100 text-black 
          min-h-screen
        "
      >
        <h1 
          // Responsive Title Size
          className="text-3xl  pt-7 lg:pt-8 title text-center mb-8 md:mb-10 text-(--color-gold)"
        >
          Shipping Policy
        </h1>

        {/* Content Section: Applies max width and centers the text block */}
        <section 
          className="
            space-y-6 md:space-y-8 
            leading-relaxed 
            text-base md:text-lg para 
            max-w-4xl mx-auto"
        >
          <p>
            At <strong>ZYRO</strong>, we aim to ensure that your jewelry reaches you safely and on time. 
            Please review our Shipping Policy to understand how we handle deliveries.
          </p>

          <div className="bg-white p-5 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold mb-2 text-(--color-green)">1. Order Processing</h2>
            <p className="text-gray-700">
              Orders are processed within <strong>2–3 business days</strong> after payment confirmation. 
              You will receive an email confirmation once your order has been shipped.
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold mb-2 text-(--color-gold)">2. Shipping Charges</h2>
            <p className="text-gray-700">
              We offer <strong>free standard shipping</strong> on all orders above ₹999. 
              Orders below this amount may incur a nominal delivery charge depending on your location.
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold mb-2 text-(--color-green)">3. Delivery Time</h2>
            <p className="text-gray-700">
              Standard delivery typically takes <strong>5–7 business days</strong>, depending on your location. 
              Remote areas may require additional time. You will receive a tracking link once your order is dispatched.
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold mb-2 text-(--color-gold)">4. International Shipping</h2>
            <p className="text-gray-700">
              Currently, we only ship within India. International shipping options will be announced soon.
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold mb-2 text-(--color-green)">5. Delays or Issues</h2>
            <p className="text-gray-700">
              Delivery times may vary due to unforeseen factors such as weather conditions, courier delays, or holidays. 
              In case of significant delay, please contact our support team for assistance.
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold mb-2 text-(--color-gold)">6. Order Tracking</h2>
            <p className="text-gray-700">
              Once shipped, you will receive a tracking number via email or SMS. 
              You can use it to track your shipment’s progress in real time.
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold mb-2 text-(--color-green)">7. Lost or Damaged Packages</h2>
            <p className="text-gray-700">
              If your package arrives damaged or fails to arrive, please contact us immediately at 
              <a href="mailto:support@zyro.com" className="text-(--color-green) font-medium underline ml-1">support@zyro.com</a>. 
              We will work with the courier service to resolve the issue promptly.
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold mb-2 text-(--color-gold)">8. Contact Us</h2>
            <p className="text-gray-700">
              For any shipping-related inquiries, reach out to us at 
              <a href="mailto:support@zyro.com" className="text-(--color-green) font-medium underline ml-1">zyrojewellery9395@gmail.com</a>.
            </p>
          </div>
        </section>
      </div>
    </>
  )
}

export default ShippingPolicy