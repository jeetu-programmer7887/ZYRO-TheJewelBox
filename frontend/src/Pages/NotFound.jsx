import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = ({ showCollections = true, showAssistance = true }) => {
  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Jost:wght@300;400;500&family=Lora:ital,wght@0,400;1,400&display=swap');
          
          @keyframes nf-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes nf-float { 0%, 100% { transform: translateY(0) rotate(45deg); } 50% { transform: translateY(-10px) rotate(45deg); } }
          @keyframes nf-halo { 0%, 100% { opacity: .35; transform: scale(1); } 50% { opacity: .1; transform: scale(1.35); } }
          @keyframes nf-sheen { 0% { background-position: -220% 0; } 100% { background-position: 220% 0; } }
          
          .font-cormorant { font-family: 'Cormorant Garamond', serif; }
          .font-jost { font-family: 'Jost', sans-serif; }
          .font-lora { font-family: 'Lora', serif; }
          
          .animate-rise { animation: nf-rise .9s cubic-bezier(.22,1,.36,1) both; }
          .animate-float { animation: nf-float 6s ease-in-out infinite; }
          .animate-halo { animation: nf-halo 4s ease-in-out infinite; }
          .animate-sheen { animation: nf-sheen 6s linear infinite; }
        `}
      </style>

      <div className="relative min-h-[75vh] flex items-center justify-center overflow-hidden bg-[#f9faf9] px-[clamp(20px,5vw,64px)] pt-32 pb-12 lg:pt-40 lg:pb-16 font-jost">
        
        <div className="absolute -top-[12%] left-1/2 -translate-x-1/2 w-[min(760px,120vw)] h-[min(760px,120vw)] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(198,166,100,.16) 0%, rgba(198,166,100,0) 65%)' }} />
        <div className="absolute -bottom-[18%] -right-[10%] w-[min(620px,100vw)] h-[min(620px,100vw)] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(46,74,62,.10) 0%, rgba(46,74,62,0) 68%)' }} />
        <div className="absolute inset-0 opacity-50 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(46,74,62,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(46,74,62,.045) 1px, transparent 1px)',
          backgroundSize: '96px 96px',
          maskImage: 'radial-gradient(ellipse at center, #000 25%, transparent 78%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, #000 25%, transparent 78%)'
        }} />

        <div className="relative z-10 w-full max-w-245 p-[clamp(36px,4vw,60px)] px-[clamp(20px,5vw,72px)] animate-rise">
          
          <div className="absolute top-0 left-0 w-[clamp(28px,6vw,56px)] h-[clamp(28px,6vw,56px)] border-t border-l border-[#c6a664]/55" />
          <div className="absolute top-0 right-0 w-[clamp(28px,6vw,56px)] h-[clamp(28px,6vw,56px)] border-t border-r border-[#c6a664]/55" />
          <div className="absolute bottom-0 left-0 w-[clamp(28px,6vw,56px)] h-[clamp(28px,6vw,56px)] border-b border-l border-[#c6a664]/55" />
          <div className="absolute bottom-0 right-0 w-[clamp(28px,6vw,56px)] h-[clamp(28px,6vw,56px)] border-b border-r border-[#c6a664]/55" />

          <div className="flex flex-col items-center text-center">
            
            <p className="mb-[clamp(28px,3vw,32px)] text-[clamp(9px,1.6vw,11px)] tracking-[0.42em] uppercase text-[#7e8180] font-normal pl-[0.42em]">
              Error 404 &nbsp;·&nbsp; Page Not Found
            </p>

            <div className="relative flex items-center justify-center w-[clamp(72px,12vw,90px)] h-[clamp(72px,12vw,90px)] mb-[clamp(20px,3vw,24px)]">
              <div className="absolute inset-0 rounded-full bg-[#c6a664]/20 animate-halo" />
              <div className="absolute inset-[clamp(10px,2vw,16px)] rounded-full border border-[#c6a664]/40" />
              <div className="w-[clamp(26px,4vw,32px)] h-[clamp(26px,4vw,32px)] border border-[#c6a664] animate-float shadow-[0_10px_30px_rgba(198,166,100,.35)]" style={{ background: 'linear-gradient(135deg, rgba(198,166,100,.28), rgba(255,255,255,.9))' }} />
            </div>

            <h1 className="m-0 font-cormorant font-light text-[clamp(88px,18vw,150px)] leading-[0.82] tracking-[clamp(2px,1.5vw,14px)] text-[#2e4a3e] pl-[clamp(2px,1.5vw,14px)]">
              4
              <span className="italic text-[#c6a664] animate-sheen" style={{
                background: 'linear-gradient(100deg, #b0955e 20%, #f0dcae 45%, #b0955e 70%)',
                backgroundSize: '220% 100%',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>0</span>
              4
            </h1>

            <div className="flex items-center gap-3.5 my-[clamp(24px,3vw,28px)] w-[min(280px,70%)]">
              <div className="flex-1 h-px bg-linear-to-r from-transparent to-[#c6a664]" />
              <div className="w-1.5 h-1.5 border border-[#c6a664] rotate-45 flex-none" />
              <div className="flex-1 h-px bg-linear-to-l from-transparent to-[#c6a664]" />
            </div>

            <h2 className="mb-[clamp(14px,2.5vw,20px)] font-cormorant italic font-normal text-[clamp(26px,4vw,36px)] leading-[1.15] text-[#2e4a3e] tracking-[0.01em]">
              A Missing Gem
            </h2>

            <p className="mb-[clamp(32px,3vw,32px)] max-w-[46ch] font-lora text-[clamp(13px,2vw,15px)] leading-[1.7] text-[#6a6d6c]">
              This piece has slipped from our digital vault. The page you were looking for is either no longer available, or never existed at all.
            </p>

            <div className="flex flex-wrap justify-center gap-[clamp(12px,2vw,18px)] w-full">
              <Link to="/" className="group relative overflow-hidden flex-1 basis-65 max-w-95 inline-flex items-center justify-center gap-2.5 px-[clamp(16px,3vw,32px)] py-[clamp(15px,2.6vw,19px)] bg-[#2e4a3e] text-[#f0dcae] text-[clamp(10px,1.8vw,11.5px)] font-medium tracking-[0.22em] uppercase border border-[#2e4a3e] transition-all duration-500 hover:shadow-[0_14px_34px_rgba(46,74,62,.28)] hover:text-white hover:bg-[#1f3329]">
                <span className="relative z-10">Return to Boutique</span>
                <span className="relative z-10 text-[13px] leading-none transition-transform duration-300 group-hover:translate-x-1">&#8594;</span>
              </Link>
              
              <Link to="/new-arrivals" className="flex-1 basis-65 max-w-95 inline-flex items-center justify-center px-[clamp(16px,3vw,32px)] py-[clamp(15px,2.6vw,19px)] border border-[#c6a664] text-[#2e4a3e] bg-transparent text-[clamp(10px,1.8vw,11.5px)] font-medium tracking-[0.22em] uppercase transition-all duration-450 hover:text-white hover:border-[#b0955e] hover:bg-[#c6a664]">
                Discover New Arrivals
              </Link>
            </div>

            {showCollections && (
              <div className="w-full max-w-155 mt-[clamp(48px,4vw,50px)] pt-[clamp(24px,3vw,24px)] border-t border-[#ece7de]">
                <p className="mb-[clamp(16px,2vw,20px)] text-[clamp(9px,1.5vw,10px)] tracking-[0.34em] uppercase text-[#a2a5a3] pl-[0.34em]">
                  Explore Collections
                </p>
                <div className="flex flex-wrap justify-center gap-[clamp(16px,3vw,32px)]">
                  {['Rings', 'Necklaces', 'Earrings', 'Bracelets'].map((cat) => (
                    <Link key={cat} to={`/category/${cat.toLowerCase()}`} className="font-cormorant text-[clamp(16px,2.5vw,18px)] text-[#4a4d4b] tracking-[0.05em] pb-1 border-b border-transparent transition-all duration-300 hover:text-[#b0955e] hover:border-[#c6a664]/45">
                      {cat}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {showAssistance && (
              <p className="mt-[clamp(28px,3vw,32px)] font-lora text-[clamp(11px,1.8vw,12.5px)] text-[#9a9d9b] tracking-[0.02em]">
                Need help finding something?{' '}
                <Link to="/contact" className="text-[#2e4a3e] whitespace-nowrap border-b border-[#c6a664]/50 pb-0.5 transition-colors duration-300 hover:text-[#b0955e]">
                  Speak with a consultant
                </Link>
              </p>
            )}

          </div>
        </div>
      </div>
    </>
  );
};

export default NotFound;
