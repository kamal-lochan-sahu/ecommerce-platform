import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Truck, ShieldCheck, RefreshCw, Headphones } from "lucide-react";
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
import useStoreSettings from "../../hooks/useStoreSettings";
import { getTrustBadges } from "../../utils/storeBrand";

const BADGE_ICONS = { delivery: Truck, payment: ShieldCheck, returns: RefreshCw, support: Headphones };

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


// Ek product section: loading mein skeleton, data ho to grid, khali ya error ho to section chhup jaata hai
// (pehle fake "Premium Product" dikhte the).
function ProductSection({ title, subtitle, href, products, loading, limit, gridClass }) {
  if (!loading && !products?.length) return null;
  return (
    <section>
      <SectionHeader title={title} subtitle={subtitle} href={href} />
      <div className={gridClass}>
        {loading
          ? Array(limit).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)
          : products.slice(0, limit).map((p) => <ProductCard key={p._id} product={p} />)}
      </div>
    </section>
  );
}

export default function Home() {
  const { settings, brandName } = useStoreSettings();
  const badges = getTrustBadges(settings);

  const { data: featured, isLoading: featuredLoading } = useQuery({
    queryKey: ["featured-products"],
    queryFn:  () => productService.getFeatured().then(r => r.data?.data?.products ?? null),
    retry: false,
  });

  const { data: newArrivals, isLoading: newLoading } = useQuery({
    queryKey: ["new-arrivals"],
    queryFn:  () => productService.getAll({ sortBy: 'newest', limit: 4 }).then(r => r.data?.data?.products ?? null),
    retry: false,
  });

  const { data: categoriesRaw } = useQuery({
    queryKey: ["home-categories"],
    queryFn:  () => productService.getCategories().then(r => r.data?.data?.categories ?? null),
    retry: false,
  });

  const { data: topRated, isLoading: topRatedLoading } = useQuery({
    queryKey: ["top-rated"],
    queryFn:  () => productService.getAll({ sortBy: 'rating', limit: 4 }).then(r => r.data?.data?.products ?? null),
    retry: false,
  });

  // Admin-managed hero banners (/api/banners). Koi banner na ho to store ke naam wala simple welcome banner.
  const { data: bannersRaw } = useQuery({
    queryKey: ["home-banners"],
    queryFn:  () => productService.getBanners({ position: 'home_top', active: 'true' }).then(r => r.data?.data ?? null),
    retry: false,
  });

  const categories = (categoriesRaw || []).map((c) => ({
    name: c.name,
    slug: c.slug,
    ...(CATEGORY_STYLE[c.slug] || DEFAULT_CATEGORY_STYLE),
  }));
  const banners = bannersRaw && bannersRaw.length > 0 ? bannersRaw : [];
  const multi = banners.length > 1;

  const nothingToShow =
    !featuredLoading && !newLoading && !topRatedLoading &&
    !featured?.length && !newArrivals?.length && !topRated?.length;

  return (
    <div className="pb-16">

      {/* ── HERO BANNER ── */}
      <section className="relative">
        {banners.length === 0 ? (
          <div className="bg-primary min-h-[260px] sm:min-h-[340px] flex items-center relative overflow-hidden">
            <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full translate-x-1/3 -translate-y-1/3" />
            <div className="absolute right-20 bottom-0 w-40 h-40 bg-white/10 rounded-full translate-y-1/2" />
            <div className="max-w-7xl mx-auto px-8 sm:px-16 py-12 relative z-10 w-full text-white">
              <h1 className="text-3xl sm:text-5xl font-bold mb-3 leading-tight">{brandName}</h1>
              <p className="text-white/90 text-lg mb-6 max-w-lg">
                {settings.tagline || "Discover our latest products"}
              </p>
              <Link
                to="/products"
                className="inline-flex items-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-xl
                           font-semibold hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                Shop Now <ChevronRight size={18} />
              </Link>
            </div>
          </div>
        ) : (
          <Swiper
            modules={[Autoplay, Pagination, Navigation]}
            autoplay={multi ? { delay: 4000, disableOnInteraction: false } : false}
            pagination={multi ? { clickable: true } : false}
            navigation={multi}
            loop={multi}
            className="hero-swiper"
          >
            {banners.map((banner) => (
              <SwiperSlide key={banner._id || banner.id}>
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
              </SwiperSlide>
            ))}
          </Swiper>
        )}
      </section>

      {/* ── TRUST BADGES (Admin -> Settings se: delivery limit, return days, support) ── */}
      {badges.length > 0 && (
        <section className="bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className={clsx("grid grid-cols-1 sm:grid-cols-2", badges.length >= 4 ? "lg:grid-cols-4" : badges.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2")}>
              {badges.map(({ key, title, sub }, i) => {
                const Icon = BADGE_ICONS[key];
                return (
                  <div key={key} className={clsx(
                    "flex items-center gap-3 py-6 px-4 sm:px-6",
                    i !== 0 && "lg:border-l border-gray-100",
                    i % 2 !== 0 && "sm:border-l lg:border-l-0 border-gray-100",
                    i >= 2 && "border-t lg:border-t-0 border-gray-100",
                    i === 1 && "border-t sm:border-t-0 border-gray-100"
                  )}>
                    <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon size={20} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{title}</p>
                      <p className="text-xs text-gray-500 truncate">{sub}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 space-y-14">

        {/* ── CATEGORIES ── */}
        {categories.length > 0 && (
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
        )}

        <ProductSection
          title="Featured Products" subtitle="Curated picks just for you" href="/products?featured=true"
          products={featured} loading={featuredLoading} limit={8}
          gridClass="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
        />
        <ProductSection
          title="New Arrivals" subtitle="Just arrived — fresh stock!" href="/products?sort=newest"
          products={newArrivals} loading={newLoading} limit={4}
          gridClass="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
        />
        <ProductSection
          title="Top Rated" subtitle="Customer favorite picks ⭐" href="/products?sort=rating"
          products={topRated} loading={topRatedLoading} limit={4}
          gridClass="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
        />

        {nothingToShow && (
          <p className="text-center text-gray-500 py-16">
            We&apos;re getting the store ready. Please check back soon.
          </p>
        )}
      </div>
    </div>
  );
}
