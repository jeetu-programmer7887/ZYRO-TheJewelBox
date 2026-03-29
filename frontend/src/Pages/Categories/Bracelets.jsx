import { useMemo, useContext, useState, useEffect, useRef } from 'react'
import HeroSection from '../../Components/HeroSection'
import Cards from '../../Components/Cards'
import SkeletonCard from '../../Components/Skeleton'
import { ShopContext } from '../../config/ShopContext'

const Bracelets = () => {
  const { allProducts } = useContext(ShopContext);

  const [visibleCount, setVisibleCount] = useState(12);
  const [isIncrementing, setIsIncrementing] = useState(false);
  const loaderRef = useRef(null);

  const allBracelets = useMemo(() => {
    return allProducts?.filter(item => item.category === 'Bracelet') || [];
  }, [allProducts]);

  const visibleBracelets = useMemo(() => {
    return allBracelets.slice(0, visibleCount);
  }, [allBracelets, visibleCount]);

  const loadMore = () => {
    if (visibleCount < allBracelets.length && !isIncrementing) {
      setIsIncrementing(true);
      setTimeout(() => {
        setVisibleCount(prev => prev + 12);
        setIsIncrementing(false);
      }, 1000);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < allBracelets.length) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [visibleCount, allBracelets.length]);

  return (
    <>
      <HeroSection
        bgImage="/images/Bracelet.png"
        title={"BRACELETS"}
        subtitles={["Wrap Your Wrist in Timeless Elegance"]}
        topTitle={"60"}
        showTyping={true}
        showCursor={true}
        typeSpeed={40}
        backSpeed={20}
      />

      <style>
        {`
          @keyframes infinity-flow {
            0% { stroke-dashoffset: 440; }
            100% { stroke-dashoffset: 0; }
          }
          .animate-infinity {
            animation: infinity-flow 2.5s linear infinite;
          }
        `}
      </style>

      <div className="content relative">
        <div className="text-center mt-20 mb-12 px-4">
          <p className="text-sm tracking-widest text-gray-400 title mb-3">BROWSE</p>
          <h1 className="text-4xl sm:text-5xl other text-(--color-gold) tracking-widest uppercase">
            BRACELETS COLLECTION
          </h1>
        </div>

        <div className="cardsContainer mx-auto w-full max-w-360 px-2 md:px-8 lg:px-6 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {allBracelets.length > 0 ? (
            visibleBracelets.map((item, index) => (
              <Cards
                key={item._id || index}
                product={{
                  _id: item._id,
                  id: item.slug,
                  title: item.title,
                  hoverImage: item.images?.[1],
                  image: item.thumbnail || item.images?.[0],
                  price: item.price,
                  originalPrice: item.comparePrice,
                  variants: item.variants,
                  discount: item.comparePrice ? Math.round(((item.comparePrice - item.price) / item.comparePrice) * 100) : 0
                }}
              />
            ))
          ) : (
            Array.from({ length: 8 }).map((_, index) => <SkeletonCard key={index} />)
          )}
        </div>

        <div ref={loaderRef} className="flex flex-col items-center justify-center py-16">
          {isIncrementing && (
            <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-6">
              <div className="relative">
                <svg width="120" height="60" viewBox="0 0 100 50" className="text-(--color-green)">
                  <path d="M25,45 C5,45 5,5 25,5 C45,5 55,45 75,45 C95,45 95,5 75,5 C55,5 45,45 25,45 Z" fill="none" stroke="currentColor" strokeWidth="4" strokeOpacity="0.1" />
                  <path d="M25,45 C5,45 5,5 25,5 C45,5 55,45 75,45 C95,45 95,5 75,5 C55,5 45,45 25,45 Z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray="110 330" className="animate-infinity" />
                </svg>
              </div>
              <p className="text-sm font-semibold tracking-[0.2em] text-(--color-green) animate-pulse uppercase">Discovering more jewels...</p>
            </div>
          )}

          {!isIncrementing && visibleCount >= allBracelets.length && allBracelets.length > 0 && (
            <div className="text-center">
              <div className="h-px w-20 bg-gray-700 mx-auto mb-4"></div>
              <p className="text-gray-500 ">You have explored the entire collection.</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default Bracelets;