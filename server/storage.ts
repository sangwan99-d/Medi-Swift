export type OrderStatus =
  | "PENDING"
  | "STORE_ACCEPTED"
  | "PREPARING"
  | "RIDER_ASSIGNED"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "REJECTED";

export type ApprovalStatus = "PENDING_ADMIN_APPROVAL" | "APPROVED" | "REJECTED";

export interface CartItem {
  id: string;
  name: string;
  genericName: string;
  price: number;
  quantity: number;
  unit: string;
  isPrescriptionRequired: boolean;
  requiresColdChain: boolean;
  pharmacyId: string;
  pharmacyName: string;
  imageEmoji: string;
}

export interface Order {
  id: string;
  customerId: string;
  pharmacyId: string;
  pharmacyName: string;
  riderId?: string;
  riderName?: string;
  items: CartItem[];
  totalPrice: number;
  status: OrderStatus;
  prescriptionUri?: string;
  address: string;
  otp: string;
  hasColdChain: boolean;
  createdAt: string;
  updatedAt: string;
  substituteNote?: string;
  deliveryPhotoRequired: boolean;
  deliveryPhotoUri?: string;
  prescriptionVerified: boolean;
  walletSplit?: { pharmacy: number; rider: number; platform: number };
  rejectionReason?: string;
}

export interface PartnerUser {
  id: string;
  name: string;
  email: string;
  password: string;
  storeName: string;
  gstNumber: string;
  licenseDocUri?: string;
  pharmacyId: string;
  location: { lat: number; lng: number };
  status: ApprovalStatus;
  walletBalance: number;
  totalEarnings: number;
  isOpen: boolean;
  createdAt: string;
}

export interface RiderUser {
  id: string;
  name: string;
  email: string;
  password: string;
  vehicleType: string;
  licenseNumber: string;
  status: ApprovalStatus;
  isOnline: boolean;
  walletBalance: number;
  totalEarnings: number;
  currentOrderId?: string;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  pharmacyId: string;
  medicineId: string;
  name: string;
  genericName: string;
  price: number;
  unit: string;
  isInStock: boolean;
  suggestedSubstitute?: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  userRole: "partner" | "rider";
  type: "credit" | "debit";
  amount: number;
  description: string;
  orderId?: string;
  createdAt: string;
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

function genOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

class InMemoryStorage {
  orders: Map<string, Order> = new Map();
  partners: Map<string, PartnerUser> = new Map();
  riders: Map<string, RiderUser> = new Map();
  inventory: Map<string, InventoryItem> = new Map();
  walletTx: WalletTransaction[] = [];

  constructor() {
    this.seed();
    this.scheduleMidnightFlush();
  }

