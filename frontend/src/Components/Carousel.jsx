import { useState, useEffect } from "react";

export default function Carousel() {
    const reviews = [
        {id:1,
        
        src:"https://images.unsplash.com/photo-1531995811006-35cb42e1a022?q=80&w=870",
        review:"I Loved your product"
        }
        ,
        {id:2,
        src:"https://plus.unsplash.com/premium_photo-1687989651138-6f743f961dc2?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        review:"The product quality is excellent"
        },
        {id:3,
        src:"https://plus.unsplash.com/premium_photo-1740020241476-be2394113f0c?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        review:"I am very satisfied with the product"
        },
    ];

    const slides = [
        images[images.length - 1], // clone last
        ...images,
        images[0], // clone first
    ];



    const [index, setIndex] = useState(1);
    const [transition, setTransition] = useState(true);

    const next = () => setIndex((i) => i + 1);
    const prev = () => setIndex((i) => i - 1);

    useEffect(() => {
        if (index === slides.length - 1) {
            setTimeout(() => {
                setTransition(false);
                setIndex(1);
            }, 700);
        }

        if (index === 0) {
            setTimeout(() => {
                setTransition(false);
                setIndex(slides.length - 2);
            }, 700);
        }
    }, [index]);

    useEffect(() => {
        if (!transition) {
            requestAnimationFrame(() => setTransition(true));
        }
    }, [transition]);




    return (
        <div className="relative w-full h-[80vh] overflow-hidden">
            {/* <div
                className={`flex h-full border ${transition ? "transition-transform duration-700 ease-out" : ""
                    }`}
                style={{ transform: `translateX(-${index * 100}%)` }}
            >
                
                
            </div> */}
            <div className={`container flex  justify-between h-full${transition ? "transition-transform duration-700 ease-out" : ""
                    }`}
                style={{ transform: `translateX(-${index * 100}%)` }}>

            <div className="border  w-1/2 lg:p-5 bg-amber-100 h-full reviewText">
                <div className="rating flex  border justify-between">
                    <p>stars</p>
                    <p>Verified Purchase</p>
                </div>
                <p className="review">This is a great product. I highly recommend it.</p>
                <p className="userName">John Doe</p>
            </div>
            <div className="flex items-center border h-full w-1/2 bg-red-300">
                <img src="https://plus.unsplash.com/premium_photo-1740020241476-be2394113f0c?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="" />
            </div>
            </div>

              
                  
              

            <button onClick={prev} className="absolute left-4 top-1/2 border px-2 text-black">‹</button>
            <button onClick={next} className="absolute right-4 top-1/2 border px-2 text-black">›</button>
        </div>
    );
}
