import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Phone, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  property_id: string;
  agent_user_id: string;
  seller_user_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  read_at: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  propertyTitle: string;
  agentUserId: string;       // agents.user_id
  sellerUserId: string;      // properties.submitted_by
  currentUserId: string;     // viewer
  counterpart: { name: string; photo_url?: string | null; phone?: string | null; role: "agent" | "seller" };
}

export default function PropertyChat({
  open, onOpenChange, propertyId, propertyTitle,
  agentUserId, sellerUserId, currentUserId, counterpart,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initial load + realtime
  useEffect(() => {
    if (!open) return;
    let channel: any;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("property_chat_messages")
        .select("*")
        .eq("property_id", propertyId)
        .eq("agent_user_id", agentUserId)
        .eq("seller_user_id", sellerUserId)
        .order("created_at", { ascending: true });
      if (error) console.error(error);
      setMessages((data as Message[]) || []);
      setLoading(false);

      // Mark unread as read
      await supabase
        .from("property_chat_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("property_id", propertyId)
        .neq("sender_id", currentUserId)
        .is("read_at", null);

      channel = supabase
        .channel(`pcm-${propertyId}-${agentUserId}-${sellerUserId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "property_chat_messages", filter: `property_id=eq.${propertyId}` },
          (payload) => {
            const m = payload.new as Message;
            if (m.agent_user_id === agentUserId && m.seller_user_id === sellerUserId) {
              setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
            }
          },
        )
        .subscribe();
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [open, propertyId, agentUserId, sellerUserId, currentUserId]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const send = async () => {
    const msg = input.trim();
    if (!msg) return;
    setSending(true);
    setInput("");
    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      property_id: propertyId,
      agent_user_id: agentUserId,
      seller_user_id: sellerUserId,
      sender_id: currentUserId,
      message: msg,
      created_at: new Date().toISOString(),
      read_at: null,
    };
    setMessages((prev) => [...prev, optimistic]);

    const { data, error } = await supabase
      .from("property_chat_messages")
      .insert({
        property_id: propertyId,
        agent_user_id: agentUserId,
        seller_user_id: sellerUserId,
        sender_id: currentUserId,
        message: msg,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to send message");
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setSending(false);
      return;
    }

    // Replace optimistic with real
    setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? (data as Message) : m)));

    // Notify the counterpart (in-app notification)
    const recipientId = currentUserId === agentUserId ? sellerUserId : agentUserId;
    try {
      await supabase.from("notifications").insert({
        user_id: recipientId,
        type: "chat_message",
        title: `New message from ${counterpart.role === "agent" ? "your agent" : "the owner"}`,
        message: msg.length > 80 ? msg.slice(0, 80) + "…" : msg,
        link: `/property/${propertyId}`,
      });
    } catch (e) { /* ignore */ }
    setSending(false);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden h-[80vh] flex flex-col gap-0">
        {/* WhatsApp-style header */}
        <DialogHeader className="p-4 border-b bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 space-y-0">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={counterpart.photo_url || undefined} />
              <AvatarFallback className="bg-emerald-500 text-white">
                {counterpart.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 text-left">
              <DialogTitle className="text-sm truncate">{counterpart.name}</DialogTitle>
              <p className="text-[11px] text-muted-foreground truncate">
                {counterpart.role === "agent" ? "Assigned Agent" : "Property Owner"} · {propertyTitle}
              </p>
            </div>
            {counterpart.phone && (
              <a href={`tel:${counterpart.phone}`}>
                <Button size="icon" variant="ghost" className="h-9 w-9">
                  <Phone className="h-4 w-4" />
                </Button>
              </a>
            )}
          </div>
        </DialogHeader>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-2 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22><circle cx=%221%22 cy=%221%22 r=%221%22 fill=%22%23e5e7eb%22 opacity=%220.3%22/></svg>')]"
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>No messages yet — say hello 👋</p>
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === currentUserId;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                      mine
                        ? "bg-emerald-500 text-white rounded-br-sm"
                        : "bg-card border rounded-bl-sm"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.message}</p>
                    <p className={`text-[10px] mt-0.5 ${mine ? "text-white/70" : "text-muted-foreground"} text-right`}>
                      {formatTime(m.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t bg-background flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Type a message…"
            disabled={sending}
          />
          <Button onClick={send} disabled={sending || !input.trim()} size="icon" className="bg-emerald-500 hover:bg-emerald-600 shrink-0">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
