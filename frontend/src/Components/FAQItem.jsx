import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const FAQItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="container border-b border-gray-200 py-4 transition-all duration-300">
        <button onClick={()=>setIsOpen(!isOpen)} className="w-full flex justify-between items-center text-left focus:outline-none">

        <span className="title text-lg text-(--color-green)  ">{question}</span>
        {isOpen? 
        <ChevronUp className="font-(--color-gold)"/>:<ChevronDown className="font-(--color-gold)"/>
      }
        </button>

      <div className={`overflow-hidden transition-all duration-500 ${
          isOpen ? "max-h-40 mt-6" : "max-h-0"
        }`}
      >
        <p className="para text-lg leading-relaxed">
          {answer}
        </p>
      </div>
      </div>
    </>
  );
};

export default FAQItem;