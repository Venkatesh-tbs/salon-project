import { NextResponse } from "next/server";
import { db } from "@/firebase";
import { ref, get } from "firebase/database";

export async function GET() {
  try {
    const clientsRef = ref(db, "clients");
    const snapshot = await get(clientsRef);
    if (!snapshot.exists()) return NextResponse.json([]);
    
    const clientsData = snapshot.val();
    const vipClients = Object.entries(clientsData)
      .map(([id, data]: [string, any]) => ({
        clientId: id,
        ...data,
        isVIP: data.isVIP === true || (data.totalSpent || 0) >= 2000 || (data.totalVisits || 0) >= 5,
      }))
      .filter((c) => c.isVIP === true);
    
    return NextResponse.json(vipClients);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
