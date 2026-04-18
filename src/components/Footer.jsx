const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full mt-20 text-sm text-gray-400 opacity-90 hover:opacity-100 transition duration-300">

      {/* animated gradient line */}
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-gray-600 to-transparent animate-pulse" />

      <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-3">
        
        <p className="tracking-wider text-gray-500">
          © {year} Shahriyer Sayem
        </p>
        
        <p className="text-center md:text-right text-gray-500">
          Built and designed by{" "}
          <a
            href="https://being-utso.github.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-200 hover:text-white transition duration-200 hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]"
>
            Shahriyer Sayem
          </a>
        </p>

      </div>
    </footer>
  );
};

export default Footer;