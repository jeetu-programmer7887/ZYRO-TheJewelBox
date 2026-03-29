import React from 'react';

const SkeletonCard = () => {
  return (
    <div className="animate-pulse flex flex-col gap-4 p-4 border border-gray-200 rounded-lg">
      {/* Product Image Placeholder */}
      <div className="bg-gray-300 h-64 w-full rounded-md"></div>
      
      {/* Title Placeholder */}
      <div className="h-4 bg-gray-300 rounded w-3/4"></div>
      
      {/* Price Placeholder */}
      <div className="flex gap-2">
        <div className="h-4 bg-gray-300 rounded w-1/4"></div>
        <div className="h-4 bg-gray-300 rounded w-1/4"></div>
      </div>
      
      {/* Rating Placeholder */}
      <div className="h-3 bg-gray-300 rounded w-1/2"></div>
    </div>
  );
};

export default SkeletonCard;