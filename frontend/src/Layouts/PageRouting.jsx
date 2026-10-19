import { Suspense } from "react";
import { Outlet, ScrollRestoration } from "react-router-dom";
import Navbar from "../Components/Navbar";
import Footer from "../Components/Footer";

// Shown while a lazily-loaded page chunk is downloading. Navbar and Footer
// stay on screen so navigation never flashes to a blank page.
const PageLoader = () => (
  <div className="min-h-[60vh] w-full flex items-center justify-center" role="status" aria-label="Loading">
    <div className="w-8 h-8 border-2 border-(--color-green) border-t-(--color-gold) rounded-full animate-spin" />
  </div>
);

export default function PageRouting() {
  return (
    <>
      {/* To start all the pages from top */}
      <ScrollRestoration />

      <Navbar />
      <main>
        <Suspense fallback={<PageLoader />}>
          <Outlet /> {/* This is where the child pages (Home, About, etc.) will render */}
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
