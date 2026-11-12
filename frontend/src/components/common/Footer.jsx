import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import useStoreSettings from "../../hooks/useStoreSettings";
import BrandLogo from "./BrandLogo";
import { telHref } from "../../utils/storeBrand";

const links = {
  Shop:    [{ label: "All Products", href: "/products" }, { label: "New Arrivals", href: "/products?sort=newest" }],
  Account: [{ label: "My Orders", href: "/orders" }, { label: "Wishlist", href: "/wishlist" }, { label: "Profile", href: "/profile" }],
  Help:    [{ label: "Track Order", href: "/track-order" }],
};

const SOCIAL = [
  { key: "instagram", label: "IG", name: "Instagram" },
  { key: "facebook",  label: "FB", name: "Facebook" },
  { key: "x",         label: "X",  name: "X (Twitter)" },
  { key: "youtube",   label: "YT", name: "YouTube" },
];

// Naam, tagline, contact, address, GSTIN aur social links sab Admin -> Settings se.
// Jo field khali hai wo dikhta hi nahi (koi nakli email/phone nahi).
export default function Footer() {
  const { settings, brandName } = useStoreSettings();
  const socials = SOCIAL.filter((s) => settings.socialLinks?.[s.key]);

  return (
    <footer className="bg-dark text-gray-400 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 text-white font-bold text-xl mb-3">
              <BrandLogo iconSize={22} />
            </Link>
            {settings.tagline && (
              <p className="text-sm leading-relaxed mb-4">{settings.tagline}</p>
            )}
            {socials.length > 0 && (
              <div className="flex gap-3">
                {socials.map(({ key, label, name }) => (
                  <a key={key} href={settings.socialLinks[key]} target="_blank" rel="noopener noreferrer"
                    aria-label={`${brandName} on ${name}`}
                    className="w-9 h-9 rounded-xl bg-gray-800 hover:bg-primary transition-colors
                               flex items-center justify-center text-gray-400 hover:text-white text-xs font-bold">
                    {label}
                  </a>
                ))}
              </div>
            )}
          </div>

          {Object.entries(links).map(([title, items]) => (
            <div key={title}>
              <h4 className="text-white font-semibold mb-4">{title}</h4>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item.label}>
                    <Link to={item.href} className="text-sm hover:text-white transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {(settings.supportEmail || settings.supportPhone || settings.supportHours || settings.storeAddress) && (
          <div className="border-t border-gray-800 mt-10 pt-8 flex flex-col md:flex-row md:flex-wrap gap-x-8 gap-y-3 text-sm">
            {settings.supportEmail && (
              <a href={`mailto:${settings.supportEmail}`} className="flex items-center gap-2 hover:text-white transition-colors">
                <Mail size={14} /> {settings.supportEmail}
              </a>
            )}
            {settings.supportPhone && (
              <a href={telHref(settings.supportPhone)} className="flex items-center gap-2 hover:text-white transition-colors">
                <Phone size={14} /> {settings.supportPhone}
              </a>
            )}
            {settings.supportHours && (
              <span className="flex items-center gap-2"><Clock size={14} /> {settings.supportHours}</span>
            )}
            {settings.storeAddress && (
              <span className="flex items-center gap-2"><MapPin size={14} className="flex-shrink-0" /> {settings.storeAddress}</span>
            )}
          </div>
        )}

        <div className="border-t border-gray-800 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
          <p>© {new Date().getFullYear()} {settings.legalName || brandName}. All rights reserved.</p>
          {settings.gstin && <p className="text-xs">GSTIN: {settings.gstin}</p>}
        </div>
      </div>
    </footer>
  );
}
