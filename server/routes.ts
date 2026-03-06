import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Razorpay from "razorpay";
import { storage } from "./storage";

// Initialize Razorpay instance (uses env vars; falls back to test keys for development)
const razorpayKeyId = process.env.RAZORPAY_KEY_ID || "";
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || "";
const razorpayEnabled = !!(razorpayKeyId && razorpayKeySecret);

let razorpayInstance: Razorpay | null = null;
if (razorpayEnabled) {
  razorpayInstance = new Razorpay({
    key_id: razorpayKeyId,
    key_secret: razorpayKeySecret,
  });
  console.log("[Payment] Razorpay initialized with provided credentials");
} else {
  console.warn("[Payment] RAZORPAY_KEY_ID and/or RAZORPAY_KEY_SECRET not set. Payment gateway running in demo mode.");
}

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

  app.post("/api/partner/:partnerId/inventory", (req: Request, res: Response) => {
    const partner = storage.partners.get(req.params.partnerId);
    if (!partner) return res.status(404).json({ message: "Partner not found" });
    const { name, genericName, price, unit, suggestedSubstitute } = req.body;
    if (!name || !genericName || !price || !unit) return res.status(400).json({ message: "Missing required fields" });
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
    const item = {
      id,
      pharmacyId: partner.pharmacyId,
      medicineId: `custom-${id}`,
      name,
      genericName,
      price: Number(price),
      unit,
      isInStock: true,
      suggestedSubstitute: suggestedSubstitute || undefined,
    };
    storage.inventory.set(item.id, item);
    return res.json(item);
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

  // ── Payment (Razorpay) ────────────────────────────────────
  app.post("/api/payment/create-order", async (req: Request, res: Response) => {
    const { amount, currency, customerName, customerEmail, customerPhone } = req.body;
    if (!amount) return res.status(400).json({ message: "Amount is required" });

    const amountInPaise = Math.round(Number(amount) * 100);
    const orderCurrency = currency || "INR";

    if (razorpayEnabled && razorpayInstance) {
      try {
        const razorpayOrder = await razorpayInstance.orders.create({
          amount: amountInPaise,
          currency: orderCurrency,
          receipt: "rcpt_" + Date.now().toString(36),
          notes: {
            customerName: customerName || "Customer",
            customerEmail: customerEmail || "",
            customerPhone: customerPhone || "",
          },
        });

        return res.json({
          id: razorpayOrder.id,
          razorpayOrderId: razorpayOrder.id,
          amount: Number(amount),
          amountInPaise: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          status: razorpayOrder.status,
          razorpayKeyId: razorpayKeyId,
          customerName: customerName || "Customer",
          customerEmail: customerEmail || "",
          customerPhone: customerPhone || "",
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error("[Payment] Razorpay order creation failed:", err);
        return res.status(500).json({ message: "Failed to create payment order" });
      }
    }

    // Demo mode fallback when Razorpay credentials are not configured
    const demoOrderId = "order_demo_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 8);
    return res.json({
      id: demoOrderId,
      razorpayOrderId: demoOrderId,
      amount: Number(amount),
      amountInPaise: amountInPaise,
      currency: orderCurrency,
      status: "created",
      razorpayKeyId: "rzp_test_demo_key",
      customerName: customerName || "Customer",
      customerEmail: customerEmail || "",
      customerPhone: customerPhone || "",
      createdAt: new Date().toISOString(),
      demo: true,
    });
  });

  app.post("/api/payment/verify", (req: Request, res: Response) => {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentMethod } = req.body;
    if (!razorpayOrderId || !razorpayPaymentId) {
      return res.status(400).json({ message: "Order ID and Payment ID are required" });
    }

    if (razorpayEnabled) {
      if (!razorpaySignature) {
        return res.status(400).json({ message: "Signature is required for verification" });
      }
      // Verify the payment signature using HMAC SHA256
      const expectedSignature = createHmac("sha256", razorpayKeySecret)
        .update(razorpayOrderId + "|" + razorpayPaymentId)
        .digest("hex");

      const isValid = expectedSignature === razorpaySignature;
      if (!isValid) {
        return res.json({
          verified: false,
          message: "Payment signature verification failed",
        });
      }

      return res.json({
        verified: true,
        paymentId: razorpayPaymentId,
        orderId: razorpayOrderId,
        method: paymentMethod || "upi",
        status: "captured",
      });
    }

    // Demo mode: always verify successfully
    return res.json({
      verified: true,
      paymentId: razorpayPaymentId || "pay_demo_" + Date.now().toString(36),
      orderId: razorpayOrderId,
      method: paymentMethod || "upi",
      status: "captured",
      demo: true,
    });
  });

  // Serve Razorpay checkout page (used by mobile app via WebBrowser)
  app.get("/api/payment/checkout", (req: Request, res: Response) => {
    const { orderId, amount, currency, customerName, customerEmail, customerPhone } = req.query;
    if (!orderId || !amount) {
      return res.status(400).send("Missing required parameters: orderId, amount");
    }

    const templatePath = resolve(process.cwd(), "server", "templates", "razorpay-checkout.html");
    let html = readFileSync(templatePath, "utf-8");

    const amountNum = Number(amount);
    const amountInPaise = Math.round(amountNum * 100);
    const displayAmount = "\u20B9" + amountNum.toLocaleString("en-IN");

    // Build the callback URL
    const forwardedProto = req.header("x-forwarded-proto") || req.protocol || "https";
    const forwardedHost = req.header("x-forwarded-host") || req.get("host");
    const baseUrl = `${forwardedProto}://${forwardedHost}`;
    const callbackUrl = `${baseUrl}/api/payment/callback`;

    html = html
      .replace(/RAZORPAY_KEY_PLACEHOLDER/g, razorpayKeyId || "rzp_test_demo_key")
      .replace(/ORDER_ID_PLACEHOLDER/g, String(orderId))
      .replace(/AMOUNT_RAW_PLACEHOLDER/g, String(amountInPaise))
      .replace(/AMOUNT_PLACEHOLDER/g, displayAmount)
      .replace(/CURRENCY_PLACEHOLDER/g, String(currency || "INR"))
      .replace(/CUSTOMER_NAME_PLACEHOLDER/g, String(customerName || "Customer"))
      .replace(/CUSTOMER_EMAIL_PLACEHOLDER/g, String(customerEmail || ""))
      .replace(/CUSTOMER_PHONE_PLACEHOLDER/g, String(customerPhone || ""))
      .replace(/CALLBACK_URL_PLACEHOLDER/g, callbackUrl)
      .replace(/APP_SCHEME_PLACEHOLDER/g, "medswift");

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  });

  // Handle payment callback and redirect back to app
  app.get("/api/payment/callback", (req: Request, res: Response) => {
    const { status, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.query;

    if (status === "success" && razorpay_order_id && razorpay_payment_id && razorpay_signature) {
      // Redirect back to app with payment details via deep link
      const deepLink = `medswift://payment-callback?status=success&razorpay_order_id=${razorpay_order_id}&razorpay_payment_id=${razorpay_payment_id}&razorpay_signature=${razorpay_signature}`;
      return res.redirect(deepLink);
    }

    // Payment failed or cancelled
    const deepLink = `medswift://payment-callback?status=${status || "failed"}`;
    return res.redirect(deepLink);
  });

  const httpServer = createServer(app);
  return httpServer;
}
