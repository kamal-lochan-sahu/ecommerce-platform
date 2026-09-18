import { Link } from "react-router-dom";
import { Package, Mail, Phone } from "lucide-react";
import { config } from "../../config";

const links = {
  Shop:    [{ label: "All Products", href: "/products" }, { label: "New Arrivals", href: "/products?sort=newest" }, { label: "Deals", href: "/products?sale=true" }],
  Account: [{ label: "My Orders", href: "/orders" }, { label: "Wishlist", href: "/wishlist" }, { label: "Profile", href: "/profile" }],
  Help:    [{ label: "Contact Us", href: "#" }, { label: "FAQs", href: "#" }, { label: "Track Order", href: "#" }],
};

export default function Footer() {
  return (
    <footer className="bg-dark text-gray-400 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 text-white font-bold text-xl mb-3">
              <Package size={22} />
              <span>{config.clientName}</span>
            </Link>
            <p className="text-sm leading-relaxed mb-4">
              Premium quality products, delivered fast.
            </p>
            <div className="flex gap-3">
              {["IG", "TW", "YT"].map((label, i) => (
                <a key={i} href="#"
                  className="w-9 h-9 rounded-xl bg-gray-800 hover:bg-primary transition-colors
                             flex items-center justify-center text-gray-400 hover:text-white text-xs font-bold">
                  {label}
                </a>
              ))}
            </div>
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

        <div className="border-t border-gray-800 mt-10 pt-8 flex flex-col sm:flex-row
                        items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-sm">
            <a href="mailto:support@myshop.com" className="flex items-center gap-2 hover:text-white transition-colors">
              <Mail size={14} /> support@myshop.com
            </a>
            <a href="tel:+911234567890" className="flex items-center gap-2 hover:text-white transition-colors">
              <Phone size={14} /> +91 12345 67890
            </a>
          </div>
          <p className="text-sm">© {new Date().getFullYear()} {config.clientName}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
