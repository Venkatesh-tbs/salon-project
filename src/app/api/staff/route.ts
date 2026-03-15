import { NextResponse } from "next/server";
import { db } from "@/firebase";
import { ref, get, set, remove, push } from "firebase/database";
import { v4 as uuid } from "uuid";

// Default staff array for auto-initialization if none exists
const DEFAULT_STAFF = [
  { staffId: "stf_01", name: "Marcus", role: "Master Barber", services: ["svc_001", "svc_002", "svc_008"], isActive: true, totalBookings: 120, rating: 4.9, avatar: "" },
  { staffId: "stf_02", name: "Elena", role: "Senior Stylist", services: ["svc_003", "svc_004", "svc_007"], isActive: true, totalBookings: 85, rating: 4.8, avatar: "" },
  { staffId: "stf_03", name: "David", role: "Coloring Expert", services: ["svc_002", "svc_005"], isActive: true, totalBookings: 92, rating: 4.9, avatar: "" }
];

// Ensure default staff exist
async function initDefaultStaff() {
  const staffRef = ref(db, "staff");
  const snapshot = await get(staffRef);
  if (!snapshot.exists()) {
    for (const st of DEFAULT_STAFF) {
      await set(ref(db, `staff/${st.staffId}`), st);
    }
    return DEFAULT_STAFF;
  }
  return snapshot.val();
}

export async function GET() {
  try {
    const data = await initDefaultStaff();
    const staffList = Object.values(data).filter((s: any) => s.isActive);
    return NextResponse.json(staffList);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const staffId = uuid();
    const data = { ...body, staffId, isActive: true, totalBookings: 0, rating: 5, services: body.services || [] };
    
    await set(ref(db, `staff/${staffId}`), data);
    return NextResponse.json({ staffId }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
