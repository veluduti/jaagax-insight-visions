import { PropsWithChildren, ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

export function Section({
  children,
  className = "",
  tone = "cream",
}: PropsWithChildren<{ className?: string; tone?: "cream" | "sage" | "ink" | "deep" }>) {
  const bg =
    tone === "sage"
      ? "hsl(var(--nl-cream-deep))"
      : tone === "ink"
        ? "hsl(var(--nl-ink))"
        : tone === "deep"
          ? "hsl(var(--nl-forest))"
          : "hsl(var(--nl-cream))";
  const fg = tone === "ink" || tone === "deep" ? "hsl(var(--nl-cream))" : "hsl(var(--nl-ink))";
  return (
    <section className={`py-20 md:py-28 ${className}`} style={{ background: bg, color: fg }}>
      <div className="nl-container">{children}</div>
    </section>
  );
}

export function Eyebrow({ children }: PropsWithChildren) {
  return <div className="nl-eyebrow mb-4">{children}</div>;
}

export function H1({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return (
    <h1 className={`nl-serif text-4xl sm:text-5xl md:text-7xl leading-[1.02] tracking-tight ${className}`}>
      {children}
    </h1>
  );
}

export function H2({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return (
    <h2 className={`nl-serif text-3xl md:text-5xl leading-[1.05] tracking-tight ${className}`}>{children}</h2>
  );
}

export function Lede({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return (
    <p className={`text-base md:text-lg leading-relaxed max-w-2xl text-[hsl(var(--nl-ink)/0.75)] ${className}`}>
      {children}
    </p>
  );
}

export function StatBlock({ n, label, sub }: { n: string; label: string; sub?: string }) {
  return (
    <div className="border-t border-[hsl(var(--nl-forest)/0.3)] pt-5">
      <div className="nl-serif text-5xl md:text-6xl" style={{ color: "hsl(var(--nl-forest))" }}>
        {n}
      </div>
      <div className="mt-2 text-sm font-medium text-[hsl(var(--nl-ink))]">{label}</div>
      {sub && <div className="text-xs text-[hsl(var(--nl-muted))] mt-1">{sub}</div>}
    </div>
  );
}

export function EditorialCard({
  image,
  eyebrow,
  title,
  excerpt,
  to,
}: {
  image: string;
  eyebrow: string;
  title: string;
  excerpt: string;
  to: string;
}) {
  return (
    <Link to={to} className="group block">
      <div className="overflow-hidden mb-5 aspect-[4/5]" style={{ background: "hsl(var(--nl-cream-deep))" }}>
        <img
          src={image}
          alt={title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />
      </div>
      <div className="nl-eyebrow mb-2">{eyebrow}</div>
      <h3 className="nl-serif text-xl md:text-2xl leading-snug mb-2 group-hover:text-[hsl(var(--nl-forest))] transition-colors">
        {title}
      </h3>
      <p className="text-sm text-[hsl(var(--nl-ink)/0.7)] leading-relaxed">{excerpt}</p>
      <div className="mt-4 inline-flex items-center gap-1 text-xs uppercase tracking-widest text-[hsl(var(--nl-forest))]">
        Read <ArrowUpRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
}

export function CTA({
  title,
  copy,
  primary,
  secondary,
}: {
  title: string;
  copy: string;
  primary: { label: string; to: string };
  secondary?: { label: string; to: string };
}) {
  return (
    <div className="border-t border-b border-[hsl(var(--nl-forest)/0.3)] py-16 md:py-24 text-center">
      <H2 className="max-w-3xl mx-auto">{title}</H2>
      <p className="mt-6 max-w-xl mx-auto text-[hsl(var(--nl-ink)/0.7)]">{copy}</p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link to={primary.to} className="nl-btn nl-btn-primary">
          {primary.label}
        </Link>
        {secondary && (
          <Link to={secondary.to} className="nl-btn nl-btn-outline">
            {secondary.label}
          </Link>
        )}
      </div>
    </div>
  );
}

export function TwoCol({
  left,
  right,
  reverse = false,
}: {
  left: ReactNode;
  right: ReactNode;
  reverse?: boolean;
}) {
  return (
    <div className={`grid md:grid-cols-2 gap-10 md:gap-16 items-center ${reverse ? "md:[&>*:first-child]:order-2" : ""}`}>
      {left}
      {right}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  lede,
  image,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  image?: string;
}) {
  return (
    <section className="pt-16 md:pt-24 pb-12 md:pb-20" style={{ background: "hsl(var(--nl-cream))" }}>
      <div className="nl-container">
        <Eyebrow>{eyebrow}</Eyebrow>
        <H1 className="max-w-4xl">{title}</H1>
        <Lede className="mt-6 md:mt-8">{lede}</Lede>
        {image && (
          <div className="mt-12 md:mt-16 overflow-hidden aspect-[16/8]">
            <img src={image} alt={title} className="w-full h-full object-cover" />
          </div>
        )}
      </div>
    </section>
  );
}
