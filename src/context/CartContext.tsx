import React, { createContext, useContext, useState, useEffect } from "react";

export interface Product {
  id: string;
  nameKa: string;
  nameEn: string;
  descriptionKa: string;
  descriptionEn: string;
  weight: string;
  price: number;
  image: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export const PRODUCTS: Product[] = [
  {
    id: "honey",
    nameKa: "თაფლი",
    nameEn: "Honey",
    descriptionKa: "მინდვრის ყვავილებისა და ცაცხვის თაფლი",
    descriptionEn: "Field flowers and linden honey",
    weight: "1.5 კგ",
    price: 35,
    image: "/honey.jpg",
  },
  {
    id: "crystallized",
    nameKa: "დაკრისტალებული თაფლი",
    nameEn: "Crystallized Honey",
    descriptionKa: "ბუნებრივად დაკრისტალებული მინდვრის ყვავილებისა და ცაცხვის თაფლი",
    descriptionEn: "Naturally crystallized field flowers and linden honey",
    weight: "1.5 კგ",
    price: 35,
    image: "/crystallized.jpg",
  },
  {
    id: "honeycomb",
    nameKa: "ფიჭა",
    nameEn: "Honeycomb",
    descriptionKa: "სრულიად ნატურალური ფიჭა",
    descriptionEn: "Completely natural honeycomb",
    weight: "1 კგ",
    price: 35,
    image: "/honeycomb.jpg",
  },
];

interface CartContextType {
  cart: CartItem[];
  addToCart: (productId: string) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: (open: boolean) => void;
  buyNow: (productId: string) => void;
  cartTotalItems: number;
  cartTotalSum: number;
  language: "ka" | "en";
  setLanguage: (lang: "ka" | "en") => void;
  activeTab: "catalog" | "tracking";
  setActiveTab: (tab: "catalog" | "tracking") => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem("beenaturals_cart");
    return saved ? JSON.parse(saved) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [language, setLanguage] = useState<"ka" | "en">("ka");
  const [activeTab, setActiveTab] = useState<"catalog" | "tracking">("catalog");

  useEffect(() => {
    localStorage.setItem("beenaturals_cart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (productId: string) => {
    const product = PRODUCTS.find((p) => p.id === productId);
    if (!product) return;

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === productId);
      if (existing) {
        return prevCart.map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const buyNow = (productId: string) => {
    const product = PRODUCTS.find((p) => p.id === productId);
    if (!product) return;

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === productId);
      if (existing) {
        return prevCart;
      }
      return [...prevCart, { product, quantity: 1 }];
    });
    setIsCheckoutOpen(true);
  };

  const cartTotalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotalSum = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        isCheckoutOpen,
        setIsCheckoutOpen,
        buyNow,
        cartTotalItems,
        cartTotalSum,
        language,
        setLanguage,
        activeTab,
        setActiveTab,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
