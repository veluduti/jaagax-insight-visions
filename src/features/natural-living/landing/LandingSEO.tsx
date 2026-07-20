import { Helmet } from "react-helmet-async";
import { FAQ_ITEMS } from "./FAQSection";

const URL = "https://jaagax-insight-visions.lovable.app/natural-living";
const TITLE = "JAAGAX Natural Living — Land, Farms & Community";
const DESC =
  "Discover your Natural Living journey — farmland, weekend farms, retirement, investment, retreats and rural communities, guided by AI.";

export default function LandingSEO() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "JAAGAX Natural Living",
    url: URL,
    description: DESC,
  };
  return (
    <Helmet>
      <title>{TITLE}</title>
      <meta name="description" content={DESC} />
      <link rel="canonical" href={URL} />
      <meta property="og:title" content={TITLE} />
      <meta property="og:description" content={DESC} />
      <meta property="og:url" content={URL} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={TITLE} />
      <meta name="twitter:description" content={DESC} />
      <script type="application/ld+json">{JSON.stringify(orgLd)}</script>
      <script type="application/ld+json">{JSON.stringify(faqLd)}</script>
    </Helmet>
  );
}
