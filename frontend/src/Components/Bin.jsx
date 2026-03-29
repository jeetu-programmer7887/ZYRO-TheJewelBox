// Created for rechecking the code 
// Carousel Review Section 
import React, { useRef, useState, useEffect } from 'react'

const ReviewSection = () => {
  const sectionRef = useRef(null)
  const [index, setIndex] = useState(1)
  const [transition, setTransition] = useState(true)
  

  const reviews = [
    {
      id: 1,
      rating: 5,
      image:"https://images.unsplash.com/photo-1633934542430-0905ccb5f050?q=80&w=725&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      review: "I loved the product , it was exactly what I was looking for.",
      name: "Jamie Doe",
    },
    {
      id: 2,
      rating: 1,
      image:"https://images.unsplash.com/photo-1600721391776-b5cd0e0048f9?q=80&w=387&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      review: "Niceeeeeeeeeeee",
      name: "Ananya",
    },
    {
      id: 3,
      rating: 2,
      image:"https://images.unsplash.com/photo-1600427150683-348f588e815c?q=80&w=388&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      review: "I am literally obsessed with ZYRO! It’s like the best place ever to score super cute jewellery without breaking the bank. High Fashion for only ₹299, which is insane, but the quality is excellent. No regrets here! It's like getting a tiny present every time! Whether you're looking for party wear necklaces or everyday earrings, ZYRO has it all. You gotta check them out!",
      name: "Ankita Joshi",
    },
    {
      id: 4,
      rating: 3,
      image:"https://images.unsplash.com/photo-1597006354775-2955b15ec026?q=80&w=387&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      review: "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Reiciendis molestiae commodi accusamus autem, pariatur optio ipsam recusandae in ex debitis. Quos fugit in veritatis rerum doloribus laborum voluptate amet soluta.",
      name: "Anamika Sathe",
    },
    
      
  ]

  // For creating a loop for carousel
  const slides = [
  reviews[reviews.length - 1],
  ...reviews,
  reviews[0], 
]

  // Rendering the number of stars for rating
  const renderStars = (count) => {
    return "★".repeat(count) + "☆".repeat(5 - count);
  }

    // Autosliding the carousel 
  useEffect(() => {
  const interval = setInterval(() => {
    setIndex(prev => prev + 1)
  }, 4000)

  return () => clearInterval(interval)
}, [])

const next = () => {
  setIndex(prev => prev + 1)
}

const prev = () => {
  setIndex(prev => prev - 1)
}

  useEffect(() => {
  if (index === slides.length - 1) {
    setTimeout(() => {
      setTransition(false)
      setIndex(1)
    }, 700)
  }

  if (index === 0) {
    setTimeout(() => {
      setTransition(false)
      setIndex(slides.length - 2)
    }, 700)
  }
}, [index])

  useEffect(() => {
    if (!transition) {
      requestAnimationFrame(() => setTransition(true))
    }
  }, [transition])

  //Checking if the user scrolls to the review Section
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAnimate(true)
          observer.disconnect()
        }

      },
      { threshold: 0.5 }
    )

    if (sectionRef.current) observer.observe(sectionRef.current)

    return () => observer.disconnect()

  }, [])

  const ImageCarousel = ({ src }) => (
    <div className=" duration-700 ease-in-out" data-carousel-item>
      <img src={src} className="absolute inset-0 block h-full w-full object-cover -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2" alt="..." />
    </div>
  )

  
  return (
    <div ref={sectionRef} className='h-screen overflow-hidden relative lg:m-10 lg:py-10 lg:mb-20 '>
      {/* grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6  */}
      <p className='font-cinzel text-4xl mb-10'>Find What People are saying about ZYRO</p>

    
    <div className="  bg-black/5 mx-4 rounded-lg h-[30vw] relative overflow-hidden shadow-xl">
    
    <div className={`flex h-full ${
      transition ? "transition-transform duration-700 ease-in-out" : ""
      }`}
      style={{ transform: `translateX(-${index * 100}%)` }}>
        {slides.map((review, i) => {
          return (
          <div
            key={review.id}
            className="min-w-full flex items-center px-10"
          >

            <div key={review.id} className="w-1/3 h-90 flex  justify-center ">
              <img className='rounded-full object-cover w-full h-full' src={review.image} alt="" />
            </div>

            {/* info */}
            <div key={review.id} className="w-2/3  space-y-5 p-4 ">
              <p>{renderStars(review.rating)}</p>
              <div className='flex items-center justify-between'>
                <p className='text-xl title '><span className='font-semibold'>{review.name}</span></p>
                <p className='font-semibold text-green-600'>Verified Purchase</p>
              </div>
              <p className='h-[18vw] text-lg overflow-y-auto pr-2'>{review.review}</p>

            </div>
          </div>
        )
      })}
    </div>
    
    {/* LEFT BUTTON */}
    <button
      onClick={prev}
      className="absolute left-4 top-1/2  -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow"
    >‹</button>

    {/* RIGHT BUTTON */}
    <button
      onClick={next}
      className="absolute right-4 top-1/2  -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow"
    >
      ›
    </button>
    </div>
   </div>
  )
}

export default ReviewSection