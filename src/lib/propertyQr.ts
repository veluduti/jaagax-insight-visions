export const PUBLIC_SITE_ORIGIN = "https://jaagax.com";
/** Permanent QR target: resolves the Jaagax Property ID to the property's public details page. */
export const propertyQrUrl = (reference: string) => `${PUBLIC_SITE_ORIGIN}/p/${encodeURIComponent(reference.trim().toUpperCase())}`;
