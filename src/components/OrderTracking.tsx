import React, { useState } from "react";
import { useCart } from "../context/CartContext";

const STAGES = [
  {
    text: "🔵 თქვენი შეკვეთა მიღებულია",
    descEn: "Your order has been received",
  },
  {
    text: "📦 თქვენი შეკვეთა მზად არის გასაგზავნად",
    descEn: "Your order is ready for shipping",
  },
  {
    text: "🚚 თქვენი შეკვეთა გაგზავნილია, კურიერი მალე მოგიტანთ",
    descEn: "Your order has been shipped, the courier will bring it soon",
  },
];

export const OrderTracking: React.FC = () => {
  const { language } = useCart();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<number | null>(null);
  const [searchedCode, setSearchedCode] = useState<string | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(code)) {
      setError(
        language === "ka"
          ? "გთხოვთ შეიყვანოთ 4-ნიშნა ციფრული კოდი!"
          : "Please enter a valid 4-digit numerical code!"
      );
      setCurrentStage(null);
      setSearchedCode(null);
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentStage(null);
    setSearchedCode(code);

    try {
      const res = await fetch(`/api/track?code=${code}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Order not found");
      }

      setCurrentStage(data.stage ?? 0);
    } catch (err: any) {
      console.error(err);
      setError(
        language === "ka"
          ? "შეკვეთა ამ კოდით ვერ მოიძებნა. გთხოვთ გადაამოწმოთ კოდი და სცადოთ თავიდან."
          : "Order with this code could not be found. Please check the code and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 animate-fade-in font-sans">
      <div className="text-center mb-10">
        <span className="text-honey-600 font-sans font-semibold tracking-widest text-xs uppercase bg-honey-50 px-3 py-1 rounded-full border border-honey-100/60">
          {language === "ka" ? "სტატუსის შემოწმება" : "Check Order Status"}
        </span>
        <h3 className="text-3xl font-serif font-extrabold text-stone-900 mt-2">
          {language === "ka" ? "შეკვეთის თვალის დევნება" : "Order Tracking"}
        </h3>
        <p className="text-sm text-stone-500 mt-2 max-w-md mx-auto leading-relaxed">
          {language === "ka"
            ? "შეიყვანეთ შეკვეთის დასრულებისას მიღებული 4-ნიშნა კოდი თქვენი შეკვეთის სტატუსის სანახავად."
            : "Enter the 4-digit code received at checkout to view your order status."}
        </p>
      </div>

      {/* Input Form */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-100 shadow-xl mb-8">
        <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-grow">
            <input
              type="text"
              pattern="[0-9]*"
              inputMode="numeric"
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder={language === "ka" ? "მაგ: 1001" : "e.g. 1001"}
              className="w-full px-5 py-4 rounded-xl border-2 border-stone-200 text-lg font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-honey-400 focus:border-transparent transition-all duration-150"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-4 bg-gradient-to-r from-honey-500 to-honey-600 hover:from-honey-600 hover:to-honey-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-150 flex items-center justify-center space-x-2 shrink-0 cursor-pointer disabled:from-honey-400 disabled:to-honey-500"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>{language === "ka" ? "იძებნება..." : "Tracking..."}</span>
              </>
            ) : (
              <span>{language === "ka" ? "შემოწმება" : "Track Order"}</span>
            )}
          </button>
        </form>
      </div>

      {/* Results Section */}
      <div className="min-h-32 flex flex-col justify-center">
        {loading && (
          <div className="flex flex-col items-center justify-center py-10 space-y-4">
            <div className="w-12 h-12 border-4 border-honey-200 border-t-honey-600 rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-stone-500 animate-pulse">
              {language === "ka" ? "შეკვეთის მონაცემები იტვირთება..." : "Loading order details..."}
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-5 flex items-start space-x-3 animate-scale-in">
            <svg className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm font-medium leading-relaxed">{error}</p>
          </div>
        )}

        {currentStage !== null && !loading && !error && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-100 shadow-xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-6">
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                  {language === "ka" ? "შეკვეთის კოდი" : "Order Tracking Code"}
                </span>
                <h4 className="text-xl font-bold text-stone-900 font-mono tracking-wide mt-0.5">
                  #{searchedCode}
                </h4>
              </div>
              <div className="px-3.5 py-1.5 rounded-full bg-honey-50 border border-honey-100 text-honey-850 text-xs font-bold font-sans">
                {language === "ka" ? "აქტიური" : "Active"}
              </div>
            </div>

            {/* Timeline */}
            <div className="relative pl-8 border-l-2 border-stone-200 space-y-10 py-2">
              {STAGES.map((stage, idx) => {
                const isCompleted = idx <= currentStage;
                const isCurrent = idx === currentStage;

                return (
                  <div key={idx} className="relative">
                    {/* Circle Node */}
                    <div
                      className={`absolute -left-[41px] top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                        isCurrent
                          ? "bg-honey-500 border-honey-600 text-white shadow-[0_0_12px_rgba(245,158,11,0.5)] scale-110 animate-pulse"
                          : isCompleted
                          ? "bg-honey-100 border-honey-400 text-honey-700"
                          : "bg-white border-stone-200 text-stone-300"
                      }`}
                    >
                      {isCompleted ? (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-stone-300" />
                      )}
                    </div>

                    {/* Stage Label */}
                    <div className={`transition-all duration-300 ${isCompleted ? "opacity-100" : "opacity-40"}`}>
                      <h5 className={`text-[15px] font-bold font-sans ${isCurrent ? "text-stone-950 font-extrabold" : "text-stone-700"}`}>
                        {stage.text}
                      </h5>
                      {language === "en" && (
                        <p className="text-xs text-stone-500 mt-1 font-sans">
                          {stage.descEn}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {currentStage === null && !loading && !error && (
          <div className="text-center py-8 text-stone-400 flex flex-col items-center justify-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mb-3 text-2xl border border-stone-200/50">
              🔍
            </div>
            <p className="text-sm font-sans">
              {language === "ka"
                ? "შეკვეთის სტატუსის სანახავად შეიყვანეთ კოდი."
                : "Enter code to view your order status."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
