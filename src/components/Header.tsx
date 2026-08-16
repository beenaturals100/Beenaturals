import React from "react";
import { useCart } from "../context/CartContext";

export const Header: React.FC = () => {
  const { setIsCartOpen, cartTotalItems, language, setLanguage } = useCart();

  return (
    <header className="sticky top-0 z-40 w-full transition-all duration-300 glass-effect border-b border-amber-200/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand Logo & Info */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Brand Logo */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-honey-400 to-honey-600 rounded-full blur opacity-30 group-hover:opacity-60 transition duration-300"></div>
            <div className="relative w-12 h-12 rounded-full overflow-hidden border border-honey-200 shadow-sm cursor-pointer transform hover:scale-105 transition-transform duration-200 bg-white">
              <img
                src="/logo.png"
                alt="Beenaturals Logo"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 tracking-tight leading-none m-0">
              Beenaturals <span className="text-honey-600">•</span> ბინატურალს
            </h1>
            <span className="text-xs sm:text-sm font-sans text-stone-600 font-medium tracking-wide mt-1">
              {language === "ka" ? "სრულიად ნატურალური თაფლი" : "100% Natural Honey"}
            </span>
          </div>
        </div>

        {/* Navigation & Controls */}
        <div className="flex items-center space-x-4">
          {/* Language Switcher */}
          <div className="flex bg-stone-100 p-0.5 rounded-xl border border-stone-250/60 shadow-inner">
            <button
              onClick={() => setLanguage("ka")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-sans cursor-pointer transition-all duration-150 ${
                language === "ka"
                  ? "bg-honey-500 text-white shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              KA
            </button>
            <button
              onClick={() => setLanguage("en")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-sans cursor-pointer transition-all duration-150 ${
                language === "en"
                  ? "bg-honey-500 text-white shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              EN
            </button>
          </div>

          {/* Cart Trigger */}
          <button
            onClick={() => setIsCartOpen(true)}
            id="cart-drawer-toggle"
            className="relative p-2.5 rounded-full bg-honey-50 hover:bg-honey-100 border border-honey-200/60 text-stone-800 hover:text-honey-850 hover:scale-105 transition-all duration-200 cursor-pointer shadow-sm focus:outline-none"
            aria-label="Toggle Shopping Cart"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>

            {/* Cart Badge */}
            {cartTotalItems > 0 && (
              <span 
                className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-honey-600 text-white font-sans font-bold text-[11px] rounded-full ring-2 ring-white animate-scale-in"
                id="cart-badge-count"
              >
                {cartTotalItems}
              </span>
            )}
          </button>
        </div>

      </div>
    </header>
  );
};
