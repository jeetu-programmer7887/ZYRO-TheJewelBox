import React from 'react';
import { ShieldCheck, Sparkles, Truck, RefreshCw } from 'lucide-react';

const ShopTheLook = () => {
  const features = [
    {
      icon: <Sparkles className="w-6 h-6 stroke-[1.5]" />,
      title: "Tarnish Free",
      description: "Wear it in the shower or gym without worry."
    },
    {
      icon: <ShieldCheck className="w-6 h-6 stroke-[1.5]" />,
      title: "Artificial Jewelry",
      description: "Premium materials for a lasting, luxurious glow."
    },
    {
      icon: <Truck className="w-6 h-6 stroke-[1.5]" />,
      title: "Fast Shipping",
      description: "Free delivery on all orders over $75."
    },
    {
      icon: <RefreshCw className="w-6 h-6 stroke-[1.5]" />,
      title: "Easy Returns",
      description: "30-day hassle-free exchange policy."
    }
  ];

  return (
    <section className="w-full bg-[#fbfbfb] border-y border-gray-100 my-10 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
          {features.map((item, index) => (
            <div 
              key={index} 
              className="flex  flex-col items-center text-center space-y-3 group px-4"
            >
              {/* Icon Container */}
              <div className="text-gray-800  group-hover:scale-110 transition-transform duration-300">
                {item.icon}
              </div>
              
              {/* Text Content */}
              <div className="space-y-1 title">
                <h3 className="text-xs  font-bold uppercase tracking-[0.15em] text-gray-900">
                  {item.title}
                </h3>
                <p className="text-sm para text-gray-500 font-light leading-relaxed max-w-45">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ShopTheLook;