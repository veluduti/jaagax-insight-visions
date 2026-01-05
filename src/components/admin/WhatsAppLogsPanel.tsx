import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquare, RefreshCw, Search, Send, CheckCircle, 
  XCircle, Clock, Eye, Download, Phone, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface WhatsAppLog {
  id: string;
  booking_id: string | null;
  recipient: string;
  message: string;
  template_type: string | null;
  status: string;
  error_message: string | null;
  twilio_sid: string | null;
  created_at: string;
  delivery_status?: string;
  delivered_at?: string;
  read_at?: string;
  retry_count?: number;
}

interface WhatsAppStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  delivered: number;
}

export function WhatsAppLogsPanel() {
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [stats, setStats] = useState<WhatsAppStats>({ total: 0, sent: 0, failed: 0, pending: 0, delivered: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<WhatsAppLog | null>(null);
  const [resending, setResending] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [statusFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('whatsapp_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Cast data to our interface type (new columns may not be in generated types yet)
      const typedData = (data || []) as unknown as WhatsAppLog[];
      setLogs(typedData);

      // Calculate stats
      setStats({
        total: typedData.length,
        sent: typedData.filter(l => l.status === 'sent').length,
        failed: typedData.filter(l => l.status === 'failed').length,
        pending: typedData.filter(l => l.status === 'pending').length,
        delivered: typedData.filter(l => l.delivery_status === 'delivered').length,
      });
    } catch (error: any) {
      toast.error("Failed to fetch WhatsApp logs");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resendMessage = async (log: WhatsAppLog) => {
    setResending(log.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('send-whatsapp', {
        body: {
          to: log.recipient,
          message: log.message,
          bookingId: log.booking_id
        }
      });

      if (response.error) throw response.error;

      toast.success("Message resent successfully");
      fetchLogs();
    } catch (error: any) {
      toast.error(error.message || "Failed to resend message");
    } finally {
      setResending(null);
    }
  };

  const exportLogs = () => {
    const csvContent = [
      ['ID', 'Recipient', 'Template', 'Status', 'Error', 'Twilio SID', 'Created At'].join(','),
      ...logs.map(log => [
        log.id,
        log.recipient,
        log.template_type || '',
        log.status,
        log.error_message || '',
        log.twilio_sid || '',
        log.created_at
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whatsapp-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Logs exported successfully");
  };

  const filteredLogs = logs.filter(log => 
    log.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.booking_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Sent</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'delivered':
        return <Badge className="bg-blue-500"><CheckCircle className="h-3 w-3 mr-1" />Delivered</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDeliveryStatusBadge = (deliveryStatus?: string) => {
    if (!deliveryStatus) return null;
    switch (deliveryStatus) {
      case 'delivered':
        return <Badge className="bg-blue-500 text-xs">Delivered</Badge>;
      case 'read':
        return <Badge className="bg-purple-500 text-xs">Read</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="text-xs">Delivery Failed</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{deliveryStatus}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Sent</p>
                <p className="text-xl font-bold">{stats.sent}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-xs text-muted-foreground">Failed</p>
                <p className="text-xl font-bold">{stats.failed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Delivered</p>
                <p className="text-xl font-bold">{stats.delivered}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-green-500" />
                WhatsApp Message Logs
              </CardTitle>
              <CardDescription>Monitor and manage WhatsApp notifications</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportLogs}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button size="sm" onClick={fetchLogs} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by phone, booking ID, or message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Logs Table */}
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {loading ? "Loading logs..." : "No WhatsApp logs found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">{log.recipient}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.template_type || 'custom'}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell>{getDeliveryStatusBadge(log.delivery_status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(log.created_at), 'MMM d, HH:mm')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg">
                              <DialogHeader>
                                <DialogTitle>Message Details</DialogTitle>
                              </DialogHeader>
                              {selectedLog && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <p className="text-muted-foreground">Recipient</p>
                                      <p className="font-mono">{selectedLog.recipient}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Status</p>
                                      {getStatusBadge(selectedLog.status)}
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Template</p>
                                      <p>{selectedLog.template_type || 'custom'}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Twilio SID</p>
                                      <p className="font-mono text-xs">{selectedLog.twilio_sid || '-'}</p>
                                    </div>
                                    {selectedLog.booking_id && (
                                      <div className="col-span-2">
                                        <p className="text-muted-foreground">Booking ID</p>
                                        <p className="font-mono text-xs">{selectedLog.booking_id}</p>
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground text-sm mb-2">Message</p>
                                    <div className="bg-muted p-3 rounded-lg text-sm whitespace-pre-wrap">
                                      {selectedLog.message}
                                    </div>
                                  </div>
                                  {selectedLog.error_message && (
                                    <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
                                      <div className="flex items-center gap-2 text-destructive mb-1">
                                        <AlertTriangle className="h-4 w-4" />
                                        <span className="font-medium">Error</span>
                                      </div>
                                      <p className="text-sm text-destructive">{selectedLog.error_message}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          {log.status === 'failed' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => resendMessage(log)}
                              disabled={resending === log.id}
                            >
                              <RefreshCw className={`h-4 w-4 ${resending === log.id ? 'animate-spin' : ''}`} />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
