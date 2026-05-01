import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

export default function Breadcrumb({ items = [] }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-6">
      <Link to="/" className="hover:text-primary transition-colors">
        <Home size={15} />
      </Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight size={14} />
          {i === items.length - 1 || !item.href ? (
            <span className="text-gray-900 font-medium">{item.label}</span>
          ) : (
            <Link to={item.href} className="hover:text-primary transition-colors">
              {item.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
