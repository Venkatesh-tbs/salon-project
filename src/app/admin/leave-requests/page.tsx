'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { db } from '@/firebase';
import { ref, onValue, off, update, remove } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';
import { CalendarMinus, CheckCircle2, XCircle, Clock, Trash2 } from 'lucide-react';

interface LeaveRequest {
  staffId: string;
  staffName: string;
  date: string;
  type: 'full' | 'partial';
  startTime?: string;
  endTime?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: number;
}

export default function LeaveRequestsPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const staffRef = ref(db, 'staff');
    let staffMap: Record<string, string> = {};

    const staffListener = onValue(staffRef, (snap) => {
      if (snap.exists()) {
        const m: Record<string, string> = {};
        snap.forEach((child) => {
          m[child.key!] = child.val().name || 'Unknown Staff';
        });
        staffMap = m;
      }

      const leavesRef = ref(db, 'staffLeaves');
      const listener = onValue(leavesRef, (leaveSnap) => {
        if (!leaveSnap.exists()) {
          setRequests([]);
          setLoading(false);
          return;
        }

        const allReqs: LeaveRequest[] = [];
        leaveSnap.forEach((staffChild) => {
          const sId = staffChild.key!;
          const sName = staffMap[sId] || 'Unknown';
          
          staffChild.forEach((dateChild) => {
            const d = dateChild.key!;
            const val = dateChild.val();
            
            // Normalize legacy boolean blocks as approved full-days natively
            if (val === true || val.unavailable === true) {
               if (!val.type) {
                 allReqs.push({
                   staffId: sId, staffName: sName, date: d,
                   type: 'full', status: 'approved', createdAt: val.createdAt || 0
                 });
                 return;
               }
            }

            allReqs.push({
              staffId: sId, staffName: sName, date: d,
              type: val.type || 'full',
              startTime: val.startTime,
              endTime: val.endTime,
              status: val.status || 'pending',
              createdAt: val.createdAt || 0
            });
          });
        });

        allReqs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setRequests(allReqs);
        setLoading(false);
      });

      return () => off(leavesRef, 'value', listener);
    });

    return () => off(staffRef, 'value', staffListener);
  }, []);

  const handleUpdateStatus = async (req: LeaveRequest, newStatus: 'approved' | 'rejected') => {
    try {
      const targetRef = ref(db, `staffLeaves/${req.staffId}/${req.date}`);
      
      if (newStatus === 'rejected') {
         await remove(targetRef);
         toast({ title: "Leave Rejected", description: `Removed leave for ${req.staffName} on ${req.date}`, variant: 'destructive' });
      } else {
         await update(targetRef, { status: 'approved' });
         toast({ title: "Leave Approved", description: `Approved leave for ${req.staffName} on ${req.date}` });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="w-8 h-8 rounded-full border-t-2 border-brand-purple animate-spin" />
    </div>
  );

  return (
    <div className="p-8 md:p-12 max-w-6xl mx-auto w-full">
      <div className="mb-10">
        <div className="flex flex-wrap items-center gap-4 mb-2">
          <h1 className="text-4xl font-black font-syne text-white tracking-tight flex items-center gap-4">
            <CalendarMinus className="w-10 h-10 text-brand-purple" />
            Leave Requests
          </h1>
          {/* Quick stat badges */}
          <div className="flex items-center gap-3 ml-auto">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-yellow-500/25 bg-yellow-500/10">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-yellow-400 font-black text-sm">{requests.filter(r => r.status === 'pending').length}</span>
              <span className="text-yellow-400/60 text-xs font-medium">Pending</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-green-500/25 bg-green-500/10">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-green-400 font-black text-sm">{requests.filter(r => r.status === 'approved' && r.date === todayStr).length}</span>
              <span className="text-green-400/60 text-xs font-medium">Approved Today</span>
            </div>
          </div>
        </div>
        <p className="text-slate-400 mt-2 font-medium">Approve or reject staff downtime and partial shifts.</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-black/20">
                <th className="p-5 text-xs font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">Staff Member</th>
                <th className="p-5 text-xs font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">Date</th>
                <th className="p-5 text-xs font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">Duration</th>
                <th className="p-5 text-xs font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">Status</th>
                <th className="p-5 text-xs font-black uppercase tracking-widest text-slate-400 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">No leave requests found.</td>
                </tr>
              ) : requests.map((req, idx) => (
                <tr key={`${req.staffId}-${req.date}`} className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${idx === requests.length - 1 ? 'border-b-0' : ''}`}>
                  <td className="p-5">
                    <div className="font-syne font-bold text-white tracking-tight">{req.staffName}</div>
                  </td>
                  <td className="p-5 text-sm text-slate-300">
                    {format(new Date(req.date), 'MMM d, yyyy')}
                  </td>
                  <td className="p-5">
                    {req.type === 'full' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-purple/10 text-brand-purple border border-brand-purple/20 text-[10px] font-black uppercase tracking-widest">
                        Full Day
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                        <Clock className="w-3 h-3" />
                        {req.startTime} - {req.endTime}
                      </span>
                    )}
                  </td>
                  <td className="p-5">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      req.status === 'approved' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                      req.status === 'rejected' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                      'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="p-5 text-right">
                    {req.status === 'pending' && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleUpdateStatus(req, 'approved')}
                          className="w-8 h-8 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 hover:text-green-300 flex items-center justify-center transition-colors"
                          title="Approve"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(req, 'rejected')}
                          className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 flex items-center justify-center transition-colors"
                          title="Reject"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {req.status === 'approved' && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleUpdateStatus(req, 'rejected')}
                          className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 flex items-center justify-center transition-colors"
                          title="Delete Approved Leave"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
