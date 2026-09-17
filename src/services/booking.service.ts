/**
 * ELMO Business Operations Suite — Booking & Anti-No-Show Service
 *
 * Manages appointment scheduling, attendance status tracking,
 * and automated 24-hour & 2-hour anti-no-show reminders.
 */

import { MockDataStore, BookingRow, BookingInsert } from "@/lib/supabase/mock-store";
import { createClient as createBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

export interface CreateBookingParams {
  userId: string;
  organizationId: string;
  contactId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  serviceName: string;
  bookingTime: string;
  notes?: string;
}

export interface AntiNoShowReminders {
  reminder24h: {
    channel: "whatsapp" | "sms";
    message: string;
    sendTime: string;
  };
  reminder2h: {
    channel: "whatsapp" | "sms";
    message: string;
    sendTime: string;
  };
}

export class BookingService {
  private static instance: BookingService;
  private store: MockDataStore;

  private constructor() {
    this.store = MockDataStore.getInstance();
  }

  public static getInstance(): BookingService {
    if (!BookingService.instance) {
      BookingService.instance = new BookingService();
    }
    return BookingService.instance;
  }

  public static resetInstance(): void {
    BookingService.instance = undefined as any;
  }

  public async getBookings(userId: string, organizationId: string): Promise<BookingRow[]> {
    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabase();
      const { data, error } = await (supabase.from("bookings") as any)
        .select("*")
        .eq("organization_id", organizationId)
        .order("booking_time", { ascending: true });

      if (!error && data) {
        return data as BookingRow[];
      }
    }
    return this.store.queryBookingsWithRLS(userId, organizationId);
  }

  public async getBookingById(userId: string, organizationId: string, bookingId: string): Promise<BookingRow | null> {
    const bookings = await this.getBookings(userId, organizationId);
    return bookings.find((b) => b.id === bookingId) || null;
  }

  public async createBooking(params: CreateBookingParams): Promise<BookingRow> {
    if (!params.organizationId || !params.customerName || !params.serviceName || !params.bookingTime) {
      throw new Error("Missing required parameters: organizationId, customerName, serviceName, and bookingTime are required.");
    }

    const insertData: BookingInsert = {
      organization_id: params.organizationId,
      contact_id: params.contactId || null,
      customer_name: params.customerName.trim(),
      customer_email: params.customerEmail?.trim() || null,
      customer_phone: params.customerPhone?.trim() || null,
      service_name: params.serviceName.trim(),
      booking_time: params.bookingTime,
      status: "confirmed",
      reminder_24h_sent: false,
      reminder_2h_sent: false,
      notes: params.notes || null,
    };

    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabase();
      const { data, error } = await (supabase.from("bookings") as any)
        .insert(insertData)
        .select()
        .single();

      if (!error && data) {
        return data as BookingRow;
      }
    }

    return this.store.createBooking(insertData);
  }

  public async updateBookingStatus(
    userId: string,
    organizationId: string,
    bookingId: string,
    status: BookingRow["status"]
  ): Promise<BookingRow | null> {
    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabase();
      const { data, error } = await (supabase.from("bookings") as any)
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", bookingId)
        .eq("organization_id", organizationId)
        .select()
        .single();

      if (!error && data) {
        return data as BookingRow;
      }
    }

    return this.store.updateBooking(userId, organizationId, bookingId, { status });
  }

  public generateNoShowReminders(booking: BookingRow): AntiNoShowReminders {
    const bookingDate = new Date(booking.booking_time);
    const dateFormatted = bookingDate.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const timeFormatted = bookingDate.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });

    const sendTime24h = new Date(bookingDate.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const sendTime2h = new Date(bookingDate.getTime() - 2 * 60 * 60 * 1000).toISOString();

    const message24h = `Hi ${booking.customer_name}, friendly reminder of your upcoming ${booking.service_name} appointment scheduled for tomorrow, ${dateFormatted} at ${timeFormatted}.\n\nPlease reply 'YES' to confirm your slot, or reply 'RESCHEDULE' if you need a different time. See you soon!`;

    const message2h = `Hi ${booking.customer_name}, your ${booking.service_name} appointment is in 2 hours at ${timeFormatted}.\n\nNeed directions or parking info? Feel free to reply here. We look forward to welcoming you!`;

    return {
      reminder24h: {
        channel: "whatsapp",
        message: message24h,
        sendTime: sendTime24h,
      },
      reminder2h: {
        channel: "whatsapp",
        message: message2h,
        sendTime: sendTime2h,
      },
    };
  }
}
