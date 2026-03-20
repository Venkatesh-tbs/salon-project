import { NextResponse } from "next/server";
import { db } from "@/firebase";
import { ref, get } from "firebase/database";

export async function GET() {
  try {
    const clientsRef = ref(db, "clients");
    const snapshot = await get(clientsRef);
    if (!snapshot.exists()) return NextResponse.json([]);
    
    const clientsData = snapshot.val();
    const clients = Object.entries(clientsData).map(([id, data]: [string, any]) => ({
      clientId: id,
      ...data,
      isVIP: data.isVIP === true || (data.totalSpent || 0) >= 2000 || (data.totalVisits || 0) >= 5,
    }));
    
    // Sort by total visits desc
    clients.sort((a, b) => (b.totalVisits || 0) - (a.totalVisits || 0));
    
    return NextResponse.json(clients);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
