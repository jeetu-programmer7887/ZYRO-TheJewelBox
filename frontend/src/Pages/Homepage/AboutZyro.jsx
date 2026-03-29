import React from 'react'
import ShopTheLook from './ShopTheLook'
import VideoSection from './VideoSection';

const AboutZyro = () => {
  return (
    <>
   <div className="video mx-10 my-5   ">
        <p className='font-cinzel text-xl py-5 mb-5 space-y-2  items-center justify-center flex flex-col'><span className='lg:text-4xl tracking-widest'> All over India </span><span className='lg:text-3xl italic text-(--color-gold)'>Our story in motion</span> </p>
        <VideoSection/>
        <ShopTheLook/>
        
     </div>
     
    </>
  )
}

export default AboutZyro