import { Sparkles } from "lucide-react";
import { Appointment } from "@/firebase/db";

export function AiSummaryCard({ appointments }: { appointments: Appointment[] }) {
  const getSummaryText = () => {
    if (appointments.length === 0) {
      return "No bookings available to analyze. The system requires historical data to generate predictive insights.";
    }

    const validBookings = appointments.filter(a => a.status !== 'cancelled' && a.status !== 'pending');
    
    if (validBookings.length === 0) {
      return "There are no completed or confirmed bookings to analyze yet. Check back once clients arrive.";
    }

    const serviceCountsLast7: Record<string, number> = {};
    const serviceCountsPrev7: Record<string, number> = {};
    const hourCounts: Record<string, number> = {};
    const dayCounts: Record<string, number> = {};
    const overallServiceCounts: Record<string, number> = {};
    
    let last7DaysTotal = 0;

    const todayDate = new Date();
    todayDate.setHours(0,0,0,0);
    const todayMs = todayDate.getTime();

    validBookings.forEach(a => {
      // Overall Service Count
      if (a.service) overallServiceCounts[a.service] = (overallServiceCounts[a.service] || 0) + 1;

      // Busiest Day
      if (a.date) {
        const d = new Date(a.date);
        if (!isNaN(d.getTime())) {
          const dayStr = d.toLocaleDateString('en-US', { weekday: 'long' });
          dayCounts[dayStr] = (dayCounts[dayStr] || 0) + 1;
          
          // Time delta for 7-day windows
          const diffDays = Math.floor((todayMs - d.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays < 7) {
            last7DaysTotal++;
            if (a.service) serviceCountsLast7[a.service] = (serviceCountsLast7[a.service] || 0) + 1;
          } else if (diffDays >= 7 && diffDays < 14) {
            if (a.service) serviceCountsPrev7[a.service] = (serviceCountsPrev7[a.service] || 0) + 1;
          }
        }
      }

      // Peak Hour
      if (a.time) {
        const hour = parseInt(a.time.split(':')[0] || '0', 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const h12 = hour % 12 || 12;
        const key = `${h12} ${ampm}`;
        hourCounts[key] = (hourCounts[key] || 0) + 1;
      }
    });

    const getTop = (record: Record<string, number>) => Object.entries(record).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    const mostDemandedService = getTop(overallServiceCounts) !== 'N/A' ? getTop(overallServiceCounts) : 'Haircut';
    const peakHour = getTop(hourCounts) || '12 PM';
    const busiestDay = getTop(dayCounts) || 'Saturday';
    
    // Prediction based on last 7 days average
    const predictedBookings = Math.round(last7DaysTotal / 7) || 0;

    // Trend Detection using trailing week-over-week velocity
    let trendString = "";
    const activeTrendService = getTop(serviceCountsLast7) !== 'N/A' ? getTop(serviceCountsLast7) : mostDemandedService;
    
    if (activeTrendService !== 'N/A') {
      const currentCount = serviceCountsLast7[activeTrendService] || 0;
      const prevCount = serviceCountsPrev7[activeTrendService] || 0;
      
      if (currentCount > prevCount && prevCount >= 0) {
        trendString = `${activeTrendService} demand is increasing this week.`;
      } else if (currentCount < prevCount) {
        trendString = `${activeTrendService} bookings are dipping slightly compared to last week.`;
      } else {
        trendString = `${activeTrendService} demand remains perfectly steady.`;
      }
    }

    return `${mostDemandedService} is the most demanded service. Peak bookings occur around ${peakHour}, with ${busiestDay} being the busiest day. Based on recent trends, tomorrow is expected to have around ${predictedBookings} bookings. ${trendString}`;
  };

  return (
    <div className="relative group rounded-2xl p-7 text-white flex-1 h-full overflow-hidden hover-lift shadow-[0_10px_40px_rgba(123,47,247,0.2)]">
      {/* Animated Deep Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#2a0e45] via-brand-purple to-brand-pink bg-[length:200%_200%] animate-[gradient_8s_ease_infinite] opacity-90"></div>
      
      {/* Glass overlay */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"></div>
      
      {/* Content */}
      <div className="relative z-10 h-full flex flex-col">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-white/10 rounded-lg backdrop-blur-md border border-white/20 shadow-inner">
            <Sparkles className="h-5 w-5 text-brand-pink fill-brand-pink/20 animate-pulse" />
          </div>
          <h3 className="font-heading font-semibold tracking-wide text-lg text-white/90">Aura AI Insight</h3>
        </div>
        
        <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-5 backdrop-blur-md shadow-inner">
          <p className="text-[15px] leading-relaxed text-white/80 font-medium">
            {getSummaryText()}
          </p>
        </div>
      </div>
      
      {/* Decorative Glows */}
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/20 blur-3xl rounded-full pointer-events-none"></div>
    </div>
  );
}
