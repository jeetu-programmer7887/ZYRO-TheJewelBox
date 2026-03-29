import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IoSparklesOutline, IoArrowForward } from "react-icons/io5";

const AiSection = () => {
  const navigate = useNavigate();

  return (
    <section className="w-full py-12 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
   
        {/* <p className='font-cinzel text-4xl py-4 '>Featuring</p> */}
        <div className="relative rounded-[2.5rem] bg-(--color-green) min-h-95 lg:h-105 flex flex-col lg:flex-row items-center overflow-hidden shadow-xl">
          
   
          <div className="w-full lg:w-3/5 p-8 lg:p-16 z-10 text-white flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-px w-8 bg-(--color-gold)"></span>
              <span className=" text-(--color-gold) tracking-[0.2em] text-sm uppercase">
                AI Innovation
              </span>
            </div>

            <h2 className="font-cinzel text-3xl lg:text-5xl mb-4 leading-tight">
              Personal <span className="italic text-(--color-gold)">Style Expert</span>
            </h2>

            <p className="text-stone-300 font-light para text-2sm leading-relaxed mb-8 max-w-sm">
              Discover jewelry that perfectly complements your outfit silhouette and skin tone using ZYRO’s advanced analysis.
            </p>

            {/* CTA Button: Sleeker sizing */}
            <button 
              onClick={() => navigate('/ai-stylist')}
              className="group flex items-center gap-3 bg-white text-black px-6 py-3 rounded-full text-sm para hover:cursor-pointer tracking-widest uppercase hover:bg-(--color-gold) hover:text-white transition-all duration-300 w-fit shadow-lg"
            >
              Enter Studio
              <IoArrowForward className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Right Side: Visual Image and Mini-Expert Box */}
          <div className="w-full lg:w-2/5 h-48 lg:h-full relative overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=2070&auto=format&fit=crop" 
              alt="Jewelry" 
              className="absolute inset-0 w-full h-full object-cover grayscale-20 hover:grayscale-0 transition-all duration-700"
            />
            
            {/* The Floating Box: Scaled down to match new section height */}
            <div className="absolute bottom-6 right-6 lg:bottom-10 lg:right-10 w-52 backdrop-blur-md bg-white/10 border border-white/20 p-4 rounded-2xl shadow-2xl animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-(--color-gold) flex items-center justify-center shrink-0">
                  <IoSparklesOutline className="text-white text-lg" />
                </div>
                <div>
                  <p className="text-white font-cinzel text-[10px] tracking-widest">Expert Active</p>
                  <p className="text-white/60 text-[8px] uppercase">Ready to Scan</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AiSection;