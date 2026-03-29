import { useEffect } from 'react'

const PrivacyPolicy = () => {

  return (
    <>
      <div 
        className="
          pt-24 md:pt-30 
          pb-12 md:pb-25 
          px-4 sm:px-8 md:px-12 lg:px-20 
          bg-gray-50 text-black 
          min-h-screen
        "
      >
        <h1 
          // Responsive Title Size
          className='text-3xl title text-center mb-8 md:mb-10 text-(--color-gold)'
        >
          Privacy Policy
        </h1>

        {/* Content Section: Applies max width and centers the text block */}
        <section 
          className='
            space-y-6 md:space-y-8 
            leading-relaxed 
            text-base md:text-lg para 
            max-w-4xl mx-auto'
        >
          <p>
            At <strong>ZYRO</strong>, your privacy is important to us. This Privacy Policy describes how we collect, use, and protect your personal information when you visit our website or make a purchase.
          </p>

          <div className="bg-white p-5 rounded-lg shadow-sm">
            <h2 className='text-xl mb-2 font-bold text-(--color-green)'>1. Information We Collect</h2>
            <p className="text-gray-700"> We may collect personal details such as your name, email address, phone number, shipping address, and payment information when you interact with our website.</p>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold mb-2 text-(--color-gold)">2. How We Use Your Information</h2>
            <ul className="list-disc list-inside text-gray-700 ml-4">
              <li>To process and deliver your orders</li>
              <li>To communicate with you regarding your purchases</li>
              <li>To improve our website, products, and services</li>
              <li>To send promotional offers and updates (only if you opt-in)</li>
            </ul>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold mb-2 text-(--color-green)">3. Data Protection</h2>
            <p className="text-gray-700">
              We implement strong security measures to protect your data. However, please note
              that no online transmission is 100% secure, and we cannot guarantee absolute safety.
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold mb-2 text-(--color-gold)">4. Sharing of Information</h2>
            <p className="text-gray-700">
              We do not sell or rent your personal information. We may share it only with trusted
              third-party service providers who help us operate our business (e.g., delivery partners, payment processors).
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold mb-2 text-(--color-green)">5. Cookies</h2>
            <p className="text-gray-700">
              Our website uses cookies to enhance your browsing experience. You can disable cookies
              in your browser settings, but some features may not function properly.
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold mb-2 text-(--color-gold)">6. Your Rights</h2>
            <p className="text-gray-700">
              You have the right to access, modify, or delete your personal data.
              To make a request, contact us at 
              <a href="mailto:zyrojewellery9395@gmail.com" className="text-(--font-green) font-medium underline ml-1">zyrojewellery9395@gmail.com</a>.
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold mb-2 text-(--color-green)">7. Policy Updates</h2>
            <p className="text-gray-700">
              We may update this Privacy Policy periodically. Changes will be reflected on this page
              with an updated effective date.
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold mb-2 text-(--color-gold)">8. Contact Us</h2>
            <p className="text-gray-700">
              If you have any questions about this policy, please contact us at 
              <a href="mailto:zyrojewellery9395@gmail.com" className="text-(--font-green) font-medium underline ml-1">zyrojewellery9395@gmail.com</a>.
            </p>
          </div>
        </section>
      </div>
    </>
  )
}

export default PrivacyPolicy