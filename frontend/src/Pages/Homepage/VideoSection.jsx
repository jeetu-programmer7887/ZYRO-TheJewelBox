import { useEffect, useRef, useState } from 'react';

const VIDEO_SRC = 'https://prao.com/cdn/shop/files/quinn_tfn2esl2jbiegmup0dhllx4y.mp4';

// A plain <video> element is enough for a single mp4. It replaces
// react-player, which pulled ~1.5 MB of HLS/DASH streaming code into the
// home page. The source is only attached once the section scrolls near
// the viewport, so the video never competes with the initial page load.
const VideoSection = () => {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const [inView, setInView] = useState(false);
  // Once the source is attached it stays attached, so scrolling back up
  // resumes the video instead of re-downloading it.
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting) setShouldLoad(true);
      },
      { rootMargin: '200px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Play while visible, pause when scrolled away to save battery and data.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !shouldLoad) return;
    if (inView) {
      video.play().catch(() => { /* autoplay blocked: controls are shown */ });
    } else {
      video.pause();
    }
  }, [inView, shouldLoad]);

  return (
    <div ref={containerRef} className="video w-full h-[60vh] sm:h-[70vh] lg:h-screen relative bg-black group overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        src={shouldLoad ? VIDEO_SRC : undefined}
        controls
        muted
        loop
        playsInline
        preload="none"
        aria-label="ZYRO jewellery showcase video"
      />
    </div>
  );
};

export default VideoSection;
