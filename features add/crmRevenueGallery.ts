// ============================================================
// backend/src/controllers/crmController.ts
// ============================================================
import { Request, Response } from "express";
import { db } from "../config/firebase";
import { COLLECTIONS } from "../models/firestoreSchema";

// GET /api/crm/clients
export const getAllClients = async (_req: Request, res: Response) => {
  try {
    const snap = await db
      .collection(COLLECTIONS.CLIENTS)
      .orderBy("totalVisits", "desc")
      .limit(200)
      .get();
    const clients = snap.docs.map((d) => ({ clientId: d.id, ...d.data() }));
    res.json(clients);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/crm/clients/vip
export const getVIPClients = async (_req: Request, res: Response) => {
  try {
    const snap = await db
      .collection(COLLECTIONS.CLIENTS)
      .where("isVIP", "==", true)
      .get();
    const clients = snap.docs.map((d) => ({ clientId: d.id, ...d.data() }));
    res.json(clients);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Called internally after each completed booking to upsert client record.
 */
export async function upsertClientRecord(
  phone: string,
  name: string,
  email: string,
  amount: number,
  bookingDate: string
): Promise<void> {
  const clientRef = db.collection(COLLECTIONS.CLIENTS).doc(phone);
  const doc = await clientRef.get();

  if (!doc.exists) {
    await clientRef.set({
      phoneNumber: phone,
      name,
      email,
      totalVisits: 1,
      totalSpent: amount,
      lastVisit: bookingDate,
      firstVisit: bookingDate,
      isVIP: false,
      tags: [],
    });
  } else {
    const data = doc.data()!;
    const newVisits = (data.totalVisits || 0) + 1;
    const newSpent  = (data.totalSpent  || 0) + amount;
    await clientRef.update({
      totalVisits: newVisits,
      totalSpent: newSpent,
      lastVisit: bookingDate,
      isVIP: newVisits >= 10 || newSpent >= 5000,
    });
  }
}

// ============================================================
// backend/src/controllers/revenueController.ts
// ============================================================
export const getRevenueStats = async (_req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const weekStart = getWeekStart();
    const monthStart = getMonthStart();

    // Today
    const todaySnap = await db
      .collection(COLLECTIONS.APPOINTMENTS)
      .where("date", "==", today)
      .where("status", "==", "completed")
      .get();

    let todayRevenue = 0;
    todaySnap.forEach((d) => { todayRevenue += d.data().totalAmount || 0; });

    // Month
    const monthSnap = await db
      .collection(COLLECTIONS.APPOINTMENTS)
      .where("date", ">=", monthStart)
      .where("status", "in", ["completed", "confirmed", "pending", "cancelled"])
      .get();

    let monthRevenue = 0, completedCount = 0, cancelledCount = 0;
    const hourCount: Record<string, number> = {};
    const serviceMap: Record<string, { count: number; revenue: number }> = {};
    const staffMap: Record<string, { name: string; count: number; revenue: number }> = {};
    const dailyMap: Record<string, { revenue: number; bookings: number }> = {};

    monthSnap.forEach((d) => {
      const a = d.data();
      if (a.status === "completed") {
        monthRevenue += a.totalAmount || 0;
        completedCount++;

        const hr = a.startTime?.split(":")?.[0] || "00";
        hourCount[hr] = (hourCount[hr] || 0) + 1;

        const sn = a.serviceName;
        if (!serviceMap[sn]) serviceMap[sn] = { count: 0, revenue: 0 };
        serviceMap[sn].count++;
        serviceMap[sn].revenue += a.totalAmount || 0;

        const sid = a.staffId;
        if (!staffMap[sid]) staffMap[sid] = { name: a.staffName, count: 0, revenue: 0 };
        staffMap[sid].count++;
        staffMap[sid].revenue += a.totalAmount || 0;

        if (!dailyMap[a.date]) dailyMap[a.date] = { revenue: 0, bookings: 0 };
        dailyMap[a.date].revenue += a.totalAmount || 0;
        dailyMap[a.date].bookings++;
      }
      if (a.status === "cancelled") cancelledCount++;
    });

    const peakHours = Object.entries(hourCount)
      .map(([hour, count]) => ({ hour: `${hour}:00`, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const revenueByDay = Object.entries(dailyMap)
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);

    const bookingsByService = Object.entries(serviceMap)
      .map(([serviceName, v]) => ({ serviceName, ...v }))
      .sort((a, b) => b.count - a.count);

    const topStaff = Object.entries(staffMap)
      .map(([staffId, v]) => ({ staffId, staffName: v.name, bookings: v.count, revenue: v.revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    res.json({
      todayRevenue,
      monthRevenue,
      totalBookings: monthSnap.size,
      completedBookings: completedCount,
      cancelledBookings: cancelledCount,
      peakHours,
      revenueByDay,
      bookingsByService,
      topStaff,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

function getWeekStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}

function getMonthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

// ============================================================
// backend/src/controllers/galleryController.ts
// ============================================================
import multer from "multer";
import path from "path";
import { v4 as uuid } from "uuid";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
export const uploadMiddleware = upload.single("image");

export const getGallery = async (req: Request, res: Response) => {
  try {
    let query = db.collection(COLLECTIONS.GALLERY).where("isPublished", "==", true);
    if (req.query.category) {
      query = query.where("category", "==", req.query.category) as any;
    }
    const snap = await (query as any).orderBy("uploadedAt", "desc").limit(100).get();
    const items = snap.docs.map((d: any) => ({ itemId: d.id, ...d.data() }));
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const uploadGalleryItem = async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const { storage: fbStorage } = await import("../config/firebase");
    const bucket = fbStorage.bucket();
    const itemId = uuid();
    const ext = path.extname(req.file.originalname) || ".jpg";
    const fileName = `gallery/${itemId}${ext}`;

    const fileRef = bucket.file(fileName);
    await fileRef.save(req.file.buffer, {
      metadata: { contentType: req.file.mimetype },
      public: true,
    });

    const imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    const data = {
      itemId,
      category:   req.body.category || "salon",
      imageUrl,
      caption:    req.body.caption || "",
      staffId:    req.body.staffId || null,
      staffName:  req.body.staffName || null,
      uploadedAt: new Date().toISOString(),
      isPublished: true,
    };

    await db.collection(COLLECTIONS.GALLERY).doc(itemId).set(data);
    res.status(201).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteGalleryItem = async (req: Request, res: Response) => {
  try {
    await db.collection(COLLECTIONS.GALLERY).doc(req.params.itemId).update({ isPublished: false });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
