// ============================================================
// backend/src/controllers/slotController.ts
// ============================================================
import { Request, Response } from "express";
import { generateSlots } from "../services/slotEngine";
import { db } from "../config/firebase";
import { COLLECTIONS } from "../models/firestoreSchema";

export const getSlots = async (req: Request, res: Response) => {
  try {
    const { staffId, date, serviceId } = req.query as Record<string, string>;
    if (!staffId || !date || !serviceId) {
      return res.status(400).json({ error: "staffId, date, serviceId required" });
    }

    const svcDoc = await db.collection(COLLECTIONS.SERVICES || "services").doc(serviceId).get();
    if (!svcDoc.exists) return res.status(404).json({ error: "Service not found" });

    const duration = svcDoc.data()!.duration as number;
    const slots = await generateSlots(staffId, date, duration);

    res.json({ slots, serviceDuration: duration });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
