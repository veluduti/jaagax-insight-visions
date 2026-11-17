import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { loadBrands, brandAction, type BrandRecord } from "@/services/hospitality/brandService";
import { toast } from "sonner";
export default function BrandApprovalsPanel() {
  const [brands, setBrands] = useState<BrandRecord[]>([]), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const load = async () => { try { setBrands((await loadBrands()).filter(b => b.pending)); setError(""); } catch { setError("Could not load brand approvals"); } };
  useEffect(() => { void load(); }, []);
  return <section className="space-y-3"><h2 className="font-semibold">Brand Changes Awaiting Approval</h2>{error && <p role="alert">{error}<Button onClick={load}>Retry</Button></p>}{!brands.length && !error && <p className="text-muted-foreground">No pending brand changes.</p>}{brands.map(b => <div key={b.id} className="border-b border-border py-3"><h3 className="font-semibold">{b.pending?.name}</h3><details className="my-2"><summary>Review proposed settings</summary><pre className="text-xs whitespace-pre-wrap break-all max-h-80 overflow-auto">{JSON.stringify(b.pending, null, 2)}</pre></details><div className="flex gap-2">{(['approve', 'reject'] as const).map(action => <Button key={action} disabled={busy} variant={action === 'approve' ? 'default' : 'outline'} onClick={async () => { setBusy(true); try { await brandAction(b.partner_id, action, b.id); toast.success(action === 'approve' ? 'Brand changes approved' : 'Brand changes rejected'); await load(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not review brand'); } finally { setBusy(false); } }}>{action === 'approve' ? 'Approve' : 'Reject'}</Button>)}</div></div>)}</section>;
}