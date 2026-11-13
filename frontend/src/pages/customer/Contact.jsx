import { Link } from 'react-router-dom';
import { Mail, Phone, Clock, MapPin } from 'lucide-react';
import useStoreSettings from '../../hooks/useStoreSettings';
import usePageTitle from '../../hooks/usePageTitle';
import { telHref } from '../../utils/storeBrand';

// Contact details Admin -> Settings se. Jo field khali hai wo dikhta nahi.
export default function Contact() {
  usePageTitle('Contact Us');
  const { settings, brandName } = useStoreSettings();

  const items = [
    settings.supportEmail && { key: 'email', Icon: Mail, label: 'Email', value: settings.supportEmail, href: `mailto:${settings.supportEmail}` },
    settings.supportPhone && { key: 'phone', Icon: Phone, label: 'Phone', value: settings.supportPhone, href: telHref(settings.supportPhone) },
    settings.supportHours && { key: 'hours', Icon: Clock, label: 'Support hours', value: settings.supportHours },
    settings.storeAddress && { key: 'address', Icon: MapPin, label: 'Address', value: `${settings.legalName || brandName}, ${settings.storeAddress}` },
  ].filter(Boolean);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Contact Us</h1>
      <p className="text-gray-500 mb-8">We are happy to help with your order or any question about {brandName}.</p>

      {items.length > 0 ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {items.map(({ key, Icon, label, value, href }) => (
            <div key={key} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex gap-4">
              <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon size={20} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
                {href
                  ? <a href={href} className="text-gray-900 font-medium hover:text-primary break-words">{value}</a>
                  : <p className="text-gray-900 font-medium">{value}</p>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600">Contact details are not available yet. Please check back soon.</p>
      )}

      <div className="mt-10 text-sm text-gray-500 flex flex-wrap gap-x-5 gap-y-2">
        <Link to="/track-order" className="hover:text-primary hover:underline">Track your order</Link>
        <Link to="/faq" className="hover:text-primary hover:underline">FAQs</Link>
        <Link to="/shipping-policy" className="hover:text-primary hover:underline">Shipping Policy</Link>
        <Link to="/returns-policy" className="hover:text-primary hover:underline">Return & Refund Policy</Link>
      </div>
    </div>
  );
}
