import { Outlet, ScrollRestoration } from "react-router-dom";
import Navbar from "../Components/Navbar";
import Footer from "../Components/Footer";

export default function PageRouting() {
  return (
    <>
      {/* To start all the pages from top */}
      <ScrollRestoration /> 

      <Navbar />
      <main> 
        <Outlet /> {/* This is where the child pages (Home, About, etc.) will render */}
      </main>
      <Footer />
    </>
  );
}