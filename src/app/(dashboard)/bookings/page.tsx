"use client";

import React, { useState, useEffect } from "react";
import {
  CalendarCheck,
  Plus,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Copy,
  Calendar,
} from "lucide-react";
import { BookingService, AntiNoShowReminders } from "@/services/booking.service";
import { BookingRow } from "@/lib/supabase/mock-store";
import { AuthService } from "@/services/auth.service";

export default function BookingsPage() {
  const [orgId, setOrgId] = useState("11111111-1111-1111-1111-111111111111");
  const [userId, setUserId] = useState("dev-user");

  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reminderModal, setReminderModal] = useState<AntiNoShowReminders | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form State
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [serviceName, setServiceName] = useState("Initial Consultation");
  const [bookingTime, setBookingTime] = useState("");
  const [notes, setNotes] = useState("");

  const bookingService = BookingService.getInstance();

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
    loadBookings();
  }, [orgId, userId]);

  async function loadBookings() {
    try {
      const data = await bookingService.getBookings(userId, orgId);
      setBookings(data);
    } catch {
      // Graceful
    } finally {
      setLoading(false);
    }
  }

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !serviceName.trim() || !bookingTime) return;

    try {
      await bookingService.createBooking({
        userId,
        organizationId: orgId,
        customerName,
        customerEmail,
        customerPhone,
        serviceName,
        bookingTime: new Date(bookingTime).toISOString(),
        notes,
      });

      setCustomerName("");
      setCustomerEmail("");
      setCustomerPhone("");
      setBookingTime("");
      setNotes("");
      setIsModalOpen(false);
      await loadBookings();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleStatusChange = async (bookingId: string, status: BookingRow["status"]) => {
    await bookingService.updateBookingStatus(userId, orgId, bookingId, status);
    await loadBookings();
  };

  const handleOpenReminders = (booking: BookingRow) => {
    const reminders = bookingService.generateNoShowReminders(booking);
    setReminderModal(reminders);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const confirmedCount = bookings.filter((b) => b.status === "confirmed").length;
  const completedCount = bookings.filter((b) => b.status === "completed").length;
  const noShowCount = bookings.filter((b) => b.status === "no_show").length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-mono text-zinc-100 flex items-center gap-2.5">
            <CalendarCheck className="w-6 h-6 text-amber-400" />
            Smart Bookings & Anti-No-Show Assistant
          </h1>
          <p className="text-sm text-zinc-400">
            Schedule appointments, reduce client ghosting with automated 24h & 2h WhatsApp reminders.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold rounded-lg text-sm shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all"
        >
          <Plus className="w-4 h-4" />
          Schedule Appointment
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#091120] border border-[#162744] p-4 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Upcoming Bookings</p>
            <p className="text-xl font-bold text-blue-400">{confirmedCount}</p>
          </div>
        </div>

        <div className="bg-[#091120] border border-[#162744] p-4 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Completed Sessions</p>
            <p className="text-xl font-bold text-emerald-400">{completedCount}</p>
          </div>
        </div>

        <div className="bg-[#091120] border border-[#162744] p-4 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-mono text-zinc-400 uppercase tracking-wider">No-Shows</p>
            <p className="text-xl font-bold text-rose-400">{noShowCount}</p>
          </div>
        </div>
      </div>

      {/* Bookings List */}
      <div className="bg-[#091120] border border-[#162744] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#162744] flex items-center justify-between">
          <h2 className="text-sm font-bold font-mono text-zinc-200">Appointments Schedule ({bookings.length})</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-zinc-500 font-mono text-sm">Loading schedule...</div>
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Calendar className="w-10 h-10 text-zinc-600 mx-auto" />
            <p className="text-zinc-400 text-sm">No scheduled appointments.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-xs text-amber-400 underline font-mono"
            >
              Book an appointment
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#162744]">
            {bookings.map((booking) => {
              const bDate = new Date(booking.booking_time);
              return (
                <div
                  key={booking.id}
                  className="p-4 hover:bg-[#0C172C] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-zinc-100">{booking.customer_name}</span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${
                          booking.status === "completed"
                            ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                            : booking.status === "confirmed"
                            ? "bg-blue-500/10 text-blue-300 border-blue-500/30"
                            : booking.status === "no_show"
                            ? "bg-rose-500/10 text-rose-300 border-rose-500/30"
                            : "bg-zinc-500/10 text-zinc-400 border-zinc-500/30"
                        }`}
                      >
                        {booking.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-amber-400/90">{booking.service_name}</p>
                    <p className="text-xs text-zinc-500 font-mono">
                      {booking.customer_phone || booking.customer_email || "No direct contact"}
                      {booking.notes && ` • Notes: ${booking.notes}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right font-mono">
                      <p className="text-sm font-bold text-zinc-200">
                        {bDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {bDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenReminders(booking)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono transition-colors"
                        title="Generate Anti-No-Show Reminders"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Anti-Ghost Reminders
                      </button>

                      {booking.status === "confirmed" && (
                        <>
                          <button
                            onClick={() => handleStatusChange(booking.id, "completed")}
                            className="p-2 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors"
                            title="Mark as Completed"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleStatusChange(booking.id, "no_show")}
                            className="p-2 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                            title="Mark as No-Show"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Schedule Booking Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#091120] border border-[#162744] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold font-mono text-zinc-100 flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-amber-400" />
              Schedule Appointment
            </h2>

            <form onSubmit={handleCreateBooking} className="space-y-4">
              <div>
                <label className="text-xs font-mono text-zinc-400">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full mt-1 px-3 py-2 bg-[#0C172C] border border-[#162744] rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono text-zinc-400">Customer Phone (WhatsApp)</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+60 12-345 6789"
                    className="w-full mt-1 px-3 py-2 bg-[#0C172C] border border-[#162744] rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono text-zinc-400">Customer Email</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full mt-1 px-3 py-2 bg-[#0C172C] border border-[#162744] rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono text-zinc-400">Service Name *</label>
                  <input
                    type="text"
                    required
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    placeholder="e.g. Consultation / Checkup"
                    className="w-full mt-1 px-3 py-2 bg-[#0C172C] border border-[#162744] rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono text-zinc-400">Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-[#0C172C] border border-[#162744] rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-mono text-zinc-400">Special Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Returning client, requested private room"
                  className="w-full mt-1 px-3 py-2 bg-[#0C172C] border border-[#162744] rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#162744]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm shadow-[0_0_12px_rgba(245,158,11,0.3)] transition-all font-mono"
                >
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reminder Copy Modal */}
      {reminderModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#091120] border border-[#162744] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-mono text-zinc-100 flex items-center gap-2">
                <Send className="w-4 h-4 text-amber-400" />
                Anti-No-Show Reminder Copy
              </h3>
              <button
                onClick={() => setReminderModal(null)}
                className="text-zinc-500 hover:text-zinc-300 text-xs font-mono"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              {/* 24 Hour Reminder */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
                  <span className="font-bold text-amber-400">1. Send 24 Hours Before:</span>
                  <button
                    onClick={() => copyToClipboard(reminderModal.reminder24h.message, "24h")}
                    className="text-amber-300 hover:text-amber-200 flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedKey === "24h" ? "Copied!" : "Copy"}
                  </button>
                </div>
                <div className="p-3 bg-[#050914] border border-[#162744] rounded-lg font-mono text-xs text-zinc-300 whitespace-pre-wrap select-all">
                  {reminderModal.reminder24h.message}
                </div>
              </div>

              {/* 2 Hour Reminder */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
                  <span className="font-bold text-cyan-400">2. Send 2 Hours Before:</span>
                  <button
                    onClick={() => copyToClipboard(reminderModal.reminder2h.message, "2h")}
                    className="text-cyan-300 hover:text-cyan-200 flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedKey === "2h" ? "Copied!" : "Copy"}
                  </button>
                </div>
                <div className="p-3 bg-[#050914] border border-[#162744] rounded-lg font-mono text-xs text-zinc-300 whitespace-pre-wrap select-all">
                  {reminderModal.reminder2h.message}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
