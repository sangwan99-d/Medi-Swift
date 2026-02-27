import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {

  // ── Customer ──────────────────────────────────────────────
  app.post("/api/orders", (req: Request, res: Response) => {
    const { items, totalPrice, prescriptionUri, address, customerId, pharmacyId, pharmacyName, hasColdChain } = req.body;
    if (!items || !totalPrice || !address) return res.status(400).json({ message: "Missing required fields" });
    const order = storage.createOrder({ customerId: customerId || "anon", pharmacyId: pharmacyId || "ph1", pharmacyName: pharmacyName || "Pharmacy", items, totalPrice, prescriptionUri, address, hasColdChain: !!hasColdChain, status: "PENDING", createdAt: new Date().toISOString(), substituteNote: undefined, deliveryPhotoUri: undefined });
    return res.json(order);
  });

  app.get("/api/orders/customer/:customerId", (req: Request, res: Response) => {
    const orders = storage.getOrdersByCustomer(req.params.customerId);
    return res.json(orders);
  });

  app.get("/api/orders/:orderId", (req: Request, res: Response) => {
    const order = storage.orders.get(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    return res.json(order);
  });

  // ── Partner Auth ────────────────────────────────────────────
  app.post("/api/partner/register", (req: Request, res: Response) => {
    const { name, email, password, storeName, gstNumber, pharmacyId } = req.body;
    if (!name || !email || !password || !storeName || !gstNumber) return res.status(400).json({ message: "All fields required" });
    if (storage.findPartnerByEmail(email)) return res.status(409).json({ message: "Email already registered" });
    const partner = storage.createPartner({ name, email, password, storeName, gstNumber, pharmacyId: pharmacyId || `ph-${Date.now()}`, location: { lat: 28.5355, lng: 77.391 }, status: "PENDING_ADMIN_APPROVAL" });
    const { password: _, ...safe } = partner;
    return res.json(safe);
  });

  app.post("/api/partner/login", (req: Request, res: Response) => {
    const { email, password } = req.body;
    const partner = storage.findPartnerByEmail(email);
    if (!partner || partner.password !== password) return res.status(401).json({ message: "Invalid credentials" });
    const { password: _, ...safe } = partner;
    return res.json(safe);
  });

  app.get("/api/partner/:partnerId", (req: Request, res: Response) => {
    const partner = storage.partners.get(req.params.partnerId);
    if (!partner) return res.status(404).json({ message: "Not found" });
    const { password: _, ...safe } = partner;
    return res.json(safe);
  });

  app.patch("/api/partner/:partnerId/status", (req: Request, res: Response) => {
    const partner = storage.partners.get(req.params.partnerId);
    if (!partner) return res.status(404).json({ message: "Not found" });
    const updated = { ...partner, isOpen: req.body.isOpen ?? partner.isOpen };
    storage.partners.set(partner.id, updated);
    const { password: _, ...safe } = updated;
    return res.json(safe);
  });

  // ── Partner Orders ─────────────────────────────────────────
  app.get("/api/partner/:partnerId/orders", (req: Request, res: Response) => {
    const partner = storage.partners.get(req.params.partnerId);
    if (!partner) return res.status(404).json({ message: "Not found" });
    const orders = storage.getOrdersByPharmacy(partner.pharmacyId);
    return res.json(orders);
  });

  app.patch("/api/partner/orders/:orderId/accept", (req: Request, res: Response) => {
    const order = storage.orders.get(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    const updated = storage.updateOrder(order.id, { status: "STORE_ACCEPTED", prescriptionVerified: req.body.prescriptionVerified ?? false });
    return res.json(updated);
  });

  app.patch("/api/partner/orders/:orderId/prepare", (req: Request, res: Response) => {
    const order = storage.orders.get(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    const updated = storage.updateOrder(order.id, { status: "PREPARING", substituteNote: req.body.substituteNote });
    // Auto-assign rider
    setTimeout(() => { storage.assignRiderToOrder(order.id); }, 3000);
    return res.json(updated);
  });

  app.patch("/api/partner/orders/:orderId/reject", (req: Request, res: Response) => {
    const order = storage.orders.get(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    const updated = storage.updateOrder(order.id, { status: "REJECTED", rejectionReason: req.body.reason });
    return res.json(updated);
  });

  // ── Partner Inventory ───────────────────────────────────────
  app.get("/api/partner/:partnerId/inventory", (req: Request, res: Response) => {
    const partner = storage.partners.get(req.params.partnerId);
    if (!partner) return res.status(404).json({ message: "Not found" });
    const inv = Array.from(storage.inventory.values()).filter((i) => i.pharmacyId === partner.pharmacyId);
    return res.json(inv);
  });

  app.patch("/api/inventory/:itemId", (req: Request, res: Response) => {
    const item = storage.inventory.get(req.params.itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });
    const updated = { ...item, isInStock: req.body.isInStock ?? item.isInStock, suggestedSubstitute: req.body.suggestedSubstitute ?? item.suggestedSubstitute };
    storage.inventory.set(item.id, updated);
    return res.json(updated);
  });

  // ── Rider Auth ─────────────────────────────────────────────
  app.post("/api/rider/register", (req: Request, res: Response) => {
    const { name, email, password, vehicleType, licenseNumber } = req.body;
    if (!name || !email || !password || !vehicleType || !licenseNumber) return res.status(400).json({ message: "All fields required" });
    if (storage.findRiderByEmail(email)) return res.status(409).json({ message: "Email already registered" });
    const rider = storage.createRider({ name, email, password, vehicleType, licenseNumber, status: "PENDING_ADMIN_APPROVAL" });
    const { password: _, ...safe } = rider;
    return res.json(safe);
  });

  app.post("/api/rider/login", (req: Request, res: Response) => {
    const { email, password } = req.body;
    const rider = storage.findRiderByEmail(email);
    if (!rider || rider.password !== password) return res.status(401).json({ message: "Invalid credentials" });
    const { password: _, ...safe } = rider;
    return res.json(safe);
  });

  app.get("/api/rider/:riderId", (req: Request, res: Response) => {
    const rider = storage.riders.get(req.params.riderId);
    if (!rider) return res.status(404).json({ message: "Not found" });
    const { password: _, ...safe } = rider;
    return res.json(safe);
  });

  app.patch("/api/rider/:riderId/online", (req: Request, res: Response) => {
    const rider = storage.riders.get(req.params.riderId);
    if (!rider) return res.status(404).json({ message: "Not found" });
    const updated = { ...rider, isOnline: req.body.isOnline ?? rider.isOnline };
    storage.riders.set(rider.id, updated);
    const { password: _, ...safe } = updated;
    return res.json(safe);
  });

  app.get("/api/rider/:riderId/available-orders", (req: Request, res: Response) => {
    const rider = storage.riders.get(req.params.riderId);
    if (!rider || !rider.isOnline) return res.json([]);
    const orders = storage.getPendingOrdersForRider();
    return res.json(orders);
  });

  app.get("/api/rider/:riderId/current-order", (req: Request, res: Response) => {
    const rider = storage.riders.get(req.params.riderId);
    if (!rider || !rider.currentOrderId) return res.json(null);
    const order = storage.orders.get(rider.currentOrderId);
    return res.json(order || null);
  });

  app.post("/api/rider/:riderId/accept/:orderId", (req: Request, res: Response) => {
    const rider = storage.riders.get(req.params.riderId);
    if (!rider) return res.status(404).json({ message: "Rider not found" });
    const order = storage.orders.get(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    storage.riders.set(rider.id, { ...rider, currentOrderId: order.id });
    const updated = storage.updateOrder(order.id, { riderId: rider.id, riderName: rider.name, status: "RIDER_ASSIGNED" });
    return res.json(updated);
  });

  app.post("/api/rider/:riderId/pickup/:orderId", (req: Request, res: Response) => {
    const order = storage.orders.get(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    const updated = storage.updateOrder(order.id, { status: "IN_TRANSIT" });
    return res.json(updated);
  });

  app.post("/api/rider/:riderId/deliver/:orderId", (req: Request, res: Response) => {
    const { otp, deliveryPhotoUri } = req.body;
    const order = storage.orders.get(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });
    if (order.deliveryPhotoRequired && !deliveryPhotoUri) return res.status(400).json({ message: "Delivery photo required for high-value order" });
    const updated = storage.updateOrder(order.id, { status: "DELIVERED", deliveryPhotoUri });
    if (updated) storage.processDeliveryPayment(updated);
    const rider = storage.riders.get(req.params.riderId);
    if (rider) storage.riders.set(rider.id, { ...rider, currentOrderId: undefined });
    return res.json(updated);
  });

  app.get("/api/rider/:riderId/wallet", (req: Request, res: Response) => {
    const rider = storage.riders.get(req.params.riderId);
    if (!rider) return res.status(404).json({ message: "Not found" });
    const txs = storage.walletTx.filter((t) => t.userId === req.params.riderId);
    const { password: _, ...safe } = rider;
    return res.json({ rider: safe, transactions: txs });
  });

  // ── Admin ────────────────────────────────────────────────────
  app.post("/api/admin/login", (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (email === "admin@demo.com" && password === "admin123") {
      return res.json({ id: "admin-001", name: "Admin", email, role: "admin" });
    }
    return res.status(401).json({ message: "Invalid admin credentials" });
  });

  app.get("/api/admin/stats", (_req: Request, res: Response) => {
    return res.json(storage.getAdminStats());
  });

  app.get("/api/admin/partners", (_req: Request, res: Response) => {
    const partners = Array.from(storage.partners.values()).map(({ password: _, ...p }) => p);
    return res.json(partners);
  });

  app.get("/api/admin/riders", (_req: Request, res: Response) => {
    const riders = Array.from(storage.riders.values()).map(({ password: _, ...r }) => r);
    return res.json(riders);
  });

  app.get("/api/admin/orders", (_req: Request, res: Response) => {
    return res.json(storage.getAllOrders());
  });

  app.post("/api/admin/partners/:partnerId/approve", (req: Request, res: Response) => {
    const partner = storage.partners.get(req.params.partnerId);
    if (!partner) return res.status(404).json({ message: "Not found" });
    storage.partners.set(partner.id, { ...partner, status: "APPROVED" });
    const { password: _, ...safe } = storage.partners.get(partner.id)!;
    return res.json(safe);
  });

  app.post("/api/admin/partners/:partnerId/reject", (req: Request, res: Response) => {
    const partner = storage.partners.get(req.params.partnerId);
    if (!partner) return res.status(404).json({ message: "Not found" });
    storage.partners.set(partner.id, { ...partner, status: "REJECTED" });
    const { password: _, ...safe } = storage.partners.get(partner.id)!;
    return res.json(safe);
  });

  app.post("/api/admin/riders/:riderId/approve", (req: Request, res: Response) => {
    const rider = storage.riders.get(req.params.riderId);
    if (!rider) return res.status(404).json({ message: "Not found" });
    storage.riders.set(rider.id, { ...rider, status: "APPROVED" });
    const { password: _, ...safe } = storage.riders.get(rider.id)!;
    return res.json(safe);
  });

  app.post("/api/admin/riders/:riderId/reject", (req: Request, res: Response) => {
    const rider = storage.riders.get(req.params.riderId);
    if (!rider) return res.status(404).json({ message: "Not found" });
    storage.riders.set(rider.id, { ...rider, status: "REJECTED" });
    const { password: _, ...safe } = storage.riders.get(rider.id)!;
    return res.json(safe);
  });

  app.post("/api/admin/midnight-flush", (_req: Request, res: Response) => {
    storage.midnightFlush();
    return res.json({ message: "Midnight flush executed" });
  });

  const httpServer = createServer(app);
  return httpServer;
}
