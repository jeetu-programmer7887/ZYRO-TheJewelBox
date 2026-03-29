import { useEffect ,useRef} from 'react'

const BrandStory = () => {
  const sectionRef = useRef(null)
  
  useEffect(() => {

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const lines = sectionRef.current.querySelectorAll(".brand_line");
        if (entry.isIntersecting) {
          lines.forEach((line, index) => {
            if (line.dataset.animated) return;

            line.dataset.animated = "true";
            line.style.animationDelay = index === 0 ? "0s" : `${index * 0.3}s`;
            line.classList.add(
              "animate__animated",
              index % 2 === 0
                ? "animate__fadeInLeft"
                : "animate__fadeInRight"
            );
          });
        }
      },
      { threshold: 0.15 }
    )

    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect();
  }, [sectionRef])


  return (
    <div className='relative py-5 md:py-10 lg:py-10 m-5 md:m-10 lg:m-10 md:min-h-[55vh] min-h-[50vh] lg:min-h-screen overflow-hidden '>

    <img className='absolute inset-0 h-full w-full rounded-xl object-cover py-5 md:py-10 lg:py-10' src="https://images.unsplash.com/photo-1620656798579-1984d9e87df7?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="brand story"/>  

    <div className="absolute inset-0 bg-black/40 z-10 my-5 lg:my-10 md:my-10 "></div>

    {/* Content  */}
    <div className="relative z-20 font-cinzel tracking-wide px-4 py-8 md:px-10 md:py-12  text-sm md:text-lg lg:text-2xl" ref={sectionRef}> 
        
        {/* ZYRO logo  */}
        <div className="image flex justify-end mb-6">
        <img className='invert w-25 md:w-35 lg:w-45' src="./images/darkH.png" alt="" />
        </div>
        
        {/* Mobile and tablet layout  */}
        <div className='flex flex-col gap-10 lg:block'>
          <p className='brand_line w-full md:w-1/2 lg:absolute lg:top-40 lg:left-20 lg:w-1/2 '>We make 
        <span className='highlight'> artificial jewellery </span>
        with a <span className='highlight'> focus on design and presence</span>
        </p> 
        
          <p className="brand_line w-full md:w-3/4 md:self-end lg:absolute lg:top-60 lg:right-20 lg:w-1/2">
            Designed for
            <span className="highlight"> occasions, outfits, and real moments</span>{" "}
            where details matter.
          </p>

          <p className="brand_line w-full md:w-3/4 lg:absolute lg:top-90 lg:left-20 lg:w-1/2">
            No <span className="highlight">heavy pieces</span>. No
            <span className="highlight"> overpricing</span>. Just designs that fit
            your lifestyle.
          </p>
        </div>
      </div> 
    </div>
  )
}

export default BrandStory