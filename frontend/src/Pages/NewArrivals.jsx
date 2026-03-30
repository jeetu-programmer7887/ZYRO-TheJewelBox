import { useContext } from 'react'
import HeroSection from '../Components/HeroSection'
import { ShopContext } from '../config/ShopContext'
import SkeletonCard from '../Components/Skeleton'
import Cards from '../Components/Cards'

const NewArrivals = () => {
  const {newArrivals} = useContext(ShopContext);

  return (
    <>
    <div className="relative">
    <HeroSection
      bgImage="./images/Banner.jpg"
      title={"NEW ARRIVALS"}
      subtitles={["Elevate Your Living Space.",
    "Discovery Our Newest Treasures.",
    "Crafted for the Modern Home."]}
      topTitle={"60"}
      showTyping={true}
      showCursor={true}
      typeSpeed={40}
      backSpeed={20}/>
    </div>

      <div className="px-10 mt-20 py-5 ">
        <div className="text-center mb-12 px-4">
        <p className="text-sm tracking-widest text-gray-400 title mb-3">BROWSE</p>
        <div className="text-center tracking-widest text-4xl w-full  text-(--color-gold)  font-cinzel ">NEW <span className='para'>ARRIVALS COLLECTION</span> </div>
        </div>
      </div>

   
      <div className="cardsContainer mx-auto w-full max-w-360 px-2 md:px-8 lg:px-6 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-20">
          {newArrivals?.length > 0 ? (
            newArrivals.map((item, index) => (
              <Cards
                key={item._id || index}
                product={{
                  _id: item._id,
                  id: item.slug,
                  title: item.title,
                  hoverImage: item.images?.[1],
                  image: item.thumbnail || item.images?.[0],
                  price: item.price,
                  variants: item.variants,
                  originalPrice: item.comparePrice,
                  discount: item.comparePrice
                    ? Math.round(((item.comparePrice - item.price) / item.comparePrice) * 100)
                    : 0
                }}
              />
            ))
          ) : (
            // Loading effect with 8 skeleton cards
            Array.from({ length: 8 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))
          )}
        </div>
     
    </>
  )
}

export default NewArrivals