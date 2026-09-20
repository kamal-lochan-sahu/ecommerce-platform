import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShoppingCart, Heart, User, Search, Menu, X,
  Sun, Moon, Package, LogOut, Settings, ChevronDown
} from "lucide-react";
import useAuthStore from "../../store/authStore";
import useCartStore from "../../store/cartStore";
import useWishlistStore from "../../store/wishlistStore";
import useUiStore from "../../store/uiStore";
import SearchBar from "./SearchBar";
import { config } from "../../config";
import authService from "../../services/auth.service";

export default function Navbar() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { totalItems, toggleCart } = useCartStore();
  const { items: wishlistItems } = useWishlistStore();
  const { theme, toggleTheme, searchOpen, toggleSearch, closeSearch } = useUiStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await authService.logout(); // clears httpOnly refreshToken cookie + DB token
    } catch {
      // Server-side logout failing shouldn't block local logout — ignore
    }
    logout();
    setUserMenuOpen(false);
    navigate("/");
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary">
              <Package size={24} />
              <span>{config.clientName}</span>
            </Link>

            {/* Desktop Search */}
            <div className="hidden md:flex flex-1 max-w-xl mx-8">
              <SearchBar />
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-1">

              {/* Mobile Search Toggle */}
              <button
                className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
                onClick={toggleSearch}
              >
                <Search size={20} />
              </button>

              {/* Theme Toggle */}
              <button
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                onClick={toggleTheme}
                title="Toggle theme"
              >
                {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              {/* Wishlist */}
              <Link
                to="/wishlist"
                className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <Heart size={20} />
                {wishlistItems.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-danger text-white
                                   text-[10px] font-bold rounded-full flex items-center justify-center">
                    {wishlistItems.length}
                  </span>
                )}
              </Link>

              {/* Cart */}
              <button
                className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
                onClick={toggleCart}
              >
                <ShoppingCart size={20} />
                {totalItems > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-white
                                   text-[10px] font-bold rounded-full flex items-center justify-center">
                    {totalItems > 99 ? "99+" : totalItems}
                  </span>
                )}
              </button>

              {/* Auth */}
              {isAuthenticated ? (
                <div className="relative ml-1">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary text-xs font-bold">
                        {user?.name?.[0]?.toUpperCase() || "U"}
                      </span>
                    </div>
                    <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[80px] truncate">
                      {user?.name?.split(" ")[0]}
                    </span>
                    <ChevronDown size={14} className="text-gray-400" />
                  </button>

                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                      <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-lg
                                      border border-gray-100 py-2 z-20">
                        <div className="px-4 py-2 border-b border-gray-50">
                          <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                        </div>
                        {[
                          { label: "My Profile",  icon: User,     href: "/profile" },
                          { label: "My Orders",   icon: Package,  href: "/orders" },
                          { label: "Wishlist",    icon: Heart,    href: "/wishlist" },
                          ...(user?.role === "admin"
                            ? [{ label: "Admin Panel", icon: Settings, href: "/admin" }]
                            : []),
                        ].map(({ label, icon: Icon, href }) => (
                          <Link
                            key={href}
                            to={href}
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700
                                       hover:bg-gray-50 transition-colors"
                          >
                            <Icon size={16} className="text-gray-400" />
                            {label}
                          </Link>
                        ))}
                        <div className="border-t border-gray-100 mt-1 pt-1">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm
                                       text-danger hover:bg-red-50 transition-colors"
                          >
                            <LogOut size={16} />
                            Logout
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-2 ml-2">
                  <Link to="/login"    className="btn-ghost text-sm px-3 py-2">Login</Link>
                  <Link to="/register" className="btn-primary text-sm px-4 py-2">Sign Up</Link>
                </div>
              )}

              {/* Mobile Menu Toggle */}
              <button
                className="sm:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors ml-1"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* Mobile Search */}
          {searchOpen && (
            <div className="md:hidden pb-3">
              <SearchBar onClose={closeSearch} autoFocus />
            </div>
          )}
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="sm:hidden border-t border-gray-100 bg-white px-4 pb-4 space-y-2">
            {!isAuthenticated ? (
              <>
                <Link to="/login"    className="block btn-ghost w-full text-center mt-3"
                  onClick={() => setMobileOpen(false)}>Login</Link>
                <Link to="/register" className="block btn-primary w-full text-center"
                  onClick={() => setMobileOpen(false)}>Sign Up</Link>
              </>
            ) : (
              <>
                {["/profile", "/orders", "/wishlist"].map((href) => (
                  <Link key={href} to={href}
                    className="block px-3 py-2 rounded-xl text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setMobileOpen(false)}>
                    {href.replace("/", "").replace("-", " ").replace(/\b\w/g, c => c.toUpperCase())}
                  </Link>
                ))}
                <button onClick={handleLogout}
                  className="w-full text-left px-3 py-2 rounded-xl text-sm text-danger hover:bg-red-50">
                  Logout
                </button>
              </>
            )}
          </div>
        )}
      </header>
    </>
  );
}
