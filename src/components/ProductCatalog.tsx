import React from "react";
import { PRODUCTS, useCart } from "../context/CartContext";

export const ProductCatalog: React.FC = () => {
  const { addToCart, buyNow, language } = useCart();

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-slide-up">
      {/* Catalog Title */}
      <div className="text-center mb-12">
        <span className="text-honey-600 font-sans font-semibold tracking-widest text-xs uppercase bg-honey-50 px-3 py-1 rounded-full border border-honey-100/60">
          {language === "ka" ? "ჩვენი პროდუქცია" : "Our Catalog"}
        </span>
        <h2 className="text-3xl sm:text-4xl font-serif font-extrabold text-stone-900 mt-3 mb-4">
          {language === "ka"
            ? "სრულიად ნატურალური მეფუტკრეობის პროდუქტები"
            : "Natural Apiary & Honeycomb Products"}
        </h2>
        <p className="max-w-2xl mx-auto text-stone-600 font-sans text-sm sm:text-base">
          {language === "ka"
            ? "უმაღლესი ხარისხის, ეკოლოგიურად სუფთა ქართული თაფლი."
            : "Premium quality, ecologically clean Georgian honey."}
        </p>
      </div>

      {/* Grid of Cards */}
      <div className="flex flex-wrap justify-center gap-8 lg:gap-10">
        {PRODUCTS.map((product) => (
          <div
            key={product.id}
            className="flex flex-col bg-white rounded-2xl overflow-hidden border border-amber-250/20 shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 group w-full sm:w-[calc(50%-16px)] lg:w-[280px]"
          >
            {/* Product Image Area */}
            <div className="relative overflow-hidden aspect-square bg-stone-50">
              <img
                src={product.image}
                alt={language === "ka" ? product.nameKa : product.nameEn}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              
              {/* Weight Badge */}
              <div className="absolute top-4 left-4 bg-stone-900/90 text-amber-100 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold font-sans tracking-wide border border-stone-800">
                {language === "ka"
                  ? product.weight
                  : product.weight.replace("კგ", "kg")}
              </div>

              {/* Price Tag Overlay */}
              <div className="absolute bottom-4 right-4 bg-honey-500 text-white font-sans font-bold px-4 py-1.5 rounded-full shadow-lg border border-honey-600 text-lg">
                {product.price} GEL
              </div>
            </div>

            {/* Product Metadata */}
            <div className="p-6 flex flex-col flex-grow">
              <h3 className="text-xl font-serif font-bold text-stone-900 leading-tight mb-2 group-hover:text-honey-700 transition-colors duration-200">
                {language === "ka" ? product.nameKa : product.nameEn}
              </h3>
              <p className="text-stone-650 font-sans text-sm line-clamp-3 mb-6 flex-grow">
                {language === "ka" ? product.descriptionKa : product.descriptionEn}
              </p>

              {/* Action Buttons */}
              <div className="space-y-2 mt-auto">
                <button
                  onClick={() => buyNow(product.id)}
                  className="w-full py-3 bg-gradient-to-r from-honey-500 to-honey-600 hover:from-honey-600 hover:to-honey-700 text-white font-sans font-bold rounded-xl shadow-md shadow-honey-500/10 hover:shadow-lg hover:shadow-honey-600/20 transform active:scale-[0.98] transition-all duration-150 cursor-pointer text-center text-sm sm:text-base"
                >
                  {language === "ka" ? "ყიდვა" : "Buy Now"}
                </button>
                
                <button
                  onClick={() => addToCart(product.id)}
                  className="w-full py-3 bg-white hover:bg-amber-50/50 text-stone-850 font-sans font-semibold rounded-xl border border-honey-200 hover:border-honey-300 transition-colors duration-150 cursor-pointer text-center text-sm"
                >
                  {language === "ka" ? "კალათაში დამატება" : "Add to Cart"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
