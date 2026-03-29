const Tooltip = ({ text, children }) => {
  return (
    <div className="relative group ">
      {children}

      <div className="absolute top-full left-1/2 -translate-x-1/2
          px-2 py-1 text-xs text-white bg-black rounded
          opacity-0 group-hover:opacity-100
          transition-opacity duration-300
          pointer-events-none whitespace-nowrap title">
        {text}
      </div>
    </div>
  );
};

export default Tooltip;
