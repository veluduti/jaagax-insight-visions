import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { locationPreferenceService, LocationType } from "@/services/locationPreferenceService";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  builderProfileId: string;
  onAdded?: () => void;
}

export default function AddLocationModal({ open, onOpenChange, builderProfileId, onAdded }: Props) {
  const [city, setCity] = useState("");
  const [locality, setLocality] = useState("");
  const [pincode, setPincode] = useState("");
  const [type, setType] = useState<LocationType>("preferred");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!city.trim()) {
      toast.error("City is required");
      return;
    }
    setSaving(true);
    try {
      await locationPreferenceService.addPreferredLocation(builderProfileId, {
        city: city.trim(),
        locality: locality.trim() || undefined,
        pincode: pincode.trim() || undefined,
        location_type: type,
        source: "manual",
      });
      toast.success("Location added");
      setCity(""); setLocality(""); setPincode(""); setType("preferred");
      onOpenChange(false);
      onAdded?.();
    } catch (e: any) {
      toast.error(e.message || "Failed to add");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Preferred Location</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>City *</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Bengaluru" />
          </div>
          <div>
            <Label>Locality</Label>
            <Input value={locality} onChange={(e) => setLocality(e.target.value)} placeholder="Whitefield" />
          </div>
          <div>
            <Label>Pincode</Label>
            <Input value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="560066" />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as LocationType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="preferred">Preferred</SelectItem>
                <SelectItem value="visited">Visited</SelectItem>
                <SelectItem value="searched">Searched</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? "Adding..." : "Add Location"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
