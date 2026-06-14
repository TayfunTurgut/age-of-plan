import { Helmet } from "react-helmet-async";

const BRAND = "Age of Plan";
const SITE_URL = "https://ageofplan.com";

interface SeoProps {
  title: string;
  description: string;
  /** Path relative to the site root, starting with "/". Used for canonical + og:url. */
  path: string;
}

/**
 * Per-route head tags. Titles are auto-suffixed with the brand when there is
 * room (kept under ~60 chars). Description should be 50–160 chars. Canonical
 * and og:url are absolute against the production domain.
 */
export function Seo({ title, description, path }: SeoProps) {
  const fullTitle =
    title === BRAND
      ? BRAND
      : title.length + BRAND.length + 3 <= 60
        ? `${title} · ${BRAND}`
        : title;
  const url = `${SITE_URL}${path}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
}

export default Seo;
