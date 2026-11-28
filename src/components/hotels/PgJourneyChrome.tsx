import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Check, MapPin } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import "@/styles/pg-journey.css";
export const pgMoney=(n:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(n);
export function PgShell({children,className=""}:{children:ReactNode;className?:string}) { return <div className={`pg-journey min-h-screen bg-background text-foreground ${className}`}><Navigation/>{children}<Footer/></div>; }
export function PgSteps({labels,current}:{labels:string[];current:number}) {return <ol className="pg-steps">{labels.map((l,i)=><li key={l} aria-current={i===current?"step":undefined} className={i<=current?"is-current":""}><span>{i<current?<Check size={15}/>:i+1}</span><b>{l}</b></li>)}</ol>;}
export function PgSummary({hotel,room}:{hotel:any;room?:any}) {return <div className="pg-summary">{hotel.images?.[0]&&<img src={hotel.images[0]} alt={hotel.name}/>}<div className="min-w-0"><h2 className="text-lg font-bold">{hotel.name}</h2><p className="my-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin size={14}/>{[hotel.locality,hotel.city].filter(Boolean).join(", ")}</p>{hotel.onboarding_status==="published"&&<Badge variant="secondary" className="bg-accent text-primary">Published on Jaaga</Badge>}{Number(room?.monthly_price)>0&&<p className="mt-2 text-sm font-semibold">{pgMoney(Number(room.monthly_price))} / month</p>}</div></div>;}
export function PgSection({title,icon,children}:{title:string;icon:ReactNode;children:ReactNode}) {return <section className="pg-section"><h2 className="mb-3 flex items-center gap-2 text-base font-bold"><span className="text-primary">{icon}</span>{title}</h2>{children}</section>;}
export function PgBreadcrumb({hotel,label}:{hotel:any;label:string}) {return <nav className="mb-5 flex flex-wrap gap-2 text-xs text-muted-foreground"><Link to="/">Home</Link><span>›</span><Link to={`/hotels/${hotel.id}`}>{hotel.name}</Link><span>›</span><span>{label}</span></nav>;}
