import { Bold } from 'lucide-react';
import {useEffect} from 'react'

const ReturnPolicy = () => {
  
  return (
    <>
      <div 
        className="returnPolicy 
          pt-24 md:pt-30 
          px-4 sm:px-8 md:px-12 lg:px-20 
          bg-gray-50 text-black min-h-screen 
          pb-12 md:pb-25"
      >
        <h1 
          // Responsive title size (text-2xl on mobile, text-3xl on desktop)
          className="text-2xl md:text-3xl title font-semibold text-center mb-8 md:mb-10 text-(--color-gold)"
        >
          Returns Policy
        </h1>
        
        {/* Content Section: Constrains width on large screens for readability */}
        <section 
          className="content para 
            text-base md:text-lg 
            leading-relaxed 
            space-y-6 md:space-y-8 
            max-w-4xl mx-auto" // Centers the content and limits width on desktop
        >
          <div>
          
          </div>
          <p> 
            At ZYRO, we strive to ensure that you are completely satisfied with your purchase.
            If you are not satisfied, we’re here to help.
          </p>

          <div className="bg-white p-5 rounded-lg shadow-sm">
            <h2 className='text-xl font-bold mb-2 text-(--color-green)'>Eligibility for Returns</h2>
            <p className="text-gray-700">
              You can request a return or exchange within <b>7 days</b> of receiving your order.
              To be eligible, your item must be <b>unused</b> and in the same condition you received it,
              with the original packaging intact.
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm">
            <h2 className='text-xl font-bold mb-2 text-red-600'>Non-returnable Items</h2>
            <ul className="list-disc list-inside text-gray-700 ml-4">
              <li>Customized jewelry pieces</li>
              <li>Gift cards</li>
              <li>Items marked as "Final Sale"</li>
            </ul>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold mb-2 text-(--color-gold)">Process for Return</h2>
            <p className="text-gray-700">
              To initiate a return, contact our support team at 
              <a href="mailto:zyrojewellery9395@gmail.com" className="text-(--font-green) font-medium underline ml-1">zyrojewellery9395@gmail.com</a>.
              Once your request is approved, you’ll receive instructions on how to return your product.
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold mb-2 text-(--color-gold)">Return Timeline</h2>
            <p className="text-gray-700">
              Once we receive and inspect your return, we’ll notify you of the status.
              Approved returns will be processed within <b>5–7 business days </b>
              to your original payment method.
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold mb-2 text-(--color-green)">Need Help?</h2>
            <p className="text-gray-700">
              If you have any questions, please contact our customer care team at 
              <a href="mailto:zyrojewellery9395@gmail.com" className="text-(--font-green) font-medium underline ml-1">zyrojewellery9395@gmail.com</a>.
            </p>
          </div>

        </section>
      </div>
    </>
  )
}

export default ReturnPolicy