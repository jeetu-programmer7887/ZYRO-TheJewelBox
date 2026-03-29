import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { ShopContext } from '../../config/ShopContext';

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1633934542430-0905ccb5f050?q=80&w=725&auto=format&fit=crop";

const ReviewSection = () => {
  const [allReviews, setAllReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const { backendUrl } = useContext(ShopContext);

  //  Fetch all reviews from DB
  useEffect(() => {

    const fetchReviews = async () => {
      try {
        const { data } = await axios.get(`${backendUrl}/api/review/all-home`);
        if (data.success && data.reviews.length > 0) {
          setAllReviews(data.reviews);
        }
      } catch (err) {
        console.error('Failed to fetch reviews:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [backendUrl]);

  //  Split reviews into two tracks
  const leftReviews = allReviews.filter((_, i) => i % 2 === 0);
  const rightReviews = allReviews.filter((_, i) => i % 2 !== 0);

  const renderStars = (count) => "★".repeat(count) + "☆".repeat(5 - count);

  //  Map DB review to the shape your Sliders component expects
  const mapReview = (r) => ({
    id: r._id,
    rating: r.rating,
    image: r.image || r.userId?.profileImage || FALLBACK_IMAGE,
    review: r.review,
    name: r.userId?.firstName
      ? `${r.userId.firstName} ${r.userId.lastName || ''}`.trim()
      : 'Verified Customer',
  });

  const Sliders = ({ review }) => (
    <div className='bg-(--color-green) text-white text-sm para rounded-2xl lg:w-[90vh] lg:h-[28vh] md:w-[60vh] md:h-[20vh] p-4 flex gap-5'>
      <div className='h-full w-1/2'>
        <img
          className='object-cover border-2 border-white h-full w-full rounded-xl'
          src={review.image}
          alt=""
          onError={(e) => { e.target.src = FALLBACK_IMAGE; }}
        />
      </div>
      <div className="space-y-1 w-full">
        <p className='text-yellow-500'>{renderStars(review.rating)}</p>
        <div className="flex justify-between px-1">
          <p className='font-bold'>- {review.name}</p>
          <p className='text-(--color-gold) text-[13px] font-bold'>Verified Purchase</p>
        </div>
        <p className='h-[15vh] overflow-y-auto review-scroll pr-2'>"{review.review}"</p>
      </div>
    </div>
  );

  //  While loading or no reviews yet — show nothing (avoids layout flash)
  if (loading) return null;

  //  Need at least 2 reviews to show the section
  if (allReviews.length < 2) return null;

  const left = leftReviews.map(mapReview);
  const right = rightReviews.map(mapReview);

  return (
    <>
      {/* ── Desktop & Tablet ── */}
      <div className='overflow-hidden lg:m-10 lg:py-6 md:m-10 hidden md:block lg:block'>
        <p className='font-cinzel text-lg lg:text-4xl md:text-3xl mb-10'>
          Find What People are saying about ZYRO
        </p>

        {/* Track 1 → Left to Right */}
        <div className="relative overflow-hidden mb-8">
          <div className="track track-left flex gap-6">
            {[...left, ...left].map((r, i) => (
              <Sliders key={`left-${i}`} review={r} />
            ))}
          </div>
        </div>

        {/* Track 2 → Right to Left */}
        <div className="relative overflow-hidden">
          <div className="track track-right flex gap-6">
            {[...right, ...right].map((r, i) => (
              <Sliders key={`right-${i}`} review={r} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Mobile ── */}
      <div className="lg:hidden md:hidden mt-10 mb-10">
        <div className="flex flex-col items-center mb-10 px-6 text-center">
          <div className="h-0.5 w-15 bg-(--color-gold) mb-4"></div>
          <h2 className="font-cinzel text-xl tracking-widest text-gray-900 uppercase">
            Find What people say
            <span className="block text-sm font-sans tracking-[0.4em] text-gray-400 mt-1">about ZYRO</span>
          </h2>
        </div>

        <section className="flex flex-col gap-6 px-6">
          {allReviews.map((r, index) => {
            const review = mapReview(r);
            return (
              <div
                key={review.id || index}
                className={`flex flex-col gap-3 max-w-[90%] ${index % 2 === 0 ? 'self-start' : 'self-end'}`}
              >
                {/* Review Bubble */}
                <div className={`p-6 rounded-4xl shadow-sm border border-stone-100
                  ${index % 2 === 0
                    ? 'bg-stone-50 rounded-bl-none text-left'
                    : 'bg-white border-(--color-gold)/20 rounded-br-none text-left shadow-lg'
                  }`}>
                  <div className="flex gap-0.5 mb-3 text-[10px] text-yellow-500">
                    {renderStars(review.rating)}
                  </div>
                  <p className="text-sm leading-relaxed text-gray-700 font-medium">
                    {review.review}
                  </p>
                </div>

                {/* User Info */}
                <div className={`flex items-center gap-3 px-2 ${index % 2 !== 0 ? 'flex-row-reverse' : ''}`}>
                  <div className="relative">
                    <img
                      src={review.image}
                      className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-md"
                      alt={review.name}
                      onError={(e) => { e.target.src = FALLBACK_IMAGE; }}
                    />
                    <div className="absolute -bottom-1 -right-1 bg-green-600 text-white rounded-full p-0.5 border border-white">
                      <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">{review.name}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-tighter">Verified Client</p>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </>
  );
};

export default ReviewSection;