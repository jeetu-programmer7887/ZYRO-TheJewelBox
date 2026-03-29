import { useState } from 'react';
import ReactPlayer from 'react-player';

const VideoSection = () => {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="video w-full h-[60vh] sm:h-[70vh] lg:h-screen relative bg-black group overflow-hidden">
      <div className="relative w-full h-full">
        <ReactPlayer
          height={"100%"}
          width={"100%"}
          controls={true}
          muted={true}
          loop={true}
          playing={playing}
          className='w-full h-full'
          src='https://prao.com/cdn/shop/files/quinn_tfn2esl2jbiegmup0dhllx4y.mp4'
          config={{ vimeo: { playerOptions: { background: 1 } } }}
        />
      </div>
    </div>
  );
};

export default VideoSection;