// ============================================================
// backend/src/controllers/staffController.ts
// ============================================================
import { Request, Response } from "express";
import { db } from "../config/firebase";
import { COLLECTIONS } from "../models/firestoreSchema";
import { v4 as uuid } from "uuid";

// GET /api/staff — all active staff
export const getAllStaff = async (_req: Request, res: Response) => {
  try {
    const snap = await db.collection(COLLECTIONS.STAFF).where("isActive", "==", true).get();
    const staff = snap.docs.map((d) => ({ staffId: d.id, ...d.data() }));
    res.json(staff);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/staff/:staffId
export const getStaffById = async (req: Request, res: Response) => {
  try {
    const doc = await db.collection(COLLECTIONS.STAFF).doc(req.params.staffId).get();
    if (!doc.exists) return res.status(404).json({ error: "Staff not found" });
    res.json({ staffId: doc.id, ...doc.data() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/staff/for-service/:serviceId — staff who can perform a service
export const getStaffForService = async (req: Request, res: Response) => {
  try {
    const snap = await db
      .collection(COLLECTIONS.STAFF)
      .where("services", "array-contains", req.params.serviceId)
      .where("isActive", "==", true)
      .get();
    const staff = snap.docs.map((d) => ({ staffId: d.id, ...d.data() }));
    res.json(staff);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/staff — create (admin only)
export const createStaff = async (req: Request, res: Response) => {
  try {
    const staffId = uuid();
    const data = { ...req.body, staffId, isActive: true, totalBookings: 0, rating: 5 };
    await db.collection(COLLECTIONS.STAFF).doc(staffId).set(data);
    res.status(201).json({ staffId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/staff/:staffId — update
export const updateStaff = async (req: Request, res: Response) => {
  try {
    await db.collection(COLLECTIONS.STAFF).doc(req.params.staffId).update(req.body);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/staff/:staffId — soft delete
export const deleteStaff = async (req: Request, res: Response) => {
  try {
    await db.collection(COLLECTIONS.STAFF).doc(req.params.staffId).update({ isActive: false });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
