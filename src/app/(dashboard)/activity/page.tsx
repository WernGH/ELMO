"use client";

import React, { useState, useEffect } from "react";
import { Activity, Bot, User, Globe, Shield, RefreshCw } from "lucide-react";
import { ActivityService } from "@/services/activity.service";
import { ActivityRow } from "@/lib/supabase/mock-store";
import { AuthService } from "@/services/auth.service";

export default function ActivityPage() {
  const [orgId, setOrgId] = useState("11111111-1111-1111-1111-111111111111");
  const [userId, setUserId] = useState("dev-user");

  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  const activityService = ActivityService.getInstance();

  useEffect(() => {
    async function initAuth() {
      const auth = AuthService.getInstance();
      const sess = await auth.getSession();
      if (sess?.activeOrganizationId) setOrgId(sess.activeOrganizationId);
      if (sess?.user?.id) setUserId(sess.user.id);
    }
    initAuth();
  }, []);

  useEffect(() => {
    loadActivities();
  }, [orgId, userId]);

  async function loadActivities() {
    setLoading(true);
    try {
      const data = await activityService.getActivities(userId, orgId, 50);
      setActivities(data);
    } catch {
      // Graceful
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Activity className="w-5 h-5" />
            </div>
            Company Activity & Audit Log
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time, immutable audit trail of all AI workforce actions, visitor conversions, and owner decisions.
          </p>
        </div>

        <button
          onClick={loadActivities}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:text-white hover:border-slate-700 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Activity Timeline */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">Loading activity audit trail...</div>
      ) : activities.length === 0 ? (
        <div className="rounded-2xl bg-slate-900/50 border border-slate-800/80 p-12 text-center">
          <div className="h-12 w-12 rounded-2xl bg-slate-800 text-purple-400 flex items-center justify-center mx-auto mb-4 text-xl">
            ⚡
          </div>
          <h3 className="text-lg font-bold text-white">No activity logged yet</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mt-1">
            Activity events will stream in automatically as ELMO executes tasks and captures leads.
          </p>
        </div>
      ) : (
        <div className="relative border-l-2 border-slate-800/80 ml-4 pl-6 space-y-6">
          {activities.map((act) => {
            const actorIcon = {
              AI: <Bot className="w-3.5 h-3.5 text-cyan-400" />,
              HUMAN: <User className="w-3.5 h-3.5 text-amber-400" />,
              VISITOR: <Globe className="w-3.5 h-3.5 text-emerald-400" />,
              SYSTEM: <Shield className="w-3.5 h-3.5 text-purple-400" />,
            }[act.actor_type || "AI"];

            return (
              <div key={act.id} className="relative group">
                {/* Node dot */}
                <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-slate-800 border-2 border-purple-500 group-hover:scale-125 transition-all" />

                <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all shadow-lg">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono uppercase tracking-wider bg-slate-800 border border-slate-700 text-slate-300">
                        {actorIcon}
                        {act.actor_name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                        {act.type.replace(/_/g, " ")}
                      </span>
                    </div>

                    <span className="text-[11px] font-mono text-slate-500">
                      {new Date(act.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <p className="text-sm text-slate-200 font-medium leading-relaxed mt-1">
                    {act.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