  private seed() {
    const p1: PartnerUser = {
      id: "partner-demo-001",
      name: "Raj Kapoor",
      email: "partner@demo.com",
      password: "demo123",
      storeName: "Apollo Pharmacy",
      gstNumber: "29AABCF1234A1Z1",
      pharmacyId: "ph1",
      location: { lat: 28.5355, lng: 77.3910 },
      status: "APPROVED",
      walletBalance: 4250,
      totalEarnings: 32400,
      isOpen: true,
      createdAt: new Date().toISOString(),
    };
    this.partners.set(p1.id, p1);

    const p2: PartnerUser = {
      id: "partner-demo-002",
      name: "Sunita Mehra",
      email: "sunita@medplus.com",
      password: "demo123",
      storeName: "MedPlus Sector 62",
      gstNumber: "27AABCF5678A1Z2",
      pharmacyId: "ph2",
      location: { lat: 28.6139, lng: 77.2090 },
      status: "PENDING_ADMIN_APPROVAL",
      walletBalance: 0,
      totalEarnings: 0,
      isOpen: false,
      createdAt: new Date().toISOString(),
    };
    this.partners.set(p2.id, p2);

    const r1: RiderUser = {
      id: "rider-demo-001",
      name: "Arjun Singh",
      email: "rider@demo.com",
      password: "demo123",
      vehicleType: "Bike",
      licenseNumber: "UP80-2024-1234567",
      status: "APPROVED",
      isOnline: true,
      walletBalance: 1180,
      totalEarnings: 8600,
      createdAt: new Date().toISOString(),
    };
    this.riders.set(r1.id, r1);

    const r2: RiderUser = {
      id: "rider-demo-002",
      name: "Priya Verma",
      email: "priya@rider.com",
      password: "demo123",
      vehicleType: "Scooter",
      licenseNumber: "DL05-2023-9876543",
      status: "PENDING_ADMIN_APPROVAL",
      isOnline: false,
      walletBalance: 0,
      totalEarnings: 0,
      createdAt: new Date().toISOString(),
    };
    this.riders.set(r2.id, r2);

    const seedMeds = [
      { id: "m1", name: "Paracetamol 500mg", genericName: "Acetaminophen", price: 32, unit: "Strip of 10", inStock: true },
      { id: "m2", name: "Ibuprofen 400mg", genericName: "Ibuprofen", price: 48, unit: "Strip of 10", inStock: true },
      { id: "m3", name: "Amoxicillin 500mg", genericName: "Amoxicillin", price: 120, unit: "Strip of 10", inStock: true },
      { id: "m4", name: "Azithromycin 500mg", genericName: "Azithromycin", price: 95, unit: "Strip of 5", inStock: false },
      { id: "m5", name: "Vitamin D3 60K IU", genericName: "Cholecalciferol", price: 85, unit: "Strip of 4", inStock: true },
      { id: "m6", name: "Vitamin B12 1500mcg", genericName: "Methylcobalamin", price: 110, unit: "Strip of 10", inStock: true },
      { id: "m7", name: "Insulin Glargine", genericName: "Insulin Glargine", price: 1200, unit: "1 Vial", inStock: true },
      { id: "m8", name: "Metformin 500mg", genericName: "Metformin HCl", price: 42, unit: "Strip of 15", inStock: false },
      { id: "m9", name: "Atorvastatin 10mg", genericName: "Atorvastatin", price: 65, unit: "Strip of 10", inStock: true },
      { id: "m10", name: "Omeprazole 20mg", genericName: "Omeprazole", price: 55, unit: "Strip of 10", inStock: true },
      { id: "m11", name: "Cetirizine 10mg", genericName: "Cetirizine HCl", price: 28, unit: "Strip of 10", inStock: true },
      { id: "m12", name: "Amlodipine 5mg", genericName: "Amlodipine", price: 38, unit: "Strip of 10", inStock: true },
    ];
    for (const m of seedMeds) {
      const item: InventoryItem = {
        id: genId(),
        pharmacyId: "ph1",
        medicineId: m.id,
        name: m.name,
        genericName: m.genericName,
        price: m.price,
        unit: m.unit,
        isInStock: m.inStock,
        suggestedSubstitute: !m.inStock ? `Generic ${m.genericName}` : undefined,
      };
      this.inventory.set(item.id, item);
    }

    const demoOrder: Order = {
      id: "order-demo-001",
      customerId: "customer-demo",
      pharmacyId: "ph1",
      pharmacyName: "Apollo Pharmacy",
      items: [
        { id: "m1", name: "Paracetamol 500mg", genericName: "Acetaminophen", price: 32, quantity: 2, unit: "Strip of 10", isPrescriptionRequired: false, requiresColdChain: false, pharmacyId: "ph1", pharmacyName: "Apollo Pharmacy", imageEmoji: "💊" },
        { id: "m3", name: "Amoxicillin 500mg", genericName: "Amoxicillin", price: 120, quantity: 1, unit: "Strip of 10", isPrescriptionRequired: true, requiresColdChain: false, pharmacyId: "ph1", pharmacyName: "Apollo Pharmacy", imageEmoji: "💉" },
      ],
      totalPrice: 184,
      status: "PENDING",
      address: "42, MG Road, Sector 18, Noida",
      otp: genOTP(),
      hasColdChain: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deliveryPhotoRequired: false,
      prescriptionVerified: false,
    };
    this.orders.set(demoOrder.id, demoOrder);
  }

  private scheduleMidnightFlush() {
    const checkMidnight = () => {
      const now = new Date();
      if (now.getHours() === 23 && now.getMinutes() === 59 && now.getSeconds() >= 58) {
        this.midnightFlush();
      }
    };
    setInterval(checkMidnight, 1000);
  }

  midnightFlush() {
    const activeStatuses: OrderStatus[] = ["RIDER_ASSIGNED", "IN_TRANSIT"];
    for (const [id, rider] of this.riders.entries()) {
      const hasActive = rider.currentOrderId
        ? (() => { const o = this.orders.get(rider.currentOrderId!); return o && activeStatuses.includes(o.status); })()
        : false;
      if (!hasActive) this.riders.set(id, { ...rider, isOnline: false });
    }
    for (const [id, partner] of this.partners.entries()) {
      this.partners.set(id, { ...partner, isOpen: false });
    }
    console.log("[Midnight Flush] All statuses reset at 23:59");
  }

  createOrder(data: Omit<Order, "id" | "otp" | "updatedAt" | "prescriptionVerified" | "deliveryPhotoRequired">): Order {
    const order: Order = {
      ...data,
      id: genId(),
      otp: genOTP(),
      updatedAt: new Date().toISOString(),
      prescriptionVerified: false,
      deliveryPhotoRequired: data.totalPrice >= 500,
    };
    this.orders.set(order.id, order);
    return order;
  }

  updateOrder(id: string, patch: Partial<Order>): Order | null {
    const order = this.orders.get(id);
    if (!order) return null;
    const updated = { ...order, ...patch, updatedAt: new Date().toISOString() };
    this.orders.set(id, updated);
    return updated;
  }

