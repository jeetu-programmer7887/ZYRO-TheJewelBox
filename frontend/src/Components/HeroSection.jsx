import { clamp } from 'framer-motion';
import { useState, useEffect } from 'react';

// --- Internal Typewriter Component ---
const Typewriter = ({ strings = [], typeSpeed = 50, backSpeed = 30, loop = true, showCursor = true }) => {
  const [text, setText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopIdx, setLoopIdx] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(typeSpeed);

  useEffect(() => {
    if (!strings.length) return;

    const handleTyping = () => {
      const i = loopIdx % strings.length;
      const fullText = strings[i];

      setText(isDeleting 
        ? fullText.substring(0, text.length - 1) 
        : fullText.substring(0, text.length + 1)
      );

      setTypingSpeed(isDeleting ? backSpeed : typeSpeed);

      if (!isDeleting && text === fullText) {
        setTimeout(() => setIsDeleting(true), 1500); 
      } else if (isDeleting && text === '') {
        setIsDeleting(false);
        setLoopIdx((prev) => prev + 1);
      }
    };

    const timer = setTimeout(handleTyping, typingSpeed);
    return () => clearTimeout(timer);
  }, [text, isDeleting, loopIdx, strings, typeSpeed, backSpeed]);

  return (
    <span>
      {text}
      {showCursor && <span className="animate-pulse ml-1 font-normal">|</span>}
    </span>
  );
};

const HeroSection = ({
  bgImage,
  title,
  subtitles = [],
  textsize, 
  topTitle = 30, 
  showTyping,
  showCursor,
  typeSpeed,
  backSpeed,
}) => {
  return (
    // CHANGE 1: Changed mobile height to h-[60vh] (was 80vh). 
    // Desktop remains md:h-[105vh].
    <div className="HeroSection relative w-full h-[60vh] md:h-[105vh] bg-amber-50 overflow-hidden">
      
      {/* --- Image Section --- */}
      <div className="absolute inset-0 w-full h-full">
        <img
          src={bgImage}
          alt="Hero Background"
          className="w-full h-full object-cover object-center md:object-center" 
        />
      </div>

      {/* --- Text Section --- */}
      <div
        className="textSection absolute z-10 px-6 md:px-0 w-9/10 md:w-2/3 lg:w-full"
        style={{ 
            top: `${topTitle}%`, 
            left: 0,
        }}
      >
       <div className="md:pl-20 lg:pl-50 lg:w-11/12 md:w-2xl flex flex-col justify-center h-full">
            {/* Title */}
          <h1
            className="animate-slideDown para text-(--color-green) font-serif whitespace-normal wrap-break-word leading-tight [font-size:var(--title-mob)]
            md:[font-size:var(--title-md)]
              lg:[font-size:var(--title-lg)]"
            style={{  
              // '--max-size' : textsize || '4rem',
              '--title-mob' : '2rem',
              '--title-md' : '2.5rem',
              '--title-lg' : textsize || '4rem',
              // fontSize : clamp("2rem","1.5vw",textsize) || '4rem'
            }}
          >
            {title}
          </h1>

            {/* Subtitles */}
            <div className="text-(--font-black) title mt-3 md:mt-5 relative">
              <div className="text-sm md:text-xl lg:text-xl min-h-8">
                {showTyping ? (
                  <Typewriter
                    strings={subtitles}
                    typeSpeed={typeSpeed}
                    backSpeed={backSpeed}
                    showCursor={showCursor}
                  />
                ) : (
                   <span>{subtitles[0]}</span>
                )}
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;