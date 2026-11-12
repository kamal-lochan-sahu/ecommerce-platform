import { useState } from 'react';
import { Package } from 'lucide-react';
import useStoreSettings from '../../hooks/useStoreSettings';

// Client ka logo (Admin -> Settings -> Logo URL). Logo na ho ya load na ho to icon + store ka naam.
export default function BrandLogo({ iconSize = 24, imgClass = 'h-8 w-auto max-w-[160px] object-contain' }) {
  const { settings, brandName } = useStoreSettings();
  const [failedUrl, setFailedUrl] = useState('');
  const logo = settings.logoUrl;

  if (logo && failedUrl !== logo) {
    return <img src={logo} alt={brandName} className={imgClass} onError={() => setFailedUrl(logo)} />;
  }
  return (
    <>
      <Package size={iconSize} />
      <span>{brandName}</span>
    </>
  );
}
