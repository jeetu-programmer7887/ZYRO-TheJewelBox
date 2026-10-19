// Cloudinary serves resized, modern-format (AVIF/WebP) images on the fly when
// transformation flags are inserted after "/upload/". Product photos are
// uploaded at full camera resolution, so asking for the width we actually
// render cuts each image from megabytes to tens of kilobytes.
export const optimizeImage = (url, width = 600) => {
  if (typeof url !== 'string' || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return url;
  }
  // Already transformed: leave it alone.
  if (/\/upload\/[^/]*(f_auto|q_auto|w_\d+)/.test(url)) return url;
  return url.replace('/upload/', `/upload/f_auto,q_auto,c_limit,w_${width}/`);
};
