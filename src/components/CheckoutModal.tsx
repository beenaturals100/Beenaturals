import React, { useState } from "react";
import { useCart } from "../context/CartContext";
import { SHIPPING_ZONES } from "../data/deliveryMatrix";

interface CheckoutModalProps {
  onOrderSuccess: (orderId: string, trackingCode: string) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  onOrderSuccess,
}) => {
  const {
    cart,
    isCheckoutOpen,
    setIsCheckoutOpen,
    cartTotalSum,
    clearCart,
    language,
  } = useCart();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [selectedZoneId, setSelectedZoneId] = useState(SHIPPING_ZONES[0].id);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isCheckoutOpen || cart.length === 0) return null;

  const selectedZone = SHIPPING_ZONES.find((z) => z.id === selectedZoneId) || SHIPPING_ZONES[0];
  const finalTotal = cartTotalSum + selectedZone.fee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !phone || !address) {
      if (language === "ka") {
        alert("გთხოვთ შეავსოთ ყველა სავალდებულო ველი!");
      } else {
        alert("Please fill in all required fields!");
      }
      return;
    }

    setIsSubmitting(true);
    const orderId = `BEE-${Date.now().toString().slice(-6)}`;
    const orderData = {
      orderId,
      customer: {
        firstName,
        lastName,
        phone,
        address,
        shippingZone: language === "ka" ? selectedZone.nameKa : selectedZone.nameEn,
        shippingFee: selectedZone.fee,
      },
      items: cart.map((item) => ({
        id: item.product.id,
        name: language === "ka" ? item.product.nameKa : item.product.nameEn,
        quantity: item.quantity,
        price: item.product.price,
        weight: item.product.weight,
      })),
      subtotal: cartTotalSum,
      total: finalTotal,
      paymentMethod,
    };

    if (paymentMethod === "cash") {
      try {
        const notionRes = await fetch("/api/notion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderData),
        });
        const notionData = await notionRes.json();
        if (!notionRes.ok) throw new Error(notionData.error || "Notion integration failed");

        const resendRes = await fetch("/api/resend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderData),
        });
        const resendData = await resendRes.json();
        if (!resendRes.ok) throw new Error(resendData.error || "Resend email failed");

        clearCart();
        setIsCheckoutOpen(false);
        const trackingCode = notionData.trackingCode ? String(notionData.trackingCode) : String(Math.floor(1000 + Math.random() * 9000));
        onOrderSuccess(orderId, trackingCode);
      } catch (err: any) {
        console.error("Order processing error:", err);
        if (language === "ka") {
          alert(`შეკვეთის შენახვისას დაფიქსირდა შეცდომა, თუმცა თქვენი მოთხოვნა მიღებულია: ${err.message}`);
        } else {
          alert(`Error saving order details, but request received: ${err.message}`);
        }
        clearCart();
        setIsCheckoutOpen(false);
        const fallbackTrackingCode = String(Math.floor(1000 + Math.random() * 9000));
        onOrderSuccess(orderId, fallbackTrackingCode);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Card Payment Flow
      try {
        localStorage.setItem("beenaturals_pending_order", JSON.stringify(orderData));

        const bogRes = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            amount: finalTotal,
            description: `Beenaturals Honey Order #${orderId}`,
          }),
        });
        
        // Check if the response is JSON before parsing to handle server errors/proxies gracefully
        const contentType = bogRes.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error(`Server returned a non-JSON response (${contentType || "text/html"}). Status: ${bogRes.status}. Please ensure Wrangler pages dev is running on port 8788, or that your Cloudflare functions are deployed.`);
        }

        const bogData = await bogRes.json();
        if (!bogRes.ok || bogData.success === false) throw new Error(bogData.error || "BOG Checkout connection failed");

        if (bogData.redirectUrl) {
          window.location.href = bogData.redirectUrl;
        } else {
          throw new Error("No redirect link returned from payment gateway");
        }
      } catch (err: any) {
        console.error("Card Payment initiation failed:", err);
        alert(
          language === "ka"
            ? `ბარათით გადახდის ინიციალიზაცია ჩაიშალა: ${err.message}`
            : `Card payment initiation failed: ${err.message}`
        );
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto font-sans flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm transition-opacity"
        onClick={() => !isSubmitting && setIsCheckoutOpen(false)}
      />

      {/* Modal Box */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col md:flex-row border border-amber-100 animate-scale-in max-h-[90vh]">
        {/* Left Side: Forms */}
        <div className="flex-1 p-6 sm:p-8 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-950">
              {language === "ka" ? "შეკვეთის გაფორმება" : "Checkout"}
            </h2>
            {!isSubmitting && (
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1 rounded-full text-stone-400 hover:bg-stone-50 hover:text-stone-700 cursor-pointer"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Customer Names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                  {language === "ka" ? "სახელი *" : "First Name *"}
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={language === "ka" ? "მაგ: გიორგი" : "e.g. John"}
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-honey-400 focus:border-transparent transition-all duration-150 disabled:bg-stone-50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                  {language === "ka" ? "გვარი *" : "Last Name *"}
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={language === "ka" ? "მაგ: ბერიძე" : "e.g. Smith"}
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-honey-400 focus:border-transparent transition-all duration-150 disabled:bg-stone-50"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                {language === "ka" ? "მიწოდების მისამართი *" : "Delivery Address *"}
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={language === "ka" ? "მაგ: ჭავჭავაძის გამზ. 24, ბ. 15" : "e.g. 24 Chavchavadze Ave, Apt 15"}
                disabled={isSubmitting}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-honey-400 focus:border-transparent transition-all duration-150 disabled:bg-stone-50"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                {language === "ka" ? "ტელეფონის ნომერი *" : "Phone Number *"}
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={language === "ka" ? "მაგ: 599 XXXXXX" : "e.g. +995 599 XXXXXX"}
                disabled={isSubmitting}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-honey-400 focus:border-transparent transition-all duration-150 disabled:bg-stone-50"
              />
            </div>

            {/* Delivery Zone Matrix Selector */}
            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                {language === "ka" ? "მიწოდების ზონა *" : "Delivery Zone *"}
              </label>
              <select
                value={selectedZoneId}
                onChange={(e) => setSelectedZoneId(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-honey-400 focus:border-transparent transition-all duration-150 cursor-pointer disabled:bg-stone-50"
              >
                {SHIPPING_ZONES.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {language === "ka" ? zone.nameKa : zone.nameEn} — {zone.fee} GEL
                  </option>
                ))}
              </select>

              {/* Exclusion Warning Banner */}
              {selectedZoneId === "region-village" && (
                <div className="mt-2.5 p-3 rounded-xl bg-amber-50 border border-honey-200/50 flex items-start space-x-2 animate-scale-in">
                  <svg className="w-5 h-5 text-honey-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-xs text-honey-900 leading-tight">
                    {language === "ka" ? (
                      <><strong>ყურადღება:</strong> რეგიონული მიწოდება სოფლებში არ ვრცელდება <strong>სვანეთსა</strong> და <strong>ფშავ-ხევსურეთზე</strong>.</>
                    ) : (
                      <><strong>Attention:</strong> Regional village delivery does not cover <strong>Svaneti</strong> and <strong>Pshav-Khevsureti</strong>.</>
                    )}
                  </p>
                </div>
              )}

              {/* Tbilisi Outer Limits Banner */}
              {selectedZoneId === "tbilisi-outer" && (
                <div className="mt-2.5 p-3 rounded-xl bg-amber-50 border border-honey-200/50 flex items-start space-x-2 animate-scale-in">
                  <svg className="w-5 h-5 text-honey-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-honey-900 leading-relaxed">
                    {language === "ka" ? (
                      <><strong>მოიცავს შემდეგ გარეუბნებს:</strong> ლილოს დასახლება, დიდი და პატარა ლილო, ნასაგური, წინუბანი, ზემო და ქვემო ფონიჭალა, წყნეთი, ბეთანია, კიკეთი, ოქროყანა, წავკისი, შინდისი, ტაბახმელა, კოჯორი, ქოშიგორა.</>
                    ) : (
                      <><strong>Includes the following districts:</strong> Lilo settlement, Didi & Patara Lilo, Nasaguri, Tsinubani, Zemo & Kvemo Ponichala, Tskneti, Betania, Kiketi, Okrokana, Tsavkisi, Shindisi, Tabakhmela, Kojori, Koshigora.</>
                    )}
                  </p>
                </div>
              )}

              {/* Tbilisi Exceptions Banner */}
              {selectedZoneId === "tbilisi-exc" && (
                <div className="mt-2.5 p-3 rounded-xl bg-amber-50 border border-honey-200/50 flex items-start space-x-2 animate-scale-in">
                  <svg className="w-5 h-5 text-honey-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-honey-900 leading-relaxed">
                    {language === "ka" ? (
                      <><strong>მოიცავს:</strong> თხინვალა, კაკლები.</>
                    ) : (
                      <><strong>Includes:</strong> Tkhinvala, Kaklebi.</>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-2.5">
                {language === "ka" ? "გადახდის მეთოდი *" : "Payment Method *"}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Cash Method */}
                <label
                  className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all duration-150 ${
                    paymentMethod === "cash"
                      ? "border-honey-500 bg-amber-50/20"
                      : "border-stone-200 hover:bg-stone-50/50"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cash"
                      checked={paymentMethod === "cash"}
                      onChange={() => setPaymentMethod("cash")}
                      disabled={isSubmitting}
                      className="text-honey-600 focus:ring-honey-400"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-stone-900">
                        {language === "ka" ? "კურიერთან გადახდა" : "Cash on Delivery"}
                      </span>
                      <span className="text-xs text-stone-500">
                        {language === "ka" ? "ნაღდი ანგარიშსწორება" : "Pay with cash"}
                      </span>
                    </div>
                  </div>
                </label>

                {/* Card Method (Bank of Georgia) */}
                <label
                  className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all duration-150 ${
                    paymentMethod === "card"
                      ? "border-honey-500 bg-amber-50/20"
                      : "border-stone-200 hover:bg-stone-50/50"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="card"
                      checked={paymentMethod === "card"}
                      onChange={() => setPaymentMethod("card")}
                      disabled={isSubmitting}
                      className="text-honey-600 focus:ring-honey-400"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-stone-900">
                        {language === "ka" ? "ბარათით გადახდა" : "Card Payment"}
                      </span>
                      <span className="text-xs text-stone-500">
                        {language === "ka" ? "წინასწარ გადახდა" : "Pay online"}
                      </span>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white text-[9px] font-sans font-bold shadow-sm shrink-0">
                    BOG
                  </div>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-gradient-to-r from-honey-500 to-honey-600 hover:from-honey-600 hover:to-honey-700 text-white font-sans font-bold rounded-xl shadow-lg cursor-pointer transform active:scale-[0.99] transition-all duration-150 flex items-center justify-center space-x-2 disabled:from-honey-400 disabled:to-honey-500 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>
                    {language === "ka" ? "მიმდინარეობს დამუშავება..." : "Processing..."}
                  </span>
                </>
              ) : (
                <span>
                  {paymentMethod === "cash"
                    ? language === "ka" ? "შეკვეთის გაგზავნა" : "Place Order"
                    : language === "ka" ? "გადახდაზე გადამისამართება" : "Proceed to Payment"}
                </span>
              )}
            </button>
          </form>
        </div>

        {/* Right Side: Order Summary Panel */}
        <div className="w-full md:w-80 bg-stone-50 p-6 sm:p-8 border-t md:border-t-0 md:border-l border-stone-100 flex flex-col justify-between overflow-y-auto">
          <div>
            <h3 className="text-lg font-bold text-stone-950 mb-4 pb-2 border-b border-stone-200">
              {language === "ka" ? "თქვენი შეკვეთა" : "Your Order"}
            </h3>

            {/* List */}
            <div className="space-y-3 divide-y divide-stone-100 max-h-56 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div key={item.product.id} className="pt-3 flex items-start justify-between text-sm">
                  <div className="pr-4">
                    <span className="font-bold text-stone-900">
                      {language === "ka" ? item.product.nameKa : item.product.nameEn}
                    </span>
                    <span className="text-stone-500 text-xs block mt-0.5">
                      {item.quantity} × {language === "ka" ? item.product.weight : item.product.weight.replace("კგ", "kg")}
                    </span>
                  </div>
                  <span className="font-bold text-stone-800 shrink-0">
                    {item.product.price * item.quantity} GEL
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Details */}
          <div className="mt-8 pt-4 border-t border-stone-200 space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-stone-600">
                {language === "ka" ? "პროდუქცია:" : "Products:"}
              </span>
              <span className="font-semibold text-stone-900">{cartTotalSum} GEL</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-600">
                {language === "ka" ? "მიწოდება:" : "Shipping:"}
              </span>
              <span className="font-semibold text-honey-700">+{selectedZone.fee} GEL</span>
            </div>
            <div className="flex justify-between items-center text-stone-950 pt-3 border-t border-stone-200/60">
              <span className="font-bold text-base">
                {language === "ka" ? "სულ ჯამი:" : "Total:"}
              </span>
              <span className="font-extrabold text-xl text-honey-900">{finalTotal} GEL</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
