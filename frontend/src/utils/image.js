// Responsive image helpers.
// Unsplash serves images through an image-resizing API (imgix-style query
// params), so we can ask for exactly the widths we need instead of shipping
// one full-size JPEG to every viewport. Any other host (e.g. placehold.co
// fallback) just gets its src passed through unchanged.

const UNSPLASH_HOST = "images.unsplash.com";
const DEFAULT_WIDTHS = [200, 400, 600, 800];

function withWidth(url, width) {
  try {
    const u = new URL(url);
    u.searchParams.set("w", String(width));
    u.searchParams.set("auto", "format");
    u.searchParams.set("fit", "crop");
    u.searchParams.set("q", "75");
    return u.toString();
  } catch {
    return url;
  }
}

export function isUnsplashUrl(url) {
  return typeof url === "string" && url.includes(UNSPLASH_HOST);
}

export function buildSrcSet(url, widths = DEFAULT_WIDTHS) {
  if (!isUnsplashUrl(url)) return undefined;
  return widths.map((w) => `${withWidth(url, w)} ${w}w`).join(", ");
}

/**
 * Spread this onto an <img> tag: <img {...buildResponsiveImageProps(url)} .../>
 * Returns { src, srcSet, sizes } for Unsplash URLs, or just { src } otherwise.
 */
export function buildResponsiveImageProps(url, { widths = DEFAULT_WIDTHS, sizes } = {}) {
  if (!isUnsplashUrl(url)) {
    return { src: url };
  }
  return {
    src: withWidth(url, widths[widths.length - 1]),
    srcSet: buildSrcSet(url, widths),
    sizes: sizes || "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
  };
}
