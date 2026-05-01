import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export default function SectionHeader({ title, subtitle, href, className = "" }) {
  return (
    <div className={`flex items-end justify-between mb-6 ${className}`}>
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {href && (
        <Link
          to={href}
          className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          See all <ChevronRight size={15} />
        </Link>
      )}
    </div>
  );
}
