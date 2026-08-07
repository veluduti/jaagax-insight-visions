import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PartnerNav from "@/components/partners/PartnerNav";
import PartnerSubNav from "@/components/partners/PartnerSubNav";
import { usePartnerHotel } from "@/hooks/usePartnerHotel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Loader2,
  IndianRupee,
  Wallet,
  Landmark,
  Save,
  Download,
  FileText,
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  Building2,
  CreditCard,
  FileCheck,
  Info,
  Plus,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Circle,
} from "lucide-react";
import {
  format,
  parseISO,
  differenceInDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  isWithinInterval,
  eachDayOfInterval,
  getDate,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Types
type Booking = {
  id: string;
  check_in: string;
  check_out: string;
  total_amount: number;
  status: string;
  num_rooms: number;
  booking_type: string | null;
  created_at: string;
  guest_name: string;
  room_type?: string;
};

type Payout = {
  id: string;
  hotel_id: string;
  period_start: string;
  period_end: string;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  tax_amount: number;
  status: "pending" | "processing" | "paid" | "failed";
  paid_at: string | null;
  transaction_id: string | null;
  notes: string | null;
  created_at: string;
};

type Settings = {
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  upi_id: string;
  pan_number: string;
  gst_number: string;
  payout_frequency: "monthly" | "weekly" | "biweekly";
  min_payout_amount: number;
  hold_days: number;
  commission_rate: number;
  tds_rate: number;
  gst_on_commission: number;
};

const DEFAULT_COMMISSION = 15;
const DEFAULT_TDS = 1;
const DEFAULT_GST_ON_COMMISSION = 18;

const emptySettings: Settings = {
  account_holder_name: "",
  bank_name: "",
  account_number: "",
  ifsc_code: "",
  upi_id: "",
  pan_number: "",
  gst_number: "",
  payout_frequency: "monthly",
  min_payout_amount: 1000,
  hold_days: 7,
  commission_rate: DEFAULT_COMMISSION,
  tds_rate: DEFAULT_TDS,
  gst_on_commission: DEFAULT_GST_ON_COMMISSION,
};

const fmtInr = (n: number) =>
  "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n || 0));

const getStatusColor = (status: string) => {
  switch (status) {
    case "paid":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "processing":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "pending":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "failed":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "paid":
      return <CheckCircle2 className="h-4 w-4" />;
    case "processing":
      return <Clock className="h-4 w-4" />;
    case "pending":
      return <AlertCircle className="h-4 w-4" />;
    case "failed":
      return <TrendingDown className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

export default function PartnerPayouts() {
  const ctx = usePartnerHotel();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [settings, setSettings] = useState<Settings>(emptySettings);
  const [saving, setSaving] = useState(false);
  const [showTaxDetails, setShowTaxDetails] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<any>(null);
  const [showPayoutDetails, setShowPayoutDetails] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarView, setCalendarView] = useState<"monthly" | "weekly">("monthly");
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    if (ctx.loading || !ctx.hotelId) return;
    loadData();
  }, [ctx.loading, ctx.hotelId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: b }, { data: s }, { data: p }] = await Promise.all([
        supabase
          .from("hotel_bookings")
          .select("id,check_in,check_out,total_amount,status,num_rooms,booking_type,created_at,guest_name,room_type")
          .eq("hotel_id", ctx.hotelId)
          .in("status", ["confirmed", "checked_in", "checked_out"])
          .order("check_out", { ascending: false }),
        supabase.from("hotel_payout_settings").select("*").eq("hotel_id", ctx.hotelId).maybeSingle(),
        supabase
          .from("hotel_payouts")
          .select("*")
          .eq("hotel_id", ctx.hotelId)
          .order("period_end", { ascending: false }),
      ]);

      setBookings(b || []);
      setPayouts(p || []);
      if (s) setSettings({ ...emptySettings, ...s });
    } catch (error: any) {
      toast.error(error.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Calculate monthly summary from bookings
  const monthlySummary = useMemo(() => {
    const map = new Map<string, { gross: number; count: number; period: Date; bookings: any[] }>();

    for (const b of bookings) {
      const d = parseISO(b.check_out);
      const key = format(d, "yyyy-MM");
      const monthStart = startOfMonth(d);
      const cur = map.get(key) || { gross: 0, count: 0, period: monthStart, bookings: [] };
      cur.gross += Number(b.total_amount || 0);
      cur.count += 1;
      cur.bookings.push(b);
      map.set(key, cur);
    }

    const now = new Date();
    const commissionRate = settings.commission_rate || DEFAULT_COMMISSION;
    const tdsRate = settings.tds_rate || DEFAULT_TDS;
    const gstOnCommission = settings.gst_on_commission || DEFAULT_GST_ON_COMMISSION;

    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([key, v]) => {
        const gross = v.gross;
        const commission = gross * (commissionRate / 100);
        const tds = commission * (tdsRate / 100);
        const gst = commission * (gstOnCommission / 100);
        const net = gross - commission - tds - gst;
        const monthEnd = endOfMonth(v.period);

        const existingPayout = payouts.find((p) => format(parseISO(p.period_start), "yyyy-MM") === key);

        let status = "pending";
        if (existingPayout) {
          status = existingPayout.status;
        } else if (monthEnd > now) {
          status = "pending";
        } else if (differenceInDays(now, monthEnd) < settings.hold_days) {
          status = "processing";
        } else {
          status = "pending";
        }

        return {
          key,
          period: v.period,
          monthEnd,
          gross,
          commission,
          tds,
          gst,
          net,
          count: v.count,
          status,
          bookings: v.bookings,
          payout: existingPayout,
        };
      });
  }, [bookings, payouts, settings]);

  // Calendar data - aggregate bookings by day
  const calendarData = useMemo(() => {
    const daysMap = new Map<string, { total: number; count: number; bookings: any[] }>();

    for (const b of bookings) {
      const checkOut = parseISO(b.check_out);
      const key = format(checkOut, "yyyy-MM-dd");
      const cur = daysMap.get(key) || { total: 0, count: 0, bookings: [] };
      cur.total += Number(b.total_amount || 0);
      cur.count += 1;
      cur.bookings.push(b);
      daysMap.set(key, cur);
    }

    // Get all days in selected month
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return daysInMonth.map((day) => {
      const key = format(day, "yyyy-MM-dd");
      const data = daysMap.get(key);
      return {
        date: day,
        hasData: !!data,
        total: data?.total || 0,
        count: data?.count || 0,
        bookings: data?.bookings || [],
        isToday: isToday(day),
      };
    });
  }, [bookings, selectedDate]);

  // Summary statistics
  const summary = useMemo(() => {
    const nowKey = format(new Date(), "yyyy-MM");
    const lastKey = format(subMonths(new Date(), 1), "yyyy-MM");
    const cur = monthlySummary.find((m) => m.key === nowKey);
    const last = monthlySummary.find((m) => m.key === lastKey);

    const upcoming = monthlySummary
      .filter((m) => m.status === "pending" || m.status === "processing")
      .reduce((s, m) => s + m.net, 0);
    const lifetime = monthlySummary.reduce((s, m) => s + m.net, 0);
    const totalCommission = monthlySummary.reduce((s, m) => s + m.commission, 0);
    const totalTDS = monthlySummary.reduce((s, m) => s + m.tds, 0);
    const totalGST = monthlySummary.reduce((s, m) => s + m.gst, 0);

    return {
      thisMonth: cur?.net || 0,
      lastMonth: last?.net || 0,
      upcoming,
      lifetime,
      totalCommission,
      totalTDS,
      totalGST,
      totalGross: monthlySummary.reduce((s, m) => s + m.gross, 0),
    };
  }, [monthlySummary]);

  const saveSettings = async () => {
    if (!ctx.hotelId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("hotel_payout_settings").upsert(
        {
          hotel_id: ctx.hotelId,
          ...settings,
          commission_rate: Number(settings.commission_rate),
          tds_rate: Number(settings.tds_rate),
          gst_on_commission: Number(settings.gst_on_commission),
          min_payout_amount: Number(settings.min_payout_amount),
          hold_days: Number(settings.hold_days),
        },
        { onConflict: "hotel_id" },
      );

      if (error) throw error;
      toast.success("Payout details saved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const downloadReport = (month: any) => {
    const headers = ["Date", "Guest Name", "Booking Type", "Room Type", "Amount", "Commission", "TDS", "GST", "Net"];
    const rows = month.bookings.map((b: any) => [
      format(parseISO(b.check_out), "dd MMM yyyy"),
      b.guest_name,
      b.booking_type || "Standard",
      b.room_type || "Standard",
      Number(b.total_amount).toFixed(0),
      (Number(b.total_amount) * (settings.commission_rate / 100)).toFixed(0),
      (Number(b.total_amount) * (settings.commission_rate / 100) * (settings.tds_rate / 100)).toFixed(0),
      (Number(b.total_amount) * (settings.commission_rate / 100) * (settings.gst_on_commission / 100)).toFixed(0),
      (
        Number(b.total_amount) -
        Number(b.total_amount) * (settings.commission_rate / 100) -
        Number(b.total_amount) * (settings.commission_rate / 100) * (settings.tds_rate / 100) -
        Number(b.total_amount) * (settings.commission_rate / 100) * (settings.gst_on_commission / 100)
      ).toFixed(0),
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payout_${month.key}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Report downloaded");
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setShowCalendar(false);
    // Find if there are bookings on this date
    const dayData = calendarData.find((d) => isSameDay(d.date, date));
    if (dayData && dayData.hasData) {
      // Show popup with bookings for this day
      const monthData = monthlySummary.find((m) =>
        isWithinInterval(date, { start: startOfMonth(m.period), end: endOfMonth(m.period) }),
      );
      if (monthData) {
        setSelectedPayout({
          ...monthData,
          bookings: dayData.bookings,
          dayTotal: dayData.total,
          dayCount: dayData.count,
        });
        setShowPayoutDetails(true);
      }
    }
  };

  const getDayStatus = (day: any) => {
    if (!day.hasData) return "empty";
    const monthData = monthlySummary.find((m) =>
      isWithinInterval(day.date, { start: startOfMonth(m.period), end: endOfMonth(m.period) }),
    );
    if (monthData) {
      return monthData.status;
    }
    return "empty";
  };

  const getDayColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/30";
      case "processing":
        return "bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/30";
      case "pending":
        return "bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/30";
      case "failed":
        return "bg-red-500/20 hover:bg-red-500/30 border-red-500/30";
      default:
        return "hover:bg-muted";
    }
  };

  if (ctx.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <PartnerNav />
        <PartnerSubNav />
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <PartnerNav />
      <PartnerSubNav />

      <main className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Payouts & Finance</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {ctx.hotelName} · Commission Rate: {settings.commission_rate || DEFAULT_COMMISSION}%
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm bg-muted/50 px-4 py-2 rounded-lg">
            <FileCheck className="h-4 w-4 text-emerald-500" />
            <span>Next payout: {format(new Date(), "dd MMM yyyy")}</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20">
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-muted-foreground">This Month</p>
              <p className="text-2xl font-bold text-emerald-400">{fmtInr(summary.thisMonth)}</p>
              <p className="text-xs text-muted-foreground mt-1">Net earnings</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/20">
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-muted-foreground">Last Month</p>
              <p className="text-2xl font-bold">{fmtInr(summary.lastMonth)}</p>
              <p className="text-xs text-muted-foreground mt-1">Net earnings</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20">
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-muted-foreground">Upcoming Payout</p>
              <p className="text-2xl font-bold text-amber-400">{fmtInr(summary.upcoming)}</p>
              <p className="text-xs text-muted-foreground mt-1">Pending settlements</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border-purple-500/20">
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-muted-foreground">Lifetime Earnings</p>
              <p className="text-2xl font-bold text-purple-400">{fmtInr(summary.lifetime)}</p>
              <p className="text-xs text-muted-foreground mt-1">Total net earnings</p>
            </CardContent>
          </Card>
        </div>

        {/* Tax Summary */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-dashed">
            <CardContent className="pt-3">
              <p className="text-xs text-muted-foreground">Total Commission</p>
              <p className="text-lg font-semibold text-red-400">{fmtInr(summary.totalCommission)}</p>
            </CardContent>
          </Card>
          <Card className="border-dashed">
            <CardContent className="pt-3">
              <p className="text-xs text-muted-foreground">TDS Deducted</p>
              <p className="text-lg font-semibold text-amber-400">{fmtInr(summary.totalTDS)}</p>
            </CardContent>
          </Card>
          <Card className="border-dashed">
            <CardContent className="pt-3">
              <p className="text-xs text-muted-foreground">GST on Commission</p>
              <p className="text-lg font-semibold text-blue-400">{fmtInr(summary.totalGST)}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="ledger" className="space-y-4">
          <TabsList>
            <TabsTrigger value="ledger">Ledger</TabsTrigger>
            <TabsTrigger value="calendar">Calendar View</TabsTrigger>
            <TabsTrigger value="settings">Bank & Tax Details</TabsTrigger>
          </TabsList>

          {/* Ledger Tab */}
          <TabsContent value="ledger" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : monthlySummary.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="rounded-full bg-muted p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">No completed bookings yet.</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Payouts will appear here once bookings are completed.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/60 text-xs uppercase text-muted-foreground">
                          <th className="py-3 text-left">Period</th>
                          <th className="py-3 text-center">Bookings</th>
                          <th className="py-3 text-right">Gross</th>
                          <th className="py-3 text-right">Commission</th>
                          <th className="py-3 text-right">TDS</th>
                          <th className="py-3 text-right">GST</th>
                          <th className="py-3 text-right">Net Payable</th>
                          <th className="py-3 text-center">Status</th>
                          <th className="py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlySummary.map((m) => (
                          <tr key={m.key} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                            <td className="py-3 font-medium">{format(m.period, "MMM yyyy")}</td>
                            <td className="py-3 text-center">{m.count}</td>
                            <td className="py-3 text-right">{fmtInr(m.gross)}</td>
                            <td className="py-3 text-right text-red-400">-{fmtInr(m.commission)}</td>
                            <td className="py-3 text-right text-amber-400">-{fmtInr(m.tds)}</td>
                            <td className="py-3 text-right text-blue-400">-{fmtInr(m.gst)}</td>
                            <td className="py-3 text-right font-semibold text-emerald-400">{fmtInr(m.net)}</td>
                            <td className="py-3 text-center">
                              <Badge className={cn("border", getStatusColor(m.status))}>
                                <span className="flex items-center gap-1">
                                  {getStatusIcon(m.status)}
                                  {m.status === "paid"
                                    ? "Paid"
                                    : m.status === "processing"
                                      ? "Processing"
                                      : m.status === "failed"
                                        ? "Failed"
                                        : "Pending"}
                                </span>
                              </Badge>
                            </td>
                            <td className="py-3 text-right">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setSelectedPayout(m);
                                        setShowPayoutDetails(true);
                                      }}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Info className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>View details</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => downloadReport(m)}
                                className="h-8 w-8 p-0"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Info className="h-3.5 w-3.5" />
                    Payouts are calculated from confirmed/checked-in/checked-out bookings using the check-out date.
                    Settlement is triggered ~{settings.hold_days || 7} days after month-end.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Calendar View Tab */}
          <TabsContent value="calendar">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Payout Calendar</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedDate(subMonths(selectedDate, 1))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-medium min-w-[120px] text-center">{format(selectedDate, "MMMM yyyy")}</span>
                    <Button variant="outline" size="sm" onClick={() => setSelectedDate(subMonths(selectedDate, -1))}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedDate(new Date())}>
                      Today
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarData.map((day, index) => {
                    const status = getDayStatus(day);
                    const isToday = day.isToday;
                    const isSelected = selectedDate && isSameDay(day.date, selectedDate);

                    return (
                      <div key={index} className="aspect-square">
                        <button
                          onClick={() => handleDateSelect(day.date)}
                          className={cn(
                            "w-full h-full rounded-lg border-2 transition-all duration-200 flex flex-col items-center justify-center p-1",
                            day.hasData ? getDayColor(status) : "hover:bg-muted/50 border-transparent",
                            isToday && "ring-2 ring-emerald-500/50",
                            isSelected && "ring-2 ring-primary",
                            !day.hasData && "border-transparent opacity-30",
                          )}
                          disabled={!day.hasData}
                        >
                          <span className={cn("text-sm font-medium", isToday && "text-emerald-500")}>
                            {getDate(day.date)}
                          </span>
                          {day.hasData && (
                            <div className="flex flex-col items-center mt-0.5">
                              <span className="text-xs font-semibold text-emerald-400">{fmtInr(day.total)}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {day.count} booking{day.count > 1 ? "s" : ""}
                              </span>
                            </div>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Circle className="h-3 w-3 fill-emerald-500 text-emerald-500" />
                    <span className="text-xs">Paid</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Circle className="h-3 w-3 fill-blue-500 text-blue-500" />
                    <span className="text-xs">Processing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Circle className="h-3 w-3 fill-amber-500 text-amber-500" />
                    <span className="text-xs">Pending</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Circle className="h-3 w-3 fill-red-500 text-red-500" />
                    <span className="text-xs">Failed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full border-2 border-dashed border-muted-foreground" />
                    <span className="text-xs">No data</span>
                  </div>
                </div>

                <div className="mt-3 p-2 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Info className="h-3.5 w-3.5" />
                    Click on any day with bookings to see detailed payout information for that day.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bank & Tax Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Bank Details */}
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                    <Landmark className="h-4 w-4 text-emerald-500" />
                    Bank Account (for NEFT/RTGS settlement)
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Account Holder Name *</Label>
                      <Input
                        value={settings.account_holder_name}
                        onChange={(e) => setSettings({ ...settings, account_holder_name: e.target.value })}
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Bank Name *</Label>
                      <Input
                        value={settings.bank_name}
                        onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })}
                        placeholder="State Bank of India"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Account Number *</Label>
                      <Input
                        type="password"
                        value={settings.account_number}
                        onChange={(e) => setSettings({ ...settings, account_number: e.target.value })}
                        placeholder="1234567890"
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">IFSC Code *</Label>
                      <Input
                        value={settings.ifsc_code}
                        onChange={(e) => setSettings({ ...settings, ifsc_code: e.target.value.toUpperCase() })}
                        placeholder="SBIN0001234"
                        className="font-mono uppercase"
                        maxLength={11}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">UPI ID (Optional)</Label>
                      <Input
                        value={settings.upi_id}
                        onChange={(e) => setSettings({ ...settings, upi_id: e.target.value })}
                        placeholder="name@bank"
                      />
                    </div>
                  </div>
                </div>

                {/* Tax Details */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <FileCheck className="h-4 w-4 text-amber-500" />
                      Tax Details
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowTaxDetails(!showTaxDetails)}
                      className="text-xs"
                    >
                      {showTaxDetails ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      {showTaxDetails ? "Hide" : "Show"} Details
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">PAN Number *</Label>
                      <Input
                        type={showTaxDetails ? "text" : "password"}
                        value={settings.pan_number}
                        onChange={(e) => setSettings({ ...settings, pan_number: e.target.value.toUpperCase() })}
                        placeholder="ABCDE1234F"
                        className="font-mono uppercase"
                        maxLength={10}
                      />
                      <p className="text-xs text-muted-foreground">Required for TDS deduction</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">GST Number (Optional)</Label>
                      <Input
                        type={showTaxDetails ? "text" : "password"}
                        value={settings.gst_number}
                        onChange={(e) => setSettings({ ...settings, gst_number: e.target.value.toUpperCase() })}
                        placeholder="22ABCDE1234F1Z5"
                        className="font-mono uppercase"
                        maxLength={15}
                      />
                      <p className="text-xs text-muted-foreground">Required for GST invoice</p>
                    </div>
                  </div>
                </div>

                {/* Payout Settings */}
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                    <Settings className="h-4 w-4 text-blue-500" />
                    Payout Settings
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Commission Rate (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={settings.commission_rate}
                        onChange={(e) => setSettings({ ...settings, commission_rate: Number(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground">Default: {DEFAULT_COMMISSION}%</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">TDS Rate (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={settings.tds_rate}
                        onChange={(e) => setSettings({ ...settings, tds_rate: Number(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground">Default: {DEFAULT_TDS}%</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">GST on Commission (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={settings.gst_on_commission}
                        onChange={(e) => setSettings({ ...settings, gst_on_commission: Number(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground">Default: {DEFAULT_GST_ON_COMMISSION}%</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Minimum Payout Amount</Label>
                      <Input
                        type="number"
                        min="0"
                        value={settings.min_payout_amount}
                        onChange={(e) => setSettings({ ...settings, min_payout_amount: Number(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground">Default: ₹1,000</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Settlement Hold Days</Label>
                      <Input
                        type="number"
                        min="0"
                        value={settings.hold_days}
                        onChange={(e) => setSettings({ ...settings, hold_days: Number(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground">Days after month-end to hold payout</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Payout Frequency</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={settings.payout_frequency}
                        onChange={(e) => setSettings({ ...settings, payout_frequency: e.target.value as any })}
                      >
                        <option value="monthly">Monthly</option>
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Bi-Weekly</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={saveSettings}
                    disabled={saving}
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
                  >
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Payout Details Dialog */}
      <Dialog open={showPayoutDetails} onOpenChange={setShowPayoutDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedPayout && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selectedPayout.dayCount ? (
                    <>Payout Details - {format(selectedPayout.date, "dd MMM yyyy")}</>
                  ) : (
                    <>Payout Details - {format(selectedPayout.period, "MMM yyyy")}</>
                  )}
                </DialogTitle>
                <DialogDescription>
                  {selectedPayout.dayCount ? (
                    <>
                      {selectedPayout.dayCount} bookings · {fmtInr(selectedPayout.dayTotal)} revenue
                    </>
                  ) : (
                    <>
                      {selectedPayout.count} bookings · {fmtInr(selectedPayout.gross)} gross revenue
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Gross Revenue</p>
                    <p className="text-lg font-semibold">{fmtInr(selectedPayout.dayTotal || selectedPayout.gross)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Net Payable</p>
                    <p className="text-lg font-bold text-emerald-400">
                      {fmtInr(
                        selectedPayout.dayTotal
                          ? selectedPayout.dayTotal -
                              selectedPayout.dayTotal * (settings.commission_rate / 100) -
                              selectedPayout.dayTotal * (settings.commission_rate / 100) * (settings.tds_rate / 100) -
                              selectedPayout.dayTotal *
                                (settings.commission_rate / 100) *
                                (settings.gst_on_commission / 100)
                          : selectedPayout.net,
                      )}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <p className="text-sm font-medium mb-2">Deductions</p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Commission ({settings.commission_rate}%)</span>
                      <span className="text-red-400">
                        -{fmtInr((selectedPayout.dayTotal || selectedPayout.gross) * (settings.commission_rate / 100))}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">TDS ({settings.tds_rate}%)</span>
                      <span className="text-amber-400">
                        -
                        {fmtInr(
                          (selectedPayout.dayTotal || selectedPayout.gross) *
                            (settings.commission_rate / 100) *
                            (settings.tds_rate / 100),
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">GST on Commission ({settings.gst_on_commission}%)</span>
                      <span className="text-blue-400">
                        -
                        {fmtInr(
                          (selectedPayout.dayTotal || selectedPayout.gross) *
                            (settings.commission_rate / 100) *
                            (settings.gst_on_commission / 100),
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <p className="text-sm font-medium mb-2">Bookings</p>
                  <div className="max-h-48 overflow-y-auto space-y-1.5">
                    {(selectedPayout.bookings || []).slice(0, 10).map((b: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm border-b border-border/30 pb-1">
                        <span>
                          {b.guest_name} - {format(parseISO(b.check_out), "dd MMM")}
                        </span>
                        <span>{fmtInr(b.total_amount)}</span>
                      </div>
                    ))}
                    {(selectedPayout.bookings || []).length > 10 && (
                      <p className="text-xs text-muted-foreground">
                        +{(selectedPayout.bookings || []).length - 10} more bookings
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowPayoutDetails(false)}>
                  Close
                </Button>
                <Button onClick={() => downloadReport(selectedPayout)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper function to get date without leading zero
function getDate(date: Date) {
  return date.getDate().toString();
}

// Settings icon component
const Settings = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
