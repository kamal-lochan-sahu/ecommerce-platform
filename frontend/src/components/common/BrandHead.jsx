import { useEffect } from 'react';
import useStoreSettings from '../../hooks/useStoreSettings';
import { setBrandTitle } from '../../utils/pageTitle';

// Kuch dikhata nahi: tab ka title aur meta description store ke naam/tagline se set karta hai.
export default function BrandHead() {
  const { settings, brandName } = useStoreSettings();
  const tagline = settings.tagline || '';

  useEffect(() => {
    setBrandTitle(brandName, tagline);
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', tagline || `Shop online at ${brandName}`);
  }, [brandName, tagline]);

  return null;
}
