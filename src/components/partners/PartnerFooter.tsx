import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import resortAsset from "@/assets/resources-purple-resort.png.asset.json";

export default function PartnerFooter() {
  return (
    <footer className="partner-platform-footer">
      <img src={resortAsset.url} alt="" className="partner-footer-scenery" loading="lazy" />
      <div className="partner-footer-shade" />
      <div className="partner-footer-inner">
        <div className="partner-footer-columns">
          <div className="partner-footer-brand">
          <Link to="/partners" aria-label="JAAGA X Partners" className="partner-footer-logo">
            JAAGA <span>X</span>
          </Link>
          <p className="partner-footer-tagline">Unified Hospitality Platform</p>
          <p className="partner-footer-description">Manage properties, bookings and hospitality operations in one platform.</p>
          </div>
          <FooterCol title="Platform" items={[["Property Management", "/partners/solutions#cover"], ["Channel Manager", "/partners/solutions#integrations"], ["CRM", "/partners/solutions#needs"], ["HR & Payroll", "/partners/solutions#roles"]]} />
          <FooterCol title="For Businesses" items={[["Hotels & Resorts", "/partners/register?type=hotel"], ["PG & Hostels", "/partners/register?type=pg"], ["Co-living", "/partners/register?type=coliving"], ["Service Apartments", "/partners/register?type=serviced_apartment"]]} />
          <FooterCol title="Company" items={[["About Jaaga", "/about"], ["Partner with Jaaga", "/partners/partner-with-jaaga"], ["Pricing", "/partners/plans"], ["Contact", "/contact"]]} />
          <FooterCol title="Support" items={[["Help Center", "/partners/resources#help"], ["Book a Demo", "/partners/partner-with-jaaga#enquiry"], ["Contact Support", "/contact"]]} />
          <Button asChild variant="outline" className="partner-footer-cta"><Link to="/partners/register">List Your Property</Link></Button>
        </div>
        <div className="partner-footer-bottom">
          <p>© {new Date().getFullYear()} JAAGA X. All rights reserved.</p>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <nav aria-label={title} className="partner-footer-links">
      <h2>{title}</h2>
      <ul>
        {items.map(([label, href]) => (
          <li key={label}>
            {href.startsWith("#") ? (
              <a href={href}>{label}</a>
            ) : (
              <Link to={href}>{label}</Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
