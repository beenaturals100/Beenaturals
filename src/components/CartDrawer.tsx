import React from "react";
import { useCart } from "../context/CartContext";

export const CartDrawer: React.FC = () => {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
    cartTotalSum,
    setIsCheckoutOpen,
    language,
  } = useCart();

  if (!isCartOpen) return null;

  const handleCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex">
        {/* Drawer Panel */}
        <div className="w-screen max-w-md h-full bg-white shadow-2xl flex flex-col animate-slide-up">
          {/* Header */}
          <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-stone-950 flex items-center">
              <svg
                className="w-5 h-5 mr-2 text-honey-600"
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
              {language === "ka" ? "კალათა" : "Shopping Cart"}
            </h2>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-1 rounded-full text-stone-500 hover:bg-stone-50 hover:text-stone-850 cursor-pointer focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-stone-100">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
                <div className="p-4 bg-amber-50 rounded-full border border-honey-100 text-honey-600">
                  <svg
                    className="w-10 h-10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-stone-900">
                    {language === "ka" ? "კალათა ცარიელია" : "Your cart is empty"}
                  </p>
                  <p className="text-stone-500 text-sm mt-1">
                    {language === "ka" ? "დაამატეთ პროდუქცია კატალოგიდან" : "Add products from our catalog"}
                  </p>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="px-6 py-2.5 bg-honey-50 hover:bg-honey-100 text-honey-850 font-bold rounded-xl border border-honey-200 transition-colors duration-150 cursor-pointer text-sm"
                >
                  {language === "ka" ? "კატალოგის დათვალიერება" : "Browse Catalog"}
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product.id} className="py-4 flex items-center space-x-4">
                  {/* Image */}
                  <img
                    src={item.product.image}
                    alt={language === "ka" ? item.product.nameKa : item.product.nameEn}
                    className="w-16 h-16 rounded-xl object-cover border border-stone-100"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-stone-900 truncate">
                      {language === "ka" ? item.product.nameKa : item.product.nameEn}
                    </h3>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {language === "ka" ? "წონა: " : "Weight: "}
                      {language === "ka" ? item.product.weight : item.product.weight.replace("კგ", "kg")}
                    </p>
                    <p className="text-sm font-bold text-honey-700 mt-1">
                      {item.product.price} GEL
                    </p>
                  </div>

                  {/* Quantity Controls & Delete */}
                  <div className="flex flex-col items-end space-y-2">
                    <div className="flex items-center border border-stone-200 rounded-lg bg-white overflow-hidden">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="w-9 h-9 flex items-center justify-center text-stone-500 hover:text-stone-850 hover:bg-stone-50 active:bg-stone-100 transition-colors cursor-pointer"
                      >
                        -
                      </button>
                      <span className="px-2.5 text-sm font-bold text-stone-850 min-w-[20px] text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="w-9 h-9 flex items-center justify-center text-stone-500 hover:text-stone-850 hover:bg-stone-50 active:bg-stone-100 transition-colors cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-xs text-rose-500 hover:text-rose-600 hover:underline cursor-pointer focus:outline-none"
                    >
                      {language === "ka" ? "წაშლა" : "Remove"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Panel */}
          {cart.length > 0 && (
            <div className="px-6 py-6 border-t border-stone-100 bg-stone-50/40 space-y-4">
              <div className="flex items-center justify-between text-stone-950">
                <span className="font-semibold text-stone-600">
                  {language === "ka" ? "ქვეჯამი:" : "Subtotal:"}
                </span>
                <span className="font-bold text-xl">{cartTotalSum} GEL</span>
              </div>
              <p className="text-xs text-stone-500">
                {language === "ka"
                  ? "ტრანსპორტირების საფასური დაემატება შეკვეთის გაფორმებისას."
                  : "Shipping fees will be calculated at checkout."}
              </p>
              <div className="grid grid-cols-1 gap-2 pt-2">
                <button
                  onClick={handleCheckout}
                  className="w-full py-3.5 bg-gradient-to-r from-honey-500 to-honey-600 hover:from-honey-600 hover:to-honey-700 text-white font-bold rounded-xl shadow-md cursor-pointer text-center text-sm"
                >
                  {language === "ka" ? "შეკვეთის გაფორმება" : "Proceed to Checkout"}
                </button>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="w-full py-3 text-stone-700 hover:bg-stone-50 font-semibold rounded-xl text-center cursor-pointer text-sm"
                >
                  {language === "ka" ? "ყიდვის გაგრძელება" : "Continue Shopping"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
