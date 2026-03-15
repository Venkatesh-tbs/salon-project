"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { crmService } from "@/services/api";

type Client = { clientId: string, name: string, phoneNumber?: string, phone?: string, isVIP: boolean, totalVisits: number, lastVisit?: string, lastVisitDate?: string, totalSpent?: number, loyaltyPoints?: number };

export const CRMTable: React.FC = () => {
  const [clients, setClients]   = useState<Client[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [filter, setFilter]     = useState<"all" | "vip">("all");

  useEffect(() => {
    crmService.getAll().then(setClients).finally(() => setLoading(false));
  }, []);

  const filtered = clients.filter((c) => {
    const matchSearch = search
      ? c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.phoneNumber || c.phone || "").includes(search)
      : true;
    const matchVip = filter === "vip" ? c.isVIP : true;
    return matchSearch && matchVip;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-black text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
            Client CRM
          </h2>
          <p className="text-white/40 text-sm">{clients.length} total clients</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm outline-none placeholder:text-white/25 focus:border-fuchsia-600 transition-all w-48"
          />
          <div className="flex rounded-xl border border-white/10 overflow-hidden">
            {(["all", "vip"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-4 py-2 text-xs font-semibold capitalize transition-all"
                style={{
                  background: filter === f ? "rgba(192,38,211,0.2)" : "transparent",
                  color:      filter === f ? "#e879f9" : "rgba(255,255,255,0.4)",
                }}
              >
                {f === "vip" ? "⭐ VIP" : "All"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Clients",    value: clients.length,                           color: "#7c3aed" },
          { label: "VIP Clients",      value: clients.filter((c) => c.isVIP).length,    color: "#f59e0b" },
          { label: "Avg Visits",       value: clients.length
              ? (clients.reduce((a, c) => a + c.totalVisits, 0) / clients.length).toFixed(1)
              : 0,                                                                        color: "#10b981" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-center"
          >
            <p className="text-2xl font-black" style={{ color: s.color, fontFamily: "'Syne', sans-serif" }}>
              {s.value}
            </p>
            <p className="text-white/40 text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-6 gap-4 px-5 py-3 bg-white/[0.03] border-b border-white/[0.06]">
            {["Client", "Phone", "Visits", "Points", "Last Visit", "Spent"].map((h) => (
              <p key={h} className="text-white/30 text-xs uppercase tracking-wider font-semibold">{h}</p>
            ))}
          </div>

          <div className="divide-y divide-white/[0.04]">
            {filtered.length === 0 ? (
              <p className="text-center text-white/30 text-sm py-10">No clients found.</p>
            ) : (
              filtered.map((c, i) => (
                <motion.div
                  key={c.clientId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="grid grid-cols-6 gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors"
                >
                  {/* Name */}
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: c.isVIP ? "linear-gradient(135deg, #f59e0b, #d97706)" : "linear-gradient(135deg, #7c3aed, #6366f1)" }}
                    >
                      {c.name ? c.name[0] : "?"}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium leading-tight">{c.name}</p>
                      {c.isVIP && (
                        <span className="text-yellow-400 text-[9px] font-bold tracking-wider">⭐ VIP</span>
                      )}
                    </div>
                  </div>

                  {/* Phone */}
                  <p className="text-white/50 text-sm self-center">{c.phoneNumber || c.phone}</p>

                  {/* Visits */}
                  <div className="self-center">
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min((c.totalVisits / 20) * 100, 100)}%`,
                            background: c.isVIP ? "#f59e0b" : "#7c3aed",
                          }}
                        />
                      </div>
                      <span className="text-white text-sm font-semibold">{c.totalVisits}</span>
                    </div>
                  </div>

                  {/* Loyalty Points */}
                  <p className="text-white text-sm font-semibold self-center">
                    ⭐ {c.loyaltyPoints || 0}
                  </p>

                  {/* Last visit */}
                  <p className="text-white/50 text-sm self-center">
                    {(c.lastVisit || c.lastVisitDate) ? new Date(c.lastVisit || c.lastVisitDate!).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}
                  </p>

                  {/* Spent */}
                  <p className="text-fuchsia-400 text-sm font-bold self-center">
                    ₹{(c.totalSpent || 0).toLocaleString("en-IN")}
                  </p>
                </motion.div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
