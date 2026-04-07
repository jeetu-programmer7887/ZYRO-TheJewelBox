import React, { useEffect ,useRef ,useContext , useState} from 'react'
import { NavLink } from 'react-router-dom'
import { ShopContext } from '../../config/ShopContext'
import { Link } from 'react-router-dom'
import SkeletonCard from '../../Components/Skeleton'


const Cards = ({title,image,price,id,originalPrice,discount}) => ( 
  
  
    <Link to={`/product/${id}`} className="newArrivalCard bg-white lg:h-[37vh] h-[30vh] sm:h-90 md:h-100 rounded-lg shadow-md flex flex-col transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-xl  hover:cursor-pointer">
        <div className="image flex-2 group rounded-t-lg  overflow-hidden">
          <img className="h-full w-full object-cover group-hover:scale-[1.06] rounded-t-lg transition-transform duration-500 ease-out " src={image} alt=""
          />
        </div>

        <div className="info my-5  items-center px-3 flex flex-col justify-between ">
          <p className="text-sm px-2.5 text-gray-800 font-semibold line-clamp-2  truncate w-45">
           {title}
          </p>
        <p className="text-gray-500 gap-2 flex text-sm text-center transition-all duration-300 "><span className=''>₹{price}</span><span className='text-green-600 font-bold'>SAVE {discount}%</span> </p>
        </div>
        </Link>  
)

const HNewArrivals = () => {
  const maskRef = useRef(null);
  const sectionRef = useRef(null);
  const productRef = useRef(null);
  const { newArrivals  } = useContext(ShopContext);
  

  useEffect(() => {
    if(!maskRef.current || !sectionRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if(entry.isIntersecting){
          maskRef.current.classList.add("reveal",)
          productRef.current.classList.add("show");
          maskRef.current.classList.remove("hide")
          observer.disconnect();
        }
      },{
        threshold:0.1
      }
    )

    observer.observe(sectionRef.current)
    return () => observer.disconnect();
  }, [])
  
  const renderProducts = (limit) => {
    if(newArrivals?.length > 0){
      return newArrivals?.slice(0,limit).map((item, index) => (
        <Cards
          key={item._id || index}
          id={item.slug}
          title={item.title}
          image={item.thumbnail}
          price= {item.price}
          originalPrice={item.comparePrice}
          discount={ item.comparePrice? Math.round(((item.comparePrice - item.price) / item.comparePrice) * 100): 0 }
        />
      ))
    }
    return Array.from({length:limit}).map((_,i)=> <SkeletonCard key={i}/>)
  }

  return (
    <>
    <section className='md:m-10 mb-5 md:h-full h-full lg:hidden '>
      <p className="text-3xl text-center sm:text-5xl other text-(--color-gold) tracking-widest uppercase mb-2">NEW ARRIVALS</p>
      
      <div className="w-full text-center  grid grid-cols-2 sm:grid-cols-2 gap-6 sm:gap-8 mb-2 p-6">
       {renderProducts(4)}
      </div>
      <div className="flex items-center justify-center">
        <NavLink to="/new-arrivals" className="px-10 bg-(--color-green) bottom-3 text-white py-3 rounded-lg ">View All New Arrivals →</NavLink>
      </div>
    </section>
   

    <section className='lg:m-10 hidden lg:block h-[60vh] relative overflow-hidden rounded-lg' ref={sectionRef}> 
    {/* Image overlay  */}
      <img className='w-full h-full absolute inset-0 object-cover z-20' src="https://plus.unsplash.com/premium_photo-1661645473770-90d750452fa0?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="" />
        <div className="text-center other absolute bottom-5 left-5 z-20">
          <h1 className="text-4xl  text-(--color-gold) tracking-widest font-bold newArrivalsTextBox">NEW ARRIVALS</h1>
      </div>

      {/* Mask */}
      <div ref={maskRef} className="mask absolute inset-0 z-30 bg-linear-to-r from-(--color-gold) via-yellow-50 to-white p-4 shadow-lg" />

      {/* Products Overlay  */}
      <div ref={productRef} className="products hide absolute px-10 py-16 flex justify- right-0 w-3/5 h-full z-40 ">
      <div className="newArrivalProducts  flex gap-6 justify-center">
         {renderProducts(3)}
        <NavLink to="/new-arrivals" className="newArrivalBtn  absolute px-10 bg-(--color-green) bottom-4 text-white py-2 rounded-lg hover:bg-(--color-darkgold) hover:cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg group-hover:-translate-0.5 group-hover:scale-[1.05]">View All New Arrivals →</NavLink>
        
      </div>
      </div>
      
    </section>
     </>
  )
}

export default HNewArrivals
