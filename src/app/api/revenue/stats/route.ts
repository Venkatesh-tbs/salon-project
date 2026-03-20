import { NextResponse } from "next/server";
import { db } from "@/firebase";
import { ref, get } from "firebase/database";

function getWeekStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}

function getMonthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0];
    const monthStart = getMonthStart();

    const apptsRef = ref(db, "appointments");
    const snap = await get(apptsRef);
    if (!snap.exists()) {
      return NextResponse.json({
         todayRevenue: 0,
         monthRevenue: 0,
         totalBookings: 0,
         completedBookings: 0,
         cancelledBookings: 0,
         peakHours: [],
         revenueByDay: [],
         bookingsByService: [],
         topStaff: [],
      });
    }

    const apptsData = snap.val();
    const allAppointments = Object.values(apptsData) as any[];

    let todayRevenue = 0;
    let monthRevenue = 0, totalBookings = 0, completedCount = 0, cancelledCount = 0;
    const hourCount: Record<string, number> = {};
    const serviceMap: Record<string, { count: number; revenue: number }> = {};
    const staffMap: Record<string, { name: string; count: number; revenue: number }> = {};
    const dailyMap: Record<string, { revenue: number; bookings: number }> = {};

    const currentMonthPrefix = today.substring(0, 7);

    // Get an array of dates for the last 30 days to ensure continuous chart data
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return d.toISOString().split("T")[0];
    });

    for (const date of last30Days) {
      dailyMap[date] = { revenue: 0, bookings: 0 };
    }

    for (const a of allAppointments) {
      const isToday = a.date === today;
      const isThisMonth = a.date?.startsWith(currentMonthPrefix);

      if (a.status === "confirmed" || a.status === "completed") {
         const price = Number(a.servicePrice) || Number(a.totalAmount) || 0;
         
         if (isThisMonth) {
            monthRevenue += price;
            totalBookings++;
            if (a.status === "completed") completedCount++;
            
            const sid = a.staffId || "unassigned";
            if (!staffMap[sid]) staffMap[sid] = { name: a.staffName || "Unassigned", count: 0, revenue: 0 };
            staffMap[sid].count++;
            staffMap[sid].revenue += price;
         }
         
         if (isToday) todayRevenue += price;

         if (dailyMap[a.date]) {
            dailyMap[a.date].revenue += price;
            dailyMap[a.date].bookings++;
         } else if (a.date >= last30Days[0] && a.date <= last30Days[29]) {
            dailyMap[a.date] = { revenue: price, bookings: 1 };
         }

         const hr = a.time?.split(":")?.[0] || "00";
         hourCount[hr] = (hourCount[hr] || 0) + 1;

         const sn = a.service || "Unknown";
         if (!serviceMap[sn]) serviceMap[sn] = { count: 0, revenue: 0 };
         serviceMap[sn].count++;
         serviceMap[sn].revenue += price;

      } else if (a.status === "cancelled" && isThisMonth) {
         totalBookings++; // keep it in the total for cancel rate math
         cancelledCount++;
      }
    }

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

    return NextResponse.json({
      todayRevenue,
      monthRevenue,
      totalBookings,
      completedBookings: completedCount,
      cancelledBookings: cancelledCount,
      peakHours,
      revenueByDay,
      bookingsByService,
      topStaff,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
