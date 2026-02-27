import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CartItem } from "./CartContext";

export type OrderStatus = "pending" | "confirmed" | "preparing" | "dispatched" | "delivered";

export interface Order {
  id: string;
  items: CartItem[];
  totalPrice: number;
  status: OrderStatus;
  pharmacyName: string;
  createdAt: string;
  estimatedMinutes: number;
  hasColdChain: boolean;
  prescriptionUri: string | null;
  address: string;
}

interface OrdersContextValue {
  orders: Order[];
  placeOrder: (params: {
    items: CartItem[];
    totalPrice: number;
    prescriptionUri: string | null;
    address: string;
  }) => Order;
}

const OrdersContext = createContext<OrdersContextValue | null>(null);

const STATUS_SEQUENCE: OrderStatus[] = ["pending", "confirmed", "preparing", "dispatched", "delivered"];

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    AsyncStorage.getItem("orders").then((val) => {
      if (val) setOrders(JSON.parse(val));
    });
  }, []);

  const saveOrders = (newOrders: Order[]) => {
    setOrders(newOrders);
    AsyncStorage.setItem("orders", JSON.stringify(newOrders));
  };

  const placeOrder = ({
    items,
    totalPrice,
    prescriptionUri,
    address,
  }: {
    items: CartItem[];
    totalPrice: number;
    prescriptionUri: string | null;
    address: string;
  }): Order => {
    const order: Order = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      items,
      totalPrice,
      status: "pending",
      pharmacyName: items[0]?.pharmacyName || "MedSwift Pharmacy",
      createdAt: new Date().toISOString(),
      estimatedMinutes: 10,
      hasColdChain: items.some((i) => i.requiresColdChain),
      prescriptionUri,
      address,
    };
    const updated = [order, ...orders];
    saveOrders(updated);

    // Simulate status progression
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step >= STATUS_SEQUENCE.length) {
        clearInterval(interval);
        return;
      }
      const nextStatus = STATUS_SEQUENCE[step];
      setOrders((prev) => {
        const updated = prev.map((o) =>
          o.id === order.id ? { ...o, status: nextStatus } : o
        );
        AsyncStorage.setItem("orders", JSON.stringify(updated));
        return updated;
      });
    }, 15000);

    return order;
  };

  const value = useMemo(() => ({ orders, placeOrder }), [orders]);

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders must be used within OrdersProvider");
  return ctx;
}
