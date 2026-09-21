import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Zap, Truck, ShieldCheck, RefreshCw, Headphones } from "lucide-react";
import { clsx } from "clsx";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

import productService from "../../services/product.service";
import ProductCard from "../../components/product/ProductCard";
import { ProductCardSkeleton } from "../../components/ui/Skeleton";
import SectionHeader from "../../components/common/SectionHeader";
import DealTimer from "../../components/common/DealTimer";

// ── Static fallback data ──
const MOCK_BANNERS = [
  {
    id: 1,
    title: "New Season Sale",
    subtitle: "Up to 70% off on top brands",
    cta: "Shop Now",
    href: "/products?sale=true",
    bg: "from-indigo-600 to-purple-600",
    emoji: "🛍️",
  },
  {
    id: 2,
    title: "Electronics Mega Sale",
    subtitle: "Latest gadgets at best prices",
    cta: "Explore",
    href: "/products?category=electronics",
    bg: "from-amber-500 to-orange-500",
    emoji: "📱",
  },
  {
    id: 3,
    title: "Free Delivery",
    subtitle: "On orders above ₹499",
    cta: "Order Now",
    href: "/products",
    bg: "from-emerald-500 to-teal-600",
    emoji: "🚚",
  },
];

const MOCK_CATEGORIES = [
  { name: "Electronics",  emoji: "📱", slug: "electronics",  color: "bg-blue-50   text-blue-600" },
  { name: "Fashion",      emoji: "👗", slug: "fashion",      color: "bg-pink-50   text-pink-600" },
  { name: "Home & Living",emoji: "🏠", slug: "home-living",  color: "bg-amber-50  text-amber-600" },
  { name: "Beauty",       emoji: "💄", slug: "beauty",       color: "bg-rose-50   text-rose-600" },
  { name: "Sports",       emoji: "⚽", slug: "sports",       color: "bg-green-50  text-green-600" },
  { name: "Books",        emoji: "📚", slug: "books",        color: "bg-purple-50 text-purple-600" },
  { name: "Toys",         emoji: "🧸", slug: "toys",         color: "bg-yellow-50 text-yellow-600" },
  { name: "Grocery",      emoji: "🛒", slug: "grocery",      color: "bg-teal-50   text-teal-600" },
];

const CATEGORY_STYLE = {
  "electronics-gadgets":  { emoji: "📱", color: "bg-blue-50   text-blue-600" },
  "fashion-apparel":      { emoji: "👗", color: "bg-pink-50   text-pink-600" },
  "home-kitchen":         { emoji: "🏠", color: "bg-amber-50  text-amber-600" },
  "beauty-personal-care": { emoji: "💄", color: "bg-rose-50   text-rose-600" },
  "sports-fitness":       { emoji: "⚽", color: "bg-green-50  text-green-600" },
  "books-stationery":     { emoji: "📚", color: "bg-purple-50 text-purple-600" },
  "toys-games":           { emoji: "🧸", color: "bg-yellow-50 text-yellow-600" },
  "watches-accessories":  { emoji: "⌚", color: "bg-teal-50   text-teal-600" },
};
const DEFAULT_CATEGORY_STYLE = { emoji: "🛍️", color: "bg-gray-50 text-gray-600" };

const MOCK_PRODUCTS = Array(8).fill(null).map((_, i) => ({
  _id:          `mock-${i}`,
  name:         `Premium Product ${i + 1}`,
  slug:         `premium-product-${i + 1}`,
  brand:        ["Nike", "Apple", "Samsung", "Puma"][i % 4],
  price:        Math.floor(Math.random() * 4000) + 500,
  comparePrice: Math.floor(Math.random() * 6000) + 2000,
  images:       [`https://placehold.co/400x400?text=Product`],
  ratings:      (3.5 + Math.random() * 1.5).toFixed(1),
  totalReviews: Math.floor(Math.random() * 500) + 10,
  stock:        i % 5 === 0 ? 0 : 10,
  discount:     [10, 20, 30, 40, 50][i % 5],
}));

const TRUST_BADGES = [
  { icon: Truck,        title: "Free Delivery",    sub: "Orders above ₹499"  },
  { icon: ShieldCheck,  title: "Secure Payment",   sub: "100% safe checkout" },
  { icon: RefreshCw,    title: "Easy Returns",     sub: "7-day return policy"},
  { icon: Headphones,   title: "24/7 Support",     sub: "Always here for you"},
];

const DEAL_END = new Date(Date.now() + 1000 * 60 * 60 * 8); // 8 hours from now

