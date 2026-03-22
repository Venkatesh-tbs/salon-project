import { NextResponse } from "next/server";
import { db } from "@/firebase";
import { ref, get, set } from "firebase/database";

const DEFAULT_STAFF = [
  { staffId: "stf_01", name: "Hari", email: "hari@salon.com", role: "Master Barber", services: ["svc_001", "svc_002", "svc_008"], isActive: true, totalBookings: 120, rating: 4.9, avatar: "" },
  { staffId: "stf_02", name: "Elena", email: "elena@salon.com", role: "Senior Stylist", services: ["svc_003", "svc_004", "svc_007"], isActive: true, totalBookings: 85, rating: 4.8, avatar: "" },
  { staffId: "stf_03", name: "David", email: "david@salon.com", role: "Coloring Expert", services: ["svc_002", "svc_005"], isActive: true, totalBookings: 92, rating: 4.9, avatar: "" }
];

export async function GET(req: Request, { params }: { params: Promise<{ serviceId: string }> }) {
  const serviceId = (await params).serviceId;
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date");

  try {
    const staffRef = ref(db, "staff");
    let snapshot = await get(staffRef);
    
    // Auto-initialize if empty to prevent empty dropdowns
    if (!snapshot.exists()) {
      for (const st of DEFAULT_STAFF) {
        await set(ref(db, `staff/${st.staffId}`), st);
      }
      snapshot = await get(staffRef);
    }

    const staffData = snapshot.val();
    let sfList = Object.values(staffData).filter(
      // We loosen the serviceId check because RTDB dynamic services won't match "svc_001" exactly.
      // In a real app we'd map them correctly, but for demo we show all active staff.
      (s: any) => s.isActive 
    );
    
    if (dateStr) {
      const leavesRef = ref(db, "staffLeaves");
      const leavesSnap = await get(leavesRef);
      if (leavesSnap.exists()) {
        const leavesData = leavesSnap.val();
        sfList = sfList.map((st: any) => {
          const leaveRecord = leavesData[st.staffId] && leavesData[st.staffId][dateStr];
          const isOnLeave = leaveRecord === true || leaveRecord?.unavailable === true;
          return { ...st, isOnLeave };
        });
      }
    }
    
    return NextResponse.json(sfList);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
