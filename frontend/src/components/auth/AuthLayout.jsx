import { Link } from "react-router-dom";
import { Package } from "lucide-react";
import { config } from "../../config";

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-amber-50
                    flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-primary font-bold text-2xl">
            <Package size={28} />
            <span>{config.clientName}</span>
          </Link>
          {title && <h1 className="text-2xl font-bold text-gray-900 mt-4">{title}</h1>}
          {subtitle && <p className="text-gray-500 mt-1 text-sm">{subtitle}</p>}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          {children}
        </div>

        {/* Back to home */}
        <p className="text-center text-sm text-gray-500 mt-6">
          <Link to="/" className="hover:text-primary transition-colors">← Back to Home</Link>
        </p>
      </div>
    </div>
  );
}
