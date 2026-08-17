import React, { useState } from "react";
import { useCart } from "../context/CartContext";

interface CashSuccessModalProps {
  isOpen: boolean;
  orderId: string;
  trackingCode: string;
  onClose: () => void;
}

export const CashSuccessModal: React.FC<CashSuccessModalProps> = ({
  isOpen,
  orderId,
  trackingCode,
  onClose,
}) => {
  const { language } = useCart();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(trackingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto font-sans flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-amber-100 shadow-2xl text-center animate-scale-in">
        {/* Success Icon */}
        <div className="mx-auto w-16 h-16 bg-emerald-50 rounded-full border border-emerald-200 flex items-center justify-center text-emerald-600 mb-6">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h3 className="text-xl font-bold text-stone-900 mb-2">
          {language === "ka" ? "შეკვეთა მიღებულია!" : "Order Received!"}
        </h3>
        <p className="text-xs text-stone-400 font-mono mb-2">
          {language === "ka" ? "იდენტიფიკატორი" : "ID"}: #{orderId}
        </p>

        {/* Highlighted Tracking Code Card */}
        <div 
          onClick={handleCopy}
          className="bg-gradient-to-r from-amber-50 to-amber-100/50 border border-honey-200 rounded-2xl p-4 my-4 animate-scale-in cursor-pointer hover:from-amber-100/70 hover:to-amber-200/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 relative group"
          title={language === "ka" ? "დააკოპირეთ კოდი" : "Copy Code"}
        >
          <p className="text-[10px] uppercase font-extrabold text-stone-500 tracking-wider flex items-center justify-center space-x-1.5">
            <span>{language === "ka" ? "თვალის დევნების კოდი" : "Order Tracking Code"}</span>
            <svg className="w-3.5 h-3.5 text-stone-400 group-hover:text-honey-600 transition-colors" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
          </p>
          <p className="text-3xl font-black text-honey-900 mt-1 tracking-widest font-mono select-none">
            {trackingCode}
          </p>
          <p className="text-[11px] text-stone-600 mt-1 font-medium transition-all duration-200">
            {copied ? (
              <span className="text-emerald-600 font-bold animate-pulse">
                {language === "ka" ? "✓ კოდი დაკოპირდა!" : "✓ Code Copied!"}
              </span>
            ) : (
              language === "ka" 
                ? "დააწკაპუნეთ კოდის დასაკოპირებლად" 
                : "Click to copy code"
            )}
          </p>
        </div>

        <div className="text-stone-700 text-sm leading-relaxed mb-6 space-y-3">
          <p>
            {language === "ka"
              ? "თქვენი შეკვეთა დადასტურებულია, დამატებითი კითხვების შემთხვევაში დაგვიკავშირდით:"
              : "Your order is confirmed. For additional questions, please contact us at:"}
          </p>
          <a
            href="https://www.facebook.com/profile.php?id=61580550659968"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1.5 text-honey-600 hover:text-honey-700 font-semibold break-all hover:underline"
          >
            <span>{language === "ka" ? "ბინატურალს Facebook გვერდი" : "Beenaturals Facebook Page"}</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-gradient-to-r from-honey-500 to-honey-600 hover:from-honey-600 hover:to-honey-700 text-white font-bold rounded-xl shadow-md cursor-pointer transition-all duration-150 text-sm sm:text-base"
        >
          {language === "ka" ? "დახურვა" : "Close"}
        </button>
      </div>
    </div>
  );
};

interface CardSuccessModalProps {
  isOpen: boolean;
  orderId?: string;
  trackingCode: string;
  onClose: () => void;
}

