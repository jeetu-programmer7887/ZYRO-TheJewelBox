import React from 'react'
import { NavLink } from 'react-router-dom'

const Cards = ({title, subtitle, route, src}) => (
    <NavLink to={route} className="group flex flex-col h-full">
      {/* Image Container with Hover Zoom */}
      <div className="relative aspect-square rounded-t-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-500 bg-gray-100">
        <img 
          className="image h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" 
          src={src} 
          alt={title} 
        />
        {/* Subtle Overlay on Hover only */}
        <div className="absolute inset-0 bg-black/5 group-hover:bg-black/20 transition-all duration-500 flex items-center justify-center">
            <span className="bg-white/90 text-black px-4 py-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full">
                Explore
            </span>
        </div>
      </div>

      {/* Text Section Below the Card */}
      <div className="text-center mt-1 p-1 rounded-b-2xl bg-gray-100">
        <h3 className="text-sm sm:text-lg font-bold tracking-[0.15em] text-gray-900 uppercase">
          {title}
        </h3>
        <p className="text-[10px] sm:text-xs text-gray-500 tracking-wide mt-1 uppercase opacity-80">
          {subtitle}
        </p>
        <div className="w-8 h-0.5 bg-(--color-gold) mx-auto mt-2 transition-all duration-300 group-hover:w-16"></div>
      </div>
    </NavLink>
)

const collections = [
  { 
    title: "Earrings",
    subtitle: "Timeless Dangles",
    route: "category/earrings",
    src: "https://images.unsplash.com/photo-1608508644127-ba99d7732fee?q=80&w=465&auto=format&fit=crop"
  },
  { 
    title: "Necklaces",
    subtitle: "Statement Pieces",
    route: "category/necklaces",
    src: "https://plus.unsplash.com/premium_photo-1681276170568-a5632dc01a77?q=80&w=387&auto=format&fit=crop"
  },
  { 
    title: "Bracelets",
    subtitle: "Elegant Wraps",
    route: "category/bracelets",
    src: "https://images.unsplash.com/photo-1692421098809-6cdfcfea289a?q=80&w=580&auto=format&fit=crop"
  },
  { 
    title: "Rings",
    subtitle: "Exquisite Bands",
    route: "category/rings",
    src: "https://plus.unsplash.com/premium_photo-1674700256686-ea9543aa450e?q=80&w=387&auto=format&fit=crop" 
  },
]

const Categories = () => {
  return (
    <div className="content lg:mb-30 relative px-4 sm:px-8">
      {/* Section Header */}
      <div className="text-center mt-20 mb-14">
        <p className="text-[11px] tracking-[0.3em] text-gray-400 mb-3 uppercase font-medium">Collections</p>
        <h1 className="text-3xl sm:text-5xl other text-(--color-gold) tracking-widest uppercase">
          Shop By Category
        </h1>
      </div>

      {/* Category Cards */}
      <div className="cardsContainer mx-auto w-full max-w-360 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-10 mb-20">
        {collections.map((collection) => (
          <Cards key={collection.title} {...collection} />
        ))}
      </div>
    </div>
  )
}

export default Categories