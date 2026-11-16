import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { saveCheckinImage, validateCheckinImage, bookingGuestCount, ID_LABELS } from "@/services/hospitality/checkinService";

export default function HotelCheckinForm({ booking, onSaved }: { booking: any; onSaved?: (info: any) => void }) {
  const [checkin, setCheckin] = useState<any>(() => {
      const info = (booking.checkin_info || {}) as any;
      return { eta: info.eta || "", requests: info.requests || "", guests: Array.from({ length: bookingGuestCount(booking) }, (_, guest_index) => ({
        guest_index, room_number: Number(booking.num_rooms) > 1 ? undefined : 1, id_type: "aadhaar",
        ...(info.guests?.find((g: any) => g.guest_index === guest_index) || (guest_index === 0 ? { id_type: info.id_type || "aadhaar", id_document_path: info.id_document_path } : {})),
      })) };
  });
  const [idImages, setIdImages] = useState<Record<number, File>>({});
  const [busy, setBusy] = useState(false);
  const submitCheckin = async () => {
    if (checkin.guests.some((g: any) => !idImages[g.guest_index] && !g.id_document_path)) return toast.error("Please upload an ID image for every guest");
    setBusy(true);
    try {
      const saved = await saveCheckinImage(booking.id, checkin, idImages);
      setCheckin(saved);
      setIdImages({});
      toast.success("Check-in info sent to hotel");
      onSaved?.(saved);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save check-in details");
    } finally { setBusy(false); }
  };

  return <div className="space-y-3">
                  {(checkin.guests || []).map((guest: any, index: number) => {
                    const updateGuest = (patch: object) => setCheckin((c: any) => ({ ...c, guests: c.guests.map((g: any, i: number) => i === index ? { ...g, ...patch } : g) }));
                    return <div key={index} className="space-y-2 border-b border-border pb-4">
                      <h3 className="text-sm font-semibold">Guest {index + 1}{index === 0 && booking.guest_name ? ` · ${booking.guest_name}` : ""}{Number(booking.num_rooms) <= 1 ? " · Room 1" : ""}</h3>
                      {Number(booking.num_rooms) > 1 && <><Label htmlFor={`room-${index}`}>Room for Guest {index + 1}</Label><Select value={guest.room_number ? String(guest.room_number) : ""} disabled={busy} onValueChange={v => updateGuest({ room_number: Number(v) })}><SelectTrigger id={`room-${index}`}><SelectValue placeholder="Select room" /></SelectTrigger><SelectContent>{Array.from({ length: booking.num_rooms }, (_, i) => <SelectItem key={i} value={String(i + 1)}>Room {i + 1}</SelectItem>)}</SelectContent></Select></>}
                      <Label htmlFor={`id-type-${index}`}>ID document for Guest {index + 1}</Label>
                      <Select value={guest.id_type} onValueChange={id_type => updateGuest({ id_type, id_document_path: undefined })} disabled={busy}>
                        <SelectTrigger id={`id-type-${index}`}><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(ID_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                      </Select>
                      <Label htmlFor={`id-image-${index}`}>Upload {ID_LABELS[guest.id_type]} image for Guest {index + 1}</Label>
                      <Input id={`id-image-${index}`} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => {
                        const file = e.target.files?.[0];
                        const error = file ? validateCheckinImage(file) : null;
                        if (error) { toast.error(error); e.target.value = ""; }
                        setIdImages(current => { const next = { ...current }; if (file && !error) next[index] = file; else delete next[index]; return next; });
                      }} />
                      <p className="text-xs text-muted-foreground">JPG, PNG or WebP · Maximum 5 MB · Shared privately with your hotel</p>
                      {guest.id_document_path && <p className="text-sm text-primary">ID image saved</p>}
                    </div>;
                  })}
                  <div><Label>Estimated time of arrival</Label>
                    <Input type="time" value={checkin.eta} onChange={e => setCheckin({ ...checkin, eta: e.target.value })} /></div>
                  <div><Label>Special requests</Label>
                    <Textarea rows={3} maxLength={1000} value={checkin.requests} onChange={e => setCheckin({ ...checkin, requests: e.target.value })} /></div>
                  <Button onClick={submitCheckin} disabled={busy}>
                    {busy && <Loader2 className="animate-spin h-4 w-4 mr-2" />}<Check className="h-4 w-4 mr-2" /> Submit
                  </Button>
  </div>;
}