export const CardSuccessModal: React.FC<CardSuccessModalProps> = ({
  isOpen,
  orderId,
  trackingCode,
  onClose,
}) => {
  const { language } = useCart();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(trackingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto font-sans flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-amber-100 shadow-2xl text-center animate-scale-in">
        {/* Card Payment Success Icon */}
        <div className="mx-auto w-16 h-16 bg-amber-50 rounded-full border border-honey-200 flex items-center justify-center text-honey-650 mb-6">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>

        <h3 className="text-xl font-bold text-stone-900 mb-2">
          {language === "ka" ? "გადახდა წარმატებულია!" : "Payment Successful!"}
        </h3>
        {orderId && (
          <p className="text-xs text-stone-400 font-mono mb-2">
            {language === "ka" ? "იდენტიფიკატორი" : "ID"}: #{orderId}
          </p>
        )}

        {/* Highlighted Tracking Code Card */}
        <div 
          onClick={handleCopy}
          className="bg-gradient-to-r from-amber-50 to-amber-100/50 border border-honey-200 rounded-2xl p-4 my-4 animate-scale-in cursor-pointer hover:from-amber-100/70 hover:to-amber-200/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 relative group"
          title={language === "ka" ? "დააკოპირეთ კოდი" : "Copy Code"}
        >
          <p className="text-[10px] uppercase font-extrabold text-stone-500 tracking-wider flex items-center justify-center space-x-1.5">
            <span>{language === "ka" ? "თვალის დევნების კოდი" : "Order Tracking Code"}</span>
            <svg className="w-3.5 h-3.5 text-stone-400 group-hover:text-honey-600 transition-colors" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
          </p>
          <p className="text-3xl font-black text-honey-900 mt-1 tracking-widest font-mono select-none">
            {trackingCode}
          </p>
          <p className="text-[11px] text-stone-600 mt-1 font-medium transition-all duration-200">
            {copied ? (
              <span className="text-emerald-600 font-bold animate-pulse">
                {language === "ka" ? "✓ კოდი დაკოპირდა!" : "✓ Code Copied!"}
              </span>
            ) : (
              language === "ka" 
                ? "დააწკაპუნეთ კოდის დასაკოპირებლად" 
                : "Click to copy code"
            )}
          </p>
        </div>

        <p className="text-stone-650 text-sm leading-relaxed mb-6">
          {language === "ka"
            ? "თქვენი ბარათით გადახდა წარმატებით დასრულდა. შეკვეთა გადაცემულია კურიერისთვის და მალე დაგიკავშირდებით!"
            : "Your card payment completed successfully. The order is handed over to the courier and we will contact you soon!"}
        </p>

        <button
          onClick={onClose}
          className="w-full py-3 bg-gradient-to-r from-honey-500 to-honey-600 hover:from-honey-600 hover:to-honey-700 text-white font-bold rounded-xl shadow-md cursor-pointer transition-all duration-150 text-sm"
        >
          {language === "ka" ? "დასრულება" : "Finish"}
        </button>
      </div>
    </div>
  );
};

interface CardFailureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CardFailureModal: React.FC<CardFailureModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { language } = useCart();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto font-sans flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-rose-100 shadow-2xl text-center animate-scale-in">
        {/* Red X Indicator */}
        <div className="mx-auto w-16 h-16 bg-rose-50 rounded-full border border-rose-200 flex items-center justify-center text-rose-600 mb-6">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        <h3 className="text-xl font-bold text-stone-900 mb-2">
          {language === "ka" ? "გადახდა უარყოფილია" : "Payment Declined"}
        </h3>
        <p className="text-rose-650 text-base font-semibold mb-4">
          {language === "ka" ? "თქვენი შეკვეთა უარყოფილია" : "Your order was declined"}
        </p>
        <p className="text-stone-650 text-sm leading-relaxed mb-6">
          {language === "ka"
            ? "ბარათით გადახდა ვერ დასრულდა. გთხოვთ შეამოწმოთ ბარათის მონაცემები, ბალანსი ან სცადოთ კურიერთან ნაღდი ანგარიშსწორებით გადახდა."
            : "The card payment could not be processed. Please check your card details, balance, or try paying cash on delivery."}
        </p>

        <button
          onClick={onClose}
          className="w-full py-3 bg-stone-900 hover:bg-stone-850 text-white font-bold rounded-xl shadow-md cursor-pointer transition-all duration-150 text-sm"
        >
          {language === "ka" ? "სცადეთ თავიდან" : "Try Again"}
        </button>
      </div>
    </div>
  );
};
