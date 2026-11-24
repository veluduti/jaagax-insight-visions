import { Link } from "react-router-dom";
import { Building2 } from "lucide-react";

export default function PartnerFooter() {
  return (
    <footer className="hidden md:block js-nav border-t">
      <div className="container mx-auto grid gap-8 px-4 py-12 md:grid-cols-4">
        <div>
          <Link to="/partners" className="flex items-center gap-2 font-bold">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-[hsl(268,84%,52%)] to-[hsl(252,85%,48%)]">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            JAAGA X Partners
          </Link>
          <p className="mt-3 js-muted-text text-sm">
            The complete hotel commerce platform. Grow direct bookings, sync inventory, and manage everything from one place.
          </p>
        </div>
        <FooterCol title="Product" items={[["Why Partner", "#why"], ["Benefits", "#benefits"], ["Pricing", "#pricing"]]} />
        <FooterCol title="Support" items={[["FAQ", "#faq"], ["Contact Sales", "#contact"], ["Help Center", "#contact"]]} />
        <FooterCol title="Get started" items={[["Log in", "/partners/login"], ["List your hotel", "/partners/register"]]} />
      </div>
      <div className="js-muted-text border-t js-line-b py-4 text-center text-xs">
        © {new Date().getFullYear()} JAAGA X. All rights reserved.
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold">{title}</p>
      <ul className="space-y-2 js-muted-text text-sm">
        {items.map(([label, href]) => (
          <li key={label}>
            {href.startsWith("#") ? (
              <a href={href} className="hover:text-foreground">{label}</a>
            ) : (
              <Link to={href} className="hover:text-foreground">{label}</Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