export default function Home() {
  // Fetch featured products
  const { data: featured, isLoading: featuredLoading } = useQuery({
    queryKey: ["featured-products"],
    queryFn:  () => productService.getFeatured().then(r => r.data?.data?.products ?? null),
    retry: false,
  });

  // Fetch new arrivals
  const { data: newArrivals, isLoading: newLoading } = useQuery({
    queryKey: ["new-arrivals"],
    queryFn:  () => productService.getAll({ sortBy: 'newest', limit: 4 }).then(r => r.data?.data?.products ?? null),
    retry: false,
  });

  // Fetch deals
  const { data: deals, isLoading: dealsLoading } = useQuery({
    queryKey: ["deals"],
    queryFn:  () => productService.getAll({ limit: 4 }).then(r => r.data?.data?.products ?? null),
    retry: false,
  });

  // Fetch real categories
  const { data: categoriesRaw } = useQuery({
    queryKey: ["home-categories"],
    queryFn:  () => productService.getCategories().then(r => r.data?.data?.categories ?? null),
    retry: false,
  });

  // Fetch real top-rated products
  const { data: topRated, isLoading: topRatedLoading } = useQuery({
    queryKey: ["top-rated"],
    queryFn:  () => productService.getAll({ sortBy: 'rating', limit: 4 }).then(r => r.data?.data?.products ?? null),
    retry: false,
  });

  // Fetch real hero banners (admin-managed via /api/banners). Falls back
  // to MOCK_BANNERS below only when none are configured yet, so the admin
  // Banner CRUD actually shows up on the storefront.
  const { data: bannersRaw } = useQuery({
    queryKey: ["home-banners"],
    queryFn:  () => productService.getBanners({ position: 'home_top', active: 'true' }).then(r => r.data?.data ?? null),
    retry: false,
  });

  const featuredProducts = featured  || MOCK_PRODUCTS;
  const newProducts      = newArrivals || MOCK_PRODUCTS.slice(0, 4);
  const dealProducts     = deals     || MOCK_PRODUCTS.slice(0, 4);
  const categories       = categoriesRaw
    ? categoriesRaw.map((c) => ({
        name: c.name,
        slug: c.slug,
        ...(CATEGORY_STYLE[c.slug] || DEFAULT_CATEGORY_STYLE),
      }))
    : MOCK_CATEGORIES;
  const topRatedProducts = topRated || MOCK_PRODUCTS.slice(0, 4);
  const banners = bannersRaw && bannersRaw.length > 0 ? bannersRaw : MOCK_BANNERS;

  return (
    <div className="pb-16">

      {/* ── HERO BANNER ── */}
      <section className="relative">
        <Swiper
          modules={[Autoplay, Pagination, Navigation]}
          autoplay={{ delay: 4000, disableOnInteraction: false }}
          pagination={{ clickable: true }}
          navigation
          loop
          className="hero-swiper"
        >
          {banners.map((banner) => (
            <SwiperSlide key={banner._id || banner.id}>
              {banner.image ? (
                // Real admin-managed banner (has an uploaded image)
                <div
                  className="min-h-[320px] sm:min-h-[420px] flex items-center relative
                             overflow-hidden bg-cover bg-center"
                  style={{ backgroundImage: `url(${banner.image})` }}
                >
                  <div className="absolute inset-0 bg-black/30" />
                  <div className="max-w-7xl mx-auto px-8 sm:px-16 py-12 relative z-10 flex items-center justify-between w-full">
                    <div className="text-white max-w-lg">
                      {banner.subtitle && (
                        <p className="text-white/80 text-sm font-medium uppercase tracking-widest mb-3">
                          {banner.subtitle}
                        </p>
                      )}
                      <h1 className="text-3xl sm:text-5xl font-bold mb-3 leading-tight">
                        {banner.title}
                      </h1>
                      {banner.link && (
                        <Link
                          to={banner.link}
                          className="inline-flex items-center gap-2 bg-white text-gray-900
                                     px-6 py-3 rounded-xl font-semibold hover:shadow-lg
                                     transition-all duration-200 hover:scale-105"
                        >
                          Shop Now <ChevronRight size={18} />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                // Fallback mock banner (no admin banners configured yet)
                <div className={`bg-gradient-to-r ${banner.bg} min-h-[320px] sm:min-h-[420px]
                                flex items-center relative overflow-hidden`}>
                  {/* Background decorative circles */}
                  <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full
                                  translate-x-1/3 -translate-y-1/3" />
                  <div className="absolute right-20 bottom-0 w-40 h-40 bg-white/10 rounded-full
                                  translate-y-1/2" />

                  <div className="max-w-7xl mx-auto px-8 sm:px-16 py-12 relative z-10 flex items-center justify-between w-full">
                    <div className="text-white max-w-lg">
                      <p className="text-white/80 text-sm font-medium uppercase tracking-widest mb-3">
                        Special Offer
                      </p>
                      <h1 className="text-3xl sm:text-5xl font-bold mb-3 leading-tight">
                        {banner.title}
                      </h1>
                      <p className="text-white/90 text-lg mb-6">{banner.subtitle}</p>
                      <Link
                        to={banner.href}
                        className="inline-flex items-center gap-2 bg-white text-gray-900
                                   px-6 py-3 rounded-xl font-semibold hover:shadow-lg
                                   transition-all duration-200 hover:scale-105"
                      >
                        {banner.cta} <ChevronRight size={18} />
                      </Link>
                    </div>
                    <div className="hidden sm:block text-[120px] opacity-30 select-none">
                      {banner.emoji}
                    </div>
                  </div>
                </div>
              )}
            </SwiperSlide>
          ))}
        </Swiper>
      </section>

      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST_BADGES.map(({ icon: Icon, title, sub }, i) => (
              <div key={title} className={clsx(
                "flex items-center gap-3 py-6 px-4 sm:px-6",
                i !== 0 && "lg:border-l border-gray-100",
                i % 2 !== 0 && "sm:border-l lg:border-l-0 border-gray-100",
                i >= 2 && "border-t lg:border-t-0 border-gray-100",
                i === 1 && "border-t sm:border-t-0 border-gray-100"
              )}>
                <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon size={20} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{title}</p>
                  <p className="text-xs text-gray-500">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 space-y-14">

        {/* ── CATEGORIES ── */}
        <section>
          <SectionHeader
            title="Shop by Category"
            subtitle="Choose your favorite category"
            href="/products"
          />
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                to={`/products?category=${cat.slug}`}
                className="group flex flex-col items-center gap-2 p-3 rounded-2xl
                           hover:bg-gray-50 transition-all duration-200"
              >
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${cat.color}
                                 flex items-center justify-center text-2xl
                                 group-hover:scale-110 transition-transform duration-200`}>
                  {cat.emoji}
                </div>
                <span className="text-xs font-medium text-gray-700 text-center leading-tight">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── FEATURED PRODUCTS ── */}
        <section>
          <SectionHeader
            title="Featured Products"
            subtitle="Curated picks just for you"
            href="/products?featured=true"
          />
          {featuredLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array(8).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {featuredProducts.slice(0, 8).map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          )}
        </section>

        {/* ── PROMO BANNER ── */}
        <section className="grid sm:grid-cols-2 gap-4">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white flex items-center justify-between overflow-hidden relative">
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full translate-x-1/2 -translate-y-1/2" />
            <div className="relative z-10">
              <p className="text-white/80 text-xs uppercase tracking-widest mb-1">Limited Time</p>
              <h3 className="text-xl font-bold mb-1">Upto 50% Off</h3>
              <p className="text-white/90 text-sm mb-3">Electronics & Gadgets</p>
              <Link to="/products?category=electronics"
                className="text-xs bg-white text-indigo-600 font-semibold px-4 py-1.5 rounded-lg hover:shadow-md transition-all">
                Shop Now
              </Link>
            </div>
            <span className="text-6xl opacity-30">📱</span>
          </div>
          <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl p-6 text-white flex items-center justify-between overflow-hidden relative">
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full translate-x-1/2 -translate-y-1/2" />
            <div className="relative z-10">
              <p className="text-white/80 text-xs uppercase tracking-widest mb-1">New Collection</p>
              <h3 className="text-xl font-bold mb-1">Trending Fashion</h3>
              <p className="text-white/90 text-sm mb-3">Latest styles at best price</p>
              <Link to="/products?category=fashion"
                className="text-xs bg-white text-orange-600 font-semibold px-4 py-1.5 rounded-lg hover:shadow-md transition-all">
                Explore
              </Link>
            </div>
            <span className="text-6xl opacity-30">👗</span>
          </div>
        </section>

        {/* ── DEAL OF THE DAY ── */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <Zap size={20} className="text-red-500 fill-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Deal of the Day</h2>
                <p className="text-xs text-gray-500">Today's best offers — hurry up!</p>
              </div>
            </div>
            <DealTimer endsAt={DEAL_END} />
          </div>
          {dealsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array(4).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {dealProducts.slice(0, 4).map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          )}
        </section>

        {/* ── NEW ARRIVALS ── */}
        <section>
          <SectionHeader
            title="New Arrivals"
            subtitle="Just arrived — fresh stock!"
            href="/products?sort=newest"
          />
          {newLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array(4).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {newProducts.slice(0, 4).map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          )}
        </section>

        {/* ── TOP RATED ── */}
        <section>
          <SectionHeader
            title="Top Rated"
            subtitle="Customer favorite picks ⭐"
            href="/products?sort=rating"
          />
          {topRatedLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array(4).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {topRatedProducts.slice(0, 4).map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          )}
        </section>

      </div>

      {/* ── NEWSLETTER ── */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-700 mt-14 py-12">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Get Exclusive Deals! 🎁
          </h2>
          <p className="text-indigo-100 mb-6 text-sm">
            Subscribe for the best offers directly in your inbox
          </p>
          <div className="flex gap-2 max-w-md mx-auto">
            <input
              type="email"
              placeholder="your@email.com"
              className="flex-1 px-4 py-3 rounded-xl text-sm outline-none
                         focus:ring-2 focus:ring-white/50"
            />
            <button className="bg-white text-indigo-700 font-semibold px-5 py-3
                               rounded-xl hover:shadow-lg transition-all hover:scale-105 text-sm">
              Subscribe
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}
