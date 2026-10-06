import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, BedDouble, Check } from "lucide-react";

export interface StayListing {
  id: string;
  hotelId: string;
  name: string;
  area: string;
  city: string;
  typeLabel: string;
  roomType: string;
  price: number;
  photos: string[];
  highlights: string[];
  maxAdults: number | null;
  maxOccupancy: number | null;
  units: number | null;
}

/** Shows only the partner-entered data for one listing — nothing invented. */
export default function StayListingDetail({ listing, onClose, onBook }: {
  listing: StayListing | null; onClose: () => void; onBook: (l: StayListing) => void;
}) {
  if (!listing) return null;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {listing.photos[0] && (
          <img src={listing.photos[0]} alt={listing.name} className="h-64 w-full object-cover" />
        )}
        <div className="space-y-5 p-6">
          <DialogHeader className="space-y-2 text-left">
            <Badge variant="secondary" className="w-fit">{listing.typeLabel}</Badge>
            <DialogTitle className="text-2xl">{listing.name}</DialogTitle>
            {(listing.area || listing.city) && (
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                {[listing.area, listing.city].filter(Boolean).join(", ")}
              </p>
            )}
          </DialogHeader>

          <div className="flex flex-wrap gap-2 text-sm">
            {listing.roomType && (
              <span className="flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5"><BedDouble className="h-4 w-4" />{listing.roomType}</span>
            )}
            {(listing.maxOccupancy || listing.maxAdults) && (
              <span className="flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5"><Users className="h-4 w-4" />Up to {listing.maxOccupancy || listing.maxAdults} guests</span>
            )}
          </div>

          {listing.highlights.length > 0 && (
            <div>
              <h3 className="mb-2 font-semibold">Highlights</h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {listing.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{h}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between gap-4 rounded-xl bg-muted p-4">
            <div>
              <p className="text-xs text-muted-foreground">Price per night</p>
              <p className="text-2xl font-bold">₹{listing.price.toLocaleString("en-IN")}</p>
            </div>
            <Button size="lg" onClick={() => onBook(listing)}>Book</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
