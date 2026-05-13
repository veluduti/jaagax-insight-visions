import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description?: string;
  canonicalPath?: string;
  image?: string;
  type?: "website" | "article" | "product";
  jsonLd?: Record<string, any> | Record<string, any>[];
}

const SITE_NAME = "JAAGA X";
const BASE_URL = "https://jaagax-insight-visions.lovable.app";

const truncate = (str: string, n: number) =>
  str.length > n ? str.slice(0, n - 1).trimEnd() + "…" : str;

export default function SEO({
  title,
  description,
  canonicalPath,
  image,
  type = "website",
  jsonLd,
}: SEOProps) {
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const finalTitle = truncate(fullTitle, 60);
  const finalDesc = description ? truncate(description, 160) : undefined;
  const url = canonicalPath ? `${BASE_URL}${canonicalPath}` : undefined;
  const ldArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{finalTitle}</title>
      {finalDesc && <meta name="description" content={finalDesc} />}
      {url && <link rel="canonical" href={url} />}
      <meta property="og:title" content={finalTitle} />
      {finalDesc && <meta property="og:description" content={finalDesc} />}
      <meta property="og:type" content={type} />
      {url && <meta property="og:url" content={url} />}
      {image && <meta property="og:image" content={image} />}
      <meta name="twitter:card" content={image ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={finalTitle} />
      {finalDesc && <meta name="twitter:description" content={finalDesc} />}
      {image && <meta name="twitter:image" content={image} />}
      {ldArray.map((ld, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(ld)}</script>
      ))}
    </Helmet>
  );
}
