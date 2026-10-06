import { FormEvent, useState } from "react";
import { MessageCircle, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { askTravelAI } from "@/services/travelService";
import { toast } from "sonner";

export default function AskJaaga({ context = "" }: { context?: string }) {
  const [question, setQuestion] = useState(""); const [answer, setAnswer] = useState(""); const [loading, setLoading] = useState(false);
  const submit = async (e: FormEvent) => { e.preventDefault(); if (!question.trim()) return; setLoading(true); try { const result = await askTravelAI(question, context); setAnswer(result.answer ?? ""); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not answer right now."); } finally { setLoading(false); } };
  return <Sheet><SheetTrigger asChild><Button className="fixed bottom-20 right-4 z-40 shadow-xl xl:bottom-6" size="lg"><Sparkles />Ask JAAGA</Button></SheetTrigger>
    <SheetContent side="right" className="w-full sm:max-w-md"><SheetHeader><SheetTitle className="flex items-center gap-2"><MessageCircle className="text-primary" />Ask JAAGA</SheetTitle><SheetDescription>Your travel companion understands the page and plan you are viewing.</SheetDescription></SheetHeader>
      <div className="mt-6 flex h-[calc(100vh-11rem)] flex-col"><div className="flex-1 overflow-y-auto rounded-lg bg-muted/50 p-4"><p className="text-sm text-muted-foreground">Ask for a quieter day, hidden places, family options, a better stay area, or why something was recommended.</p>{answer && <div className="mt-4 rounded-lg border border-primary/20 bg-card p-4 text-sm leading-6 text-foreground">{answer}</div>}</div>
      <form onSubmit={submit} className="mt-3 flex gap-2"><Input value={question} onChange={(e)=>setQuestion(e.target.value)} placeholder="What should I do today?" /><Button size="icon" disabled={loading} aria-label="Send question"><Send /></Button></form></div>
    </SheetContent></Sheet>;
}