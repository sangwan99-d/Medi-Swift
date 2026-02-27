import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Medicine {
  id: string;
  name: string;
  genericName: string;
  price: number;
  originalPrice?: number;
  unit: string;
  isPrescriptionRequired: boolean;
  isScheduleX: boolean;
  requiresColdChain: boolean;
  pharmacyId: string;
  pharmacyName: string;
  category: string;
  imageEmoji: string;
}

export interface CartItem extends Medicine {
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  prescriptionUri: string | null;
  customerId: string;
  addItem: (medicine: Medicine) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setPrescription: (uri: string | null) => void;
  totalItems: number;
  totalPrice: number;
  requiresPrescription: boolean;
  hasColdChainItems: boolean;
  hasScheduleXItems: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [prescriptionUri, setPrescriptionUri] = useState<string | null>(null);
  const [customerId] = useState("customer-demo");

  useEffect(() => {
    AsyncStorage.getItem("cart").then((val) => {
      if (val) setItems(JSON.parse(val));
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem("cart", JSON.stringify(items));
  }, [items]);

  const addItem = (medicine: Medicine) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === medicine.id);
      if (existing) {
        return prev.map((i) => i.id === medicine.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...medicine, quantity: 1 }];
    });
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) { removeItem(id); return; }
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, quantity } : i));
  };

  const clearCart = () => {
    setItems([]);
    setPrescriptionUri(null);
    AsyncStorage.removeItem("cart");
  };

  const value = useMemo(() => ({
    items,
    prescriptionUri,
    customerId,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    setPrescription: setPrescriptionUri,
    totalItems: items.reduce((s, i) => s + i.quantity, 0),
    totalPrice: items.reduce((s, i) => s + i.price * i.quantity, 0),
    requiresPrescription: items.some((i) => i.isPrescriptionRequired),
    hasColdChainItems: items.some((i) => i.requiresColdChain),
    hasScheduleXItems: items.some((i) => i.isScheduleX),
  }), [items, prescriptionUri]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
