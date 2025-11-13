import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Users, Calendar, Phone, Mail, MessageSquare, 
  CheckCircle, XCircle, Clock, TrendingUp, Loader2,
  Eye
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  created_at: string;
  project_id: number;
  projects?: { name: string };
}

interface SiteVisit {
  id: string;
  visitor_name: string;
  visitor_email: string;
  visitor_phone: string;
  visit_date: string;
  visit_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled';
  notes: string;
  created_at: string;
  project_id: number;
  projects?: { name: string };
}

export const LeadsCRMPanel = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [siteVisits, setSiteVisits] = useState<SiteVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<SiteVisit | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [
        { data: leadsData, error: leadsError },
        { data: visitsData, error: visitsError }
      ] = await Promise.all([
        supabase
          .from("leads")
          .select("*, projects(name)")
          .order("created_at", { ascending: false }),
        supabase
          .from("site_visits")
          .select("*, projects(name)")
          .order("created_at", { ascending: false })
      ]);

      if (leadsError) {
        console.error("Leads fetch error:", leadsError);
        throw new Error(`Leads: ${leadsError.message}`);
      }
      if (visitsError) {
        console.error("Visits fetch error:", visitsError);
        throw new Error(`Visits: ${visitsError.message}`);
      }

      setLeads(leadsData || []);
      setSiteVisits(visitsData || []);
    } catch (error: any) {
      console.error("Error fetching CRM data:", error);
      toast.error(error.message || "Failed to load CRM data");
    } finally {
      setLoading(false);
    }
  };

  const updateLeadStatus = async (leadId: string, status: Lead['status']) => {
    try {
      setUpdatingStatus(true);
      const { error } = await supabase
        .from("leads")
        .update({ status })
        .eq("id", leadId);

      if (error) throw error;

      toast.success("Lead status updated");
      fetchData();
      setSelectedLead(null);
    } catch (error) {
      console.error("Error updating lead:", error);
      toast.error("Failed to update lead status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const updateVisitStatus = async (visitId: string, status: SiteVisit['status']) => {
    try {
      setUpdatingStatus(true);
      const { error } = await supabase
        .from("site_visits")
        .update({ status })
        .eq("id", visitId);

      if (error) throw error;

      toast.success("Visit status updated");
      fetchData();
      setSelectedVisit(null);
    } catch (error) {
      console.error("Error updating visit:", error);
      toast.error("Failed to update visit status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; icon: any }> = {
      new: { variant: "default", icon: Clock },
      contacted: { variant: "secondary", icon: Phone },
      qualified: { variant: "default", icon: TrendingUp },
      converted: { variant: "default", icon: CheckCircle },
      lost: { variant: "destructive", icon: XCircle },
      pending: { variant: "secondary", icon: Clock },
      confirmed: { variant: "default", icon: CheckCircle },
      completed: { variant: "default", icon: CheckCircle },
      cancelled: { variant: "destructive", icon: XCircle },
    };

    const config = statusConfig[status] || { variant: "secondary", icon: Clock };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const stats = {
    totalLeads: leads.length,
    newLeads: leads.filter(l => l.status === 'new').length,
    convertedLeads: leads.filter(l => l.status === 'converted').length,
    pendingVisits: siteVisits.filter(v => v.status === 'pending').length,
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-3xl font-bold">{stats.totalLeads}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">New Leads</p>
                <p className="text-3xl font-bold">{stats.newLeads}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Converted</p>
                <p className="text-3xl font-bold">{stats.convertedLeads}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Visits</p>
                <p className="text-3xl font-bold">{stats.pendingVisits}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leads & Site Visits CRM</CardTitle>
          <CardDescription>Manage leads and scheduled site visits</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="leads">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="leads">Leads ({leads.length})</TabsTrigger>
              <TabsTrigger value="visits">Site Visits ({siteVisits.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="leads" className="space-y-4">
              <div className="divide-y">
                {leads.map((lead) => (
                  <div key={lead.id} className="py-4 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold">{lead.name}</h4>
                        {getStatusBadge(lead.status)}
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p className="flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          {lead.email}
                        </p>
                        {lead.phone && (
                          <p className="flex items-center gap-2">
                            <Phone className="h-3 w-3" />
                            {lead.phone}
                          </p>
                        )}
                        <p className="flex items-center gap-2">
                          <MessageSquare className="h-3 w-3" />
                          {lead.projects?.name || `Project ID: ${lead.project_id}`}
                        </p>
                        <p className="text-xs">
                          {new Date(lead.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedLead(lead)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="visits" className="space-y-4">
              <div className="divide-y">
                {siteVisits.map((visit) => (
                  <div key={visit.id} className="py-4 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold">{visit.visitor_name}</h4>
                        {getStatusBadge(visit.status)}
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p className="flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          {visit.visitor_email}
                        </p>
                        {visit.visitor_phone && (
                          <p className="flex items-center gap-2">
                            <Phone className="h-3 w-3" />
                            {visit.visitor_phone}
                          </p>
                        )}
                        <p className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          {new Date(visit.visit_date).toLocaleDateString()} at {visit.visit_time}
                        </p>
                        <p className="flex items-center gap-2">
                          <MessageSquare className="h-3 w-3" />
                          {visit.projects?.name || `Project ID: ${visit.project_id}`}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedVisit(visit)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <p className="text-sm">{selectedLead.name}</p>
              </div>
              <div>
                <Label>Email</Label>
                <p className="text-sm">{selectedLead.email}</p>
              </div>
              {selectedLead.phone && (
                <div>
                  <Label>Phone</Label>
                  <p className="text-sm">{selectedLead.phone}</p>
                </div>
              )}
              {selectedLead.message && (
                <div>
                  <Label>Message</Label>
                  <p className="text-sm">{selectedLead.message}</p>
                </div>
              )}
              <div>
                <Label>Project</Label>
                <p className="text-sm">{selectedLead.projects?.name || `ID: ${selectedLead.project_id}`}</p>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={selectedLead.status}
                  onValueChange={(value) => updateLeadStatus(selectedLead.id, value as Lead['status'])}
                  disabled={updatingStatus}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Site Visit Detail Dialog */}
      <Dialog open={!!selectedVisit} onOpenChange={() => setSelectedVisit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Site Visit Details</DialogTitle>
          </DialogHeader>
          {selectedVisit && (
            <div className="space-y-4">
              <div>
                <Label>Visitor Name</Label>
                <p className="text-sm">{selectedVisit.visitor_name}</p>
              </div>
              <div>
                <Label>Email</Label>
                <p className="text-sm">{selectedVisit.visitor_email}</p>
              </div>
              {selectedVisit.visitor_phone && (
                <div>
                  <Label>Phone</Label>
                  <p className="text-sm">{selectedVisit.visitor_phone}</p>
                </div>
              )}
              <div>
                <Label>Visit Date & Time</Label>
                <p className="text-sm">
                  {new Date(selectedVisit.visit_date).toLocaleDateString()} at {selectedVisit.visit_time}
                </p>
              </div>
              {selectedVisit.notes && (
                <div>
                  <Label>Notes</Label>
                  <p className="text-sm">{selectedVisit.notes}</p>
                </div>
              )}
              <div>
                <Label>Project</Label>
                <p className="text-sm">{selectedVisit.projects?.name || `ID: ${selectedVisit.project_id}`}</p>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={selectedVisit.status}
                  onValueChange={(value) => updateVisitStatus(selectedVisit.id, value as SiteVisit['status'])}
                  disabled={updatingStatus}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="rescheduled">Rescheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
