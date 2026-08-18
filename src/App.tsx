import React, { useEffect, useState } from "react";
import { CartProvider, useCart } from "./context/CartContext";
import { Header } from "./components/Header";
import { ProductCatalog } from "./components/ProductCatalog";
import { OrderTracking } from "./components/OrderTracking";
import { CartDrawer } from "./components/CartDrawer";
import { CheckoutModal } from "./components/CheckoutModal";
import {
  CashSuccessModal,
  CardSuccessModal,
  CardFailureModal,
} from "./components/StatusModals";

const AppContent: React.FC = () => {
  const { clearCart, language, activeTab } = useCart();
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);
  const [successTrackingCode, setSuccessTrackingCode] = useState<string | null>(null);
  const [isCashSuccessOpen, setIsCashSuccessOpen] = useState(false);
  const [isCardSuccessOpen, setIsCardSuccessOpen] = useState(false);
  const [isCardFailureOpen, setIsCardFailureOpen] = useState(false);
  const [isProcessingCardSuccess, setIsProcessingCardSuccess] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get("payment");
    const isPathSuccess = window.location.pathname.endsWith("/order-success");
    const isPathFailure = window.location.pathname.endsWith("/order-fail");

    if (paymentStatus === "success" || isPathSuccess) {
      handleCardPaymentSuccess();
    } else if (paymentStatus === "fail" || isPathFailure) {
      handleCardPaymentFailure();
    }
  }, []);

  const handleCardPaymentSuccess = () => {
    const pendingOrderStr = localStorage.getItem("beenaturals_pending_order");
    
    if (pendingOrderStr) {
      try {
        const orderData = JSON.parse(pendingOrderStr);
        setSuccessOrderId(orderData.orderId);
        // Display order ID and clear cart
        setSuccessTrackingCode(orderData.orderId.slice(-6));
        localStorage.removeItem("beenaturals_pending_order");
        clearCart();
      } catch (err) {
        console.error("Error reading card order details:", err);
      }
    }

    setIsCardSuccessOpen(true);
    cleanUrlParams();
  };

  const handleCardPaymentFailure = () => {
    setIsCardFailureOpen(true);
    cleanUrlParams();
  };

  const cleanUrlParams = () => {
    const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.pushState({ path: newUrl }, "", newUrl);
  };

  const handleCashOrderSuccess = (orderId: string, trackingCode: string) => {
    setSuccessOrderId(orderId);
    setSuccessTrackingCode(trackingCode);
    setIsCashSuccessOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-amber-50/20 w-full overflow-x-hidden">
      <Header />

      {/* Hero Banner Section */}
      {activeTab === "catalog" && (
        <section className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-amber-100/50 to-transparent animate-fade-in">
          <div className="max-w-7xl mx-auto text-center relative z-10">
            <span className="text-honey-700 font-sans text-sm font-bold uppercase tracking-wider bg-honey-100/80 px-4 py-1.5 rounded-full border border-honey-200/50">
              {language === "ka" ? "🐝 100% ნატურალური და ქართული" : "🐝 100% Natural & Georgian"}
            </span>
            <h2 className="text-4xl sm:text-6xl font-serif font-extrabold text-stone-900 mt-6 mb-6 leading-tight">
              {language === "ka" ? "აღმოაჩინე ნამდვილი თაფლის გემო" : "Discover the Taste of Real Honey"}
            </h2>
            <p className="max-w-2xl mx-auto text-stone-650 text-base sm:text-lg leading-relaxed mb-8">
              {language === "ka"
                ? "Beenaturals გთავაზობთ საქართველოში მოპოვებულ, სრულიად ნატურალურ და ნედლ თაფლს ეკოლოგიურად სუფთა რეგიონებიდან."
                : "Beenaturals offers raw, completely natural honey harvested from ecologically clean regions of Georgia."}
            </p>
            <div className="flex justify-center">
              <a
                href="#catalog"
                className="px-8 py-4 bg-gradient-to-r from-honey-500 to-honey-600 hover:from-honey-600 hover:to-honey-700 text-white font-sans font-bold rounded-xl shadow-lg hover:shadow-xl hover:translate-y-[-1px] transition-all cursor-pointer text-sm sm:text-base"
              >
                {language === "ka" ? "შეუკვეთე ახლავე" : "Order Now"}
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Card Processing Loader Overlay */}
      {isProcessingCardSuccess && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-md flex flex-col items-center justify-center text-white p-4">
          <svg className="animate-spin h-10 w-10 text-honey-400 mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="font-sans font-bold text-center text-base sm:text-lg">
            {language === "ka"
              ? "ხდება გადახდის გადამოწმება და შეკვეთის გაფორმება..."
              : "Verifying payment and placing your order..."}
          </span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-grow">
        {activeTab === "catalog" ? (
          <>
            {/* Main Catalog Section */}
            <div id="catalog">
              <ProductCatalog />
            </div>

            {/* Gallery Section */}
            <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-amber-100/30">
              <div className="text-center mb-10">
                <span className="text-honey-600 font-sans font-semibold tracking-widest text-xs uppercase bg-honey-50 px-3 py-1 rounded-full border border-honey-100/60">
                  {language === "ka" ? "ჩვენი საფუტკრე" : "Our Apiary"}
                </span>
                <h3 className="text-3xl font-serif font-extrabold text-stone-900 mt-2">
                  {language === "ka" ? "ფოტოები" : "Gallery"}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 justify-center">
                <div className="relative overflow-hidden rounded-2xl aspect-square shadow-sm hover:shadow-md transition-all duration-300 group">
                  <img
                    src="/beekeeper.jpg"
                    alt={language === "ka" ? "მეფუტკრე" : "Beekeeper"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex items-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="text-white text-sm font-bold font-sans">
                      {language === "ka" ? "მეფუტკრე" : "Beekeeper"}
                    </span>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl aspect-square shadow-sm hover:shadow-md transition-all duration-300 group">
                  <img
                    src="/bees_hive.jpg"
                    alt={language === "ka" ? "სკა და ფუტკრები" : "Hives and bees"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex items-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="text-white text-sm font-bold font-sans">
                      {language === "ka" ? "სკა და ფუტკრები" : "Hives and Bees"}
                    </span>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl aspect-square shadow-sm hover:shadow-md transition-all duration-300 group">
                  <img
                    src="/gallery3.jpg"
                    alt={language === "ka" ? "სკა" : "Hive"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex items-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="text-white text-sm font-bold font-sans">
                      {language === "ka" ? "სკა" : "Hive Close-up"}
                    </span>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl aspect-square shadow-sm hover:shadow-md transition-all duration-300 group">
                  <img
                    src="/gallery4.jpg"
                    alt={language === "ka" ? "ფუტკარი ფიჭაზე" : "Beekeeper inspection"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex items-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="text-white text-sm font-bold font-sans">
                      {language === "ka" ? "ფუტკარი ფიჭაზე" : "Beekeeper Inspection"}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </>
        ) : (
          <OrderTracking />
        )}
      </main>

      {/* Trust Badges / Benefits Section */}
      <section className="py-16 bg-white border-y border-amber-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center text-center p-4">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-honey-600 mb-4 border border-honey-100">
              🐝
            </div>
            <h4 className="text-lg font-bold text-stone-900 mb-2">
              {language === "ka" ? "ველური ბუნება" : "Wild Nature"}
            </h4>
            <p className="text-sm text-stone-500">
              {language === "ka"
                ? "თაფლი მოიპოვება ეკოლოგიურად სუფთა ალპური და ტყის ზონებიდან."
                : "Honey harvested from ecologically clean alpine and forest zones."}
            </p>
          </div>
          <div className="flex flex-col items-center text-center p-4">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-honey-600 mb-4 border border-honey-100">
              🍯
            </div>
            <h4 className="text-lg font-bold text-stone-900 mb-2">
              {language === "ka" ? "100% ნატურალური" : "100% Natural"}
            </h4>
            <p className="text-sm text-stone-500">
              {language === "ka"
                ? "ყოველგვარი დანამატების გარეშე."
                : "Raw and pure honey, free of any additives."}
            </p>
          </div>
          <div className="flex flex-col items-center text-center p-4">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-honey-600 mb-4 border border-honey-100">
              🚚
            </div>
            <h4 className="text-lg font-bold text-stone-900 mb-2">
              {language === "ka" ? "სწრაფი მიწოდება" : "Fast Delivery"}
            </h4>
            <p className="text-sm text-stone-500">
              {language === "ka"
                ? "მიწოდება მთელი საქართველოს მასშტაბით უმოკლეს დროში."
                : "Swift delivery across Georgia in the shortest time."}
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-900 text-stone-400 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex flex-col items-center md:items-start">
            <span className="text-white font-serif font-bold text-lg">Beenaturals • ბინატურალს</span>
            <span className="text-xs mt-1">
              © {new Date().getFullYear()} {language === "ka" ? "ყველა უფლება დაცულია." : "All rights reserved."}
            </span>
          </div>
          <div className="flex space-x-6 text-sm">
            <a
              href="https://www.facebook.com/profile.php?id=61580550659968"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-honey-400 transition-colors"
            >
              {language === "ka" ? "Facebook გვერდი" : "Facebook Page"}
            </a>
            <span className="text-stone-700">|</span>
            <span className="text-stone-500">
              {language === "ka" ? "საკონტაქტო" : "Contact"}: 558 05 79 75
            </span>
          </div>
        </div>
      </footer>

      {/* Modals & Overlays */}
      <CartDrawer />
      
      <CheckoutModal
        onOrderSuccess={handleCashOrderSuccess}
      />

      <CashSuccessModal
        isOpen={isCashSuccessOpen}
        orderId={successOrderId || ""}
        trackingCode={successTrackingCode || ""}
        onClose={() => setIsCashSuccessOpen(false)}
      />

      <CardSuccessModal
        isOpen={isCardSuccessOpen}
        orderId={successOrderId || ""}
        trackingCode={successTrackingCode || ""}
        onClose={() => setIsCardSuccessOpen(false)}
      />

      <CardFailureModal
        isOpen={isCardFailureOpen}
        onClose={() => setIsCardFailureOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <CartProvider>
      <AppContent />
    </CartProvider>
  );
}