  getOrdersByPharmacy(pharmacyId: string): Order[] {
    return Array.from(this.orders.values())
      .filter((o) => o.pharmacyId === pharmacyId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getPendingOrdersForRider(): Order[] {
    return Array.from(this.orders.values()).filter(
      (o) => o.status === "PREPARING" && !o.riderId
    );
  }

  getOrdersByCustomer(customerId: string): Order[] {
    return Array.from(this.orders.values())
      .filter((o) => o.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getAllOrders(): Order[] {
    return Array.from(this.orders.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  createPartner(data: Omit<PartnerUser, "id" | "walletBalance" | "totalEarnings" | "createdAt" | "isOpen">): PartnerUser {
    const partner: PartnerUser = { ...data, id: genId(), walletBalance: 0, totalEarnings: 0, isOpen: false, createdAt: new Date().toISOString() };
    this.partners.set(partner.id, partner);
    return partner;
  }

  findPartnerByEmail(email: string): PartnerUser | undefined {
    return Array.from(this.partners.values()).find((p) => p.email === email);
  }

  createRider(data: Omit<RiderUser, "id" | "walletBalance" | "totalEarnings" | "isOnline" | "createdAt">): RiderUser {
    const rider: RiderUser = { ...data, id: genId(), walletBalance: 0, totalEarnings: 0, isOnline: false, createdAt: new Date().toISOString() };
    this.riders.set(rider.id, rider);
    return rider;
  }

  findRiderByEmail(email: string): RiderUser | undefined {
    return Array.from(this.riders.values()).find((r) => r.email === email);
  }

  getOnlineRiders(): RiderUser[] {
    return Array.from(this.riders.values()).filter((r) => r.isOnline && r.status === "APPROVED");
  }

  assignRiderToOrder(orderId: string): RiderUser | null {
    const onlineRiders = this.getOnlineRiders().filter((r) => !r.currentOrderId);
    if (onlineRiders.length === 0) return null;
    const rider = onlineRiders[0];
    this.riders.set(rider.id, { ...rider, currentOrderId: orderId });
    this.updateOrder(orderId, { riderId: rider.id, riderName: rider.name, status: "RIDER_ASSIGNED" });
    return rider;
  }

  processDeliveryPayment(order: Order) {
    const platform = Math.round(order.totalPrice * 0.1);
    const riderCut = Math.round(order.totalPrice * 0.1);
    const pharmacyCut = order.totalPrice - platform - riderCut;
    const partner = Array.from(this.partners.values()).find((p) => p.pharmacyId === order.pharmacyId);
    if (partner) {
      this.partners.set(partner.id, { ...partner, walletBalance: partner.walletBalance + pharmacyCut, totalEarnings: partner.totalEarnings + pharmacyCut });
      this.walletTx.push({ id: genId(), userId: partner.id, userRole: "partner", type: "credit", amount: pharmacyCut, description: `Order #${order.id.slice(-6).toUpperCase()} payment`, orderId: order.id, createdAt: new Date().toISOString() });
    }
    if (order.riderId) {
      const rider = this.riders.get(order.riderId);
      if (rider) {
        this.riders.set(rider.id, { ...rider, walletBalance: rider.walletBalance + riderCut, totalEarnings: rider.totalEarnings + riderCut, currentOrderId: undefined });
        this.walletTx.push({ id: genId(), userId: rider.id, userRole: "rider", type: "credit", amount: riderCut, description: `Delivery #${order.id.slice(-6).toUpperCase()} earnings`, orderId: order.id, createdAt: new Date().toISOString() });
      }
    }
    this.updateOrder(order.id, { walletSplit: { pharmacy: pharmacyCut, rider: riderCut, platform } });
  }

  getAdminStats() {
    const allOrders = this.getAllOrders();
    const delivered = allOrders.filter((o) => o.status === "DELIVERED");
    const totalRevenue = delivered.reduce((s, o) => s + o.totalPrice, 0);
    const platformCommission = delivered.reduce((s, o) => s + (o.walletSplit?.platform || Math.round(o.totalPrice * 0.1)), 0);
    const totalRiderEarnings = delivered.reduce((s, o) => s + (o.walletSplit?.rider || 0), 0);
    const totalPharmacyPayouts = delivered.reduce((s, o) => s + (o.walletSplit?.pharmacy || 0), 0);
    return {
      totalOrders: allOrders.length,
      activeOrders: allOrders.filter((o) => !["DELIVERED", "REJECTED"].includes(o.status)).length,
      deliveredOrders: delivered.length,
      totalRevenue,
      platformCommission,
      totalRiderEarnings,
      totalPharmacyPayouts,
      pendingPartners: Array.from(this.partners.values()).filter((p) => p.status === "PENDING_ADMIN_APPROVAL").length,
      pendingRiders: Array.from(this.riders.values()).filter((r) => r.status === "PENDING_ADMIN_APPROVAL").length,
      onlineRiders: this.getOnlineRiders().length,
    };
  }
}

export const storage = new InMemoryStorage();
