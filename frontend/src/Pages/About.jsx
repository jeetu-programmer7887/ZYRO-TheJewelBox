import HeroSection from "../Components/HeroSection";
import { NavLink } from "react-router-dom";

const About = () => {
  return (
    <>
      {/* HeroSection For About Page  */}
      <HeroSection
        bgImage="https://images.pexels.com/photos/5116272/pexels-photo-5116272.jpeg"
        title={"About Us Crafting Elegance"}
        subtitles={["Discover the story behind ZYRO 💍"]}
        textsize={"70px"}
        topTitle={"55"}
        topSubtitles={"100"}
        showTyping={true}
        showCursor={false}
        typeSpeed={40}
        backSpeed={10}
      />

      {/* Brand Story  */}
      <section className="about-section bg-[#ffffff] px-6 md:px-10 py-12 lg:px-20 lg:py-20 flex flex-col lg:flex-row gap-10 items-center">
        <div className="w-full lg:w-1/2 order-1 lg:order-0">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-light title text-(--color-green) mb-6">
            Our Story
          </h2>
          <p className="text-gray-700 leading-relaxed text-base md:text-lg para">
            At <span className="text-(--color-gold)">ZYRO</span>, we believe
            jewelry is more than just an accessory — it’s a reflection of your
            personality. Born out of a passion for timeless beauty and modern
            craftsmanship, ZYRO curates exquisite artificial jewelry that
            combines elegance, durability, and affordability.
          </p>
          <p className="text-gray-700 leading-relaxed text-base md:text-lg mt-4 para">
            From everyday classics to statement pieces, each jewel is
            thoughtfully designed to make you feel confident, radiant, and truly
            yourself — because beauty begins with self-expression.
          </p>
        </div>
        <div className="w-full lg:w-1/2 order-2 lg:order-0">
          <img
            src="https://res.cloudinary.com/dhhvnpty5/image/upload/v1774671945/SM896482_prcoan.jpg"
            alt="Our Craft"
            className="rounded-2xl shadow-lg object-cover w-full h-75 md:h-100"
          />
        </div>
      </section>

      {/* Our Mission  */}
      <section className="values-section py-12 px-6 md:px-10 lg:py-20 lg:px-24 text-center bg-[#fcfcfc]">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-light text-(--color-green) title mb-10">
          Our Promise
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
          <div className="p-6 rounded-2xl shadow-md hover:shadow-lg transition-all bg-white">
            <h3 className="text-xl md:text-2xl font-semibold mb-3 text-(--color-gold) other">
              Quality Craftsmanship
            </h3>
            <p className="text-gray-600 para text-sm md:text-base">
              Every piece is designed with precision and made to last, using the
              finest materials.
            </p>
          </div>
          <div className="p-6 rounded-2xl shadow-md hover:shadow-lg transition-all bg-white">
            <h3 className="text-xl md:text-2xl font-semibold mb-3 text-(--color-gold) other">
              Affordable Luxury
            </h3>
            <p className="text-gray-600 para text-sm md:text-base">
              We make elegance accessible to everyone, without compromising on
              beauty or quality.
            </p>
          </div>
          <div className="p-6 rounded-2xl shadow-md hover:shadow-lg transition-all bg-white md:col-span-2 lg:col-span-1">
            <h3 className="text-xl md:text-2xl font-semibold mb-3 text-(--color-gold) other">
              Customer Delight
            </h3>
            <p className="text-gray-600 para text-sm md:text-base">
              Your satisfaction is our sparkle — we’re dedicated to making every
              experience special.
            </p>
          </div>
        </div>
      </section>

      {/* Our Team  */}
      <section className="team-section bg-[#ffffff] px-6 py-12 lg:px-24 lg:py-20 text-center ">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-light text-(--color-green) mb-10 title">
          Meet Our Team
        </h2>
        {/* Changed gap-100 to responsive gap because 100 is extremely large for mobile/standard tailwind */}
        <div className="flex flex-col md:flex-row justify-center gap-10 md:gap-20 lg:gap-x-96 items-center">
          <div className="team-card">
            <img
              src="https://res.cloudinary.com/dhhvnpty5/image/upload/v1773340524/Jeetu_pic2_iei6ga.png"
              className="rounded-full w-32 h-32 md:w-40 md:h-40 mx-auto object-cover"
              alt="Jeetu Prasad"
            />
            <h3 className="text-lg md:text-xl mt-4 text-(--color-gold) title">
              Jeetu Prasad
            </h3>
            <p className="text-gray-600 para">Founder & Marketing Head</p>
          </div>

          <div className="team-card">
            <img
              src="/images/partner2.png"
              className="rounded-full w-32 h-32 md:w-40 md:h-40 mx-auto object-cover"
              alt="Mayuri Pasi"
            />
            <h3 className="text-lg md:text-xl mt-4 text-(--color-gold) title">
              Mayuri Pasi
            </h3>
            <p className="text-gray-600 para">Founder & Designer</p>
          </div>
        </div>
      </section>

      {/* Closing Section  */}
      <section className="cta-section bg-(--color-green) text-white text-center py-12 lg:py-20 px-4">
        <h2 className="text-3xl md:text-4xl mb-4 title">
          Ready to Shine with ZYRO?
        </h2>
        <p className="text-base md:text-lg mb-8 para">
          Explore our exclusive collection and find your perfect match today.
        </p>
        <NavLink to="/">
          <button className="bg-(--color-gold) hover:bg-yellow-500 text-white px-6 py-3 md:px-8 md:py-3 rounded-full text-base md:text-lg cursor-pointer other transition-colors">
            Shop Now
          </button>
        </NavLink>
      </section>
    </>
  );
};

export default About;
