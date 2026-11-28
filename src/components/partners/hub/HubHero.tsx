import type { ReactNode } from "react";
import heroImg from "@/assets/resort-luxury.jpg";

export const P = "hsl(268,84%,52%)";

export default function HubHero({ badge, title, accent, text, children, side, image }: { image?: string; badge?: ReactNode; title: string; accent: string; text: string; children?: ReactNode; side?: ReactNode }) {
  return (
    <section className="relative overflow-hidden">
      <img src={image ?? heroImg} alt="Resort with pool at dusk" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0" style={{ background: "linear-gradient(90deg,hsl(265 75% 18% / .95) 0%,hsl(268 70% 28% / .8) 40%,transparent 75%)" }} />
      <div className="container relative mx-auto flex flex-col gap-6 px-4 pb-20 pt-10 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xl text-white">
          {badge && <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-semibold text-[hsl(255,40%,14%)]">{badge}</span>}
          <h1 className="mt-4 text-4xl font-extrabold leading-tight md:text-5xl">{title} <span className="text-[hsl(270,90%,80%)]">{accent}</span></h1>
          <p className="mt-3 text-white/90 md:text-lg">{text}</p>
          <div className="mt-6 flex flex-wrap gap-3">{children}</div>
        </div>
        {side}
      </div>
    </section>
  );
}

export const card = "rounded-2xl border border-[hsl(265,40%,90%)] bg-white p-5 shadow-sm";
export const btnPrimary = "inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-bold text-white bg-gradient-to-r from-[hsl(268,84%,52%)] to-[hsl(252,85%,48%)]";
export const btnGhost = "inline-flex items-center gap-2 rounded-lg border border-white/70 px-5 py-3 text-sm font-semibold text-white";
export const btnOutline = "inline-flex items-center justify-center gap-2 rounded-lg border-2 border-[hsl(268,84%,52%)] px-5 py-2.5 text-sm font-bold text-[hsl(268,84%,52%)] hover:bg-[hsl(268,80%,96%)]";
