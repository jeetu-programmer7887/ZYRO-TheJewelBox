import HeroSection from "../Components/HeroSection";
import Categories from "./Homepage/Categories";
import ReviewSection from "./Homepage/ReviewSection";
import BrandStory from "./Homepage/BrandStory";
import NewArrivals from "./Homepage/HNewArrivals";
import AboutZyro from "./Homepage/AboutZyro";
import AiSection from "./Homepage/AiSection";

function Home() {
  return (
    <>
      <HeroSection bgImage={"/images/img1.jpg"}
        title={"Embrace YourSelf With The Beauty Of Crystals"}
        subtitles={[
          "Where Elegance Meets Affordability 💍",
          "Discover Timeless Artificial Jewelry ✨",
          "Shine Every Day with ZYRO 💫",
          "Hand-picked designs • Lightweight • Everyday luxury"
        ]}

        showTyping={true}
        showCursor={true}
        typeSpeed={40}
        backSpeed={20}
      />

      <div className="">
        <div id="" className="sticky top-0 z-1 lg:mx-10 lg:p-5 ">
          <Categories />
        </div>

        <div id="" className="bg-white relative z-2  transition-transform ease-[cubic-bezier(0.22,1,0.36,1)] duration-700 ">
          <BrandStory />
          <NewArrivals />
          <AiSection />
          <ReviewSection />
          <AboutZyro />
        </div>
      </div>
    </>
  );
}

export default Home;