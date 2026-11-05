import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Heart, ShoppingCart, Zap, Share2, Shield,
  Truck, RefreshCw, Check, AlertCircle
} from "lucide-react";
import { clsx } from "clsx";
import toast from "react-hot-toast";

import productService from "../../services/product.service";
import ProductImages from "../../components/product/ProductImages";
import VariantSelector from "../../components/product/ProductVariants";
import ProductReviews from "../../components/product/ProductReviews";
import ProductCard from "../../components/product/ProductCard";
import Breadcrumb from "../../components/common/Breadcrumb";
import Badge from "../../components/ui/Badge";
import Rating from "../../components/ui/Rating";
import useCartStore from "../../store/cartStore";
import useWishlistStore from "../../store/wishlistStore";
import useAuthStore from "../../store/authStore";

export default function ProductDetail() {
  const { slug }    = useParams();
  const navigate    = useNavigate();
  const { addItem, openCart } = useCartStore();
  const { toggleItem, isInWishlist } = useWishlistStore();
  const { isAuthenticated } = useAuthStore();

  const [variantId,    setVariantId]    = useState(null);
  const [qty,           setQty]           = useState(1);
  const [activeTab,     setActiveTab]     = useState("description");
  const [addingToCart,  setAddingToCart]  = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["product", slug],
    queryFn:  async () => {
      const res = await productService.getBySlug(slug);
      const payload = res.data?.data || res.data || {};
      return { product: payload.product || null, variants: payload.variants || [] };
    },
    retry: 1,
    staleTime: 1000 * 60 * 5,
  });
  const product  = data?.product || null;
  const variants = data?.variants || [];

  // Fetch real related products from same category
  const { data: relatedData } = useQuery({
    queryKey: ["related", product?.category?._id || product?.category],
    queryFn: () => productService.getAll({
      category: product?.category?._id || product?.category,
      limit: 4,
    }).then(r => r.data?.data?.products || []),
    enabled: !!product,
    staleTime: 1000 * 60 * 5,
  });

  const relatedProducts = (relatedData || []).filter(p => p._id !== product?._id).slice(0, 4);

  // Variant product: jab tak customer na chune, pehla in-stock variant selected dikhta hai —
  // render time par nikalte hain (effect nahi), kyunki ye product + customer ki choice ka pure function hai.
  const hasVariants = !!product?.hasVariants && variants.length > 0;
  const selectedVariant = hasVariants
    ? variants.find((v) => v._id === variantId) || variants.find((v) => v.stock > 0) || variants[0]
    : null;

  // ── Loading state ──
  if (isLoading) return (
    <div className="page-container">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="aspect-square bg-gray-100 rounded-2xl animate-pulse" />
        <div className="space-y-4">
          {[40, 80, 60, 100, 50, 70].map((w, i) => (
            <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    </div>
  );

  // ── Error / Not found state ──
  if (isError || !product) return (
    <div className="page-container">
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center">
        <AlertCircle size={48} className="text-gray-300 mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Product not found</h1>
        <p className="text-gray-500 text-sm mb-6">
          {error?.response?.data?.message || "This product may have been removed or the link is incorrect."}
        </p>
        <Link to="/products" className="btn-primary px-6 py-3">
          Browse Products
        </Link>
      </div>
    </div>
  );

  const inWishlist = isInWishlist(product._id);
  // Price/MRP/stock selected variant ke hote hain; variant product ke variants na mile to OOS maano
  const activePrice   = selectedVariant ? selectedVariant.price : product.price;
  const activeCompare = selectedVariant ? selectedVariant.comparePrice : product.comparePrice;
  const activeStock   = selectedVariant ? selectedVariant.stock : (product.hasVariants ? 0 : product.stock);
  const isOOS = activeStock <= 0;
  const safeQty = Math.min(qty, Math.max(activeStock, 1));
  const baseImages = selectedVariant?.images?.length > 0 ? selectedVariant.images : product.images;
  const productImages = baseImages?.length > 0
    ? baseImages
    : [`https://placehold.co/400x400?text=${encodeURIComponent(product.name)}`];

  // Handle backend ratings object vs number
  const ratingValue = typeof product.ratings === "object"
    ? product.ratings?.average || 0 : product.ratings || 0;
  const ratingCount = typeof product.ratings === "object"
    ? product.ratings?.count || 0 : product.totalReviews || 0;

  const discountPct = activeCompare > activePrice
    ? Math.round(((activeCompare - activePrice) / activeCompare) * 100) : 0;
  const savings = activeCompare > activePrice
    ? activeCompare - activePrice : 0;

  // true = cart mein gaya (cartStore failure par khud toast dikhata hai)
  const handleAddToCart = async () => {
    if (isOOS || addingToCart) return false;
    if (product.hasVariants && !selectedVariant) { toast.error("Please select an option"); return false; }
    setAddingToCart(true);
    try {
      const ok = await addItem({
        ...product,
        price: activePrice,
        comparePrice: activeCompare,
        stock: activeStock,
        quantity: safeQty,
        variant: selectedVariant?._id || null,
        variantLabel: selectedVariant?.name || null,
      });
      if (!ok) return false;
      openCart();
      toast.success("Added to cart! 🛒");
      return true;
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    const ok = await handleAddToCart();
    if (ok) navigate("/checkout");
  };

  const handleWishlist = () => {
    if (!isAuthenticated) { toast.error("Please login first!"); return; }
    toggleItem(product);
    toast.success(inWishlist ? "Removed from wishlist" : "Added to wishlist ❤️");
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied! 🔗");
  };

  return (
    <div className="page-container">
      <Breadcrumb items={[
        { label: "Products", href: "/products" },
        { label: product.category?.name || "Category",
          href: `/products?category=${product.category?._id || product.category}` },
        { label: product.name },
      ]} />

      {/* ── Main Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-16">

        {/* Left — Images */}
        <ProductImages key={selectedVariant?._id || "base"} images={productImages} name={product.name} />

        {/* Right — Product Info */}
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-primary font-semibold uppercase tracking-wider">
                {product.brand}
              </span>
              {discountPct > 0 && <Badge variant="danger">{discountPct}% OFF</Badge>}
              {isOOS && <Badge variant="gray">Out of Stock</Badge>}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">{product.name}</h1>
          </div>

          <div className="flex items-center gap-3">
            <Rating value={Math.round(ratingValue)} count={ratingCount} size={16} />
            <span className="text-sm text-gray-600 font-medium">{ratingValue} / 5</span>
            <span className="text-gray-200">|</span>
            <span className="text-sm text-gray-500">{activeStock} in stock</span>
          </div>

          <div className="flex items-end gap-3 py-3 border-y border-gray-100">
            <span className="text-3xl font-bold text-gray-900">
              ₹{activePrice?.toLocaleString("en-IN")}
            </span>
            {activeCompare > activePrice && (
              <>
                <span className="text-lg text-gray-400 line-through mb-0.5">
                  ₹{activeCompare?.toLocaleString("en-IN")}
                </span>
                <span className="text-sm font-semibold text-green-600 mb-0.5">
                  Save ₹{savings?.toLocaleString("en-IN")}
                </span>
              </>
            )}
          </div>

          {product.highlights?.length > 0 && (
            <ul className="space-y-1.5">
              {product.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <Check size={15} className="text-green-500 mt-0.5 flex-shrink-0" />
                  {h}
                </li>
              ))}
            </ul>
          )}

          {hasVariants && (
            <VariantSelector
              variants={variants}
              selected={selectedVariant}
              onSelect={(v) => { setVariantId(v._id); setQty(1); }}
            />
          )}

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Quantity:</span>
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
              <button onClick={() => setQty(() => Math.max(1, safeQty - 1))}
                className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors text-lg font-medium">
                −
              </button>
              <span className="w-12 text-center text-sm font-semibold">{safeQty}</span>
              <button onClick={() => setQty(() => Math.min(activeStock || 10, safeQty + 1))}
                className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors text-lg font-medium">
                +
              </button>
            </div>
            {activeStock <= 5 && activeStock > 0 && (
              <span className="text-xs text-orange-500 font-medium">⚠️ Only {activeStock} left!</span>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={handleAddToCart} disabled={isOOS || addingToCart}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm border-2 transition-all",
                isOOS || addingToCart
                  ? "border-gray-200 text-gray-400 cursor-not-allowed"
                  : "border-primary text-primary hover:bg-primary-50 active:scale-95"
              )}>
              {addingToCart
                ? <><div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />Adding...</>
                : <><ShoppingCart size={18} />Add to Cart</>
              }
            </button>
            <button onClick={handleBuyNow} disabled={isOOS || addingToCart}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all",
                isOOS || addingToCart
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-primary text-white hover:bg-primary-600 active:scale-95 shadow-md"
              )}>
              <Zap size={18} />Buy Now
            </button>
          </div>

          <div className="flex gap-2">
            <button onClick={handleWishlist}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all",
                inWishlist ? "border-red-200 text-red-500 bg-red-50" : "border-gray-200 text-gray-600 hover:border-red-200 hover:text-red-500"
              )}>
              <Heart size={16} fill={inWishlist ? "currentColor" : "none"} />
              {inWishlist ? "Wishlisted" : "Wishlist"}
            </button>
            <button onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-gray-300 transition-all">
              <Share2 size={16} /> Share
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { icon: Truck,     label: "Free Delivery", sub: "Above ₹499" },
              { icon: RefreshCw, label: "7-Day Return",  sub: "Easy returns" },
              { icon: Shield,    label: "Genuine",       sub: "100% original" },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-xl">
                <Icon size={18} className="text-primary mb-1" />
                <span className="text-xs font-semibold text-gray-800">{label}</span>
                <span className="text-xs text-gray-500">{sub}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="mb-12">
        <div className="flex border-b border-gray-200 mb-6 gap-1">
          {["description", "specifications", "reviews"].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={clsx(
                "px-5 py-3 text-sm font-medium capitalize transition-all border-b-2 -mb-px",
                activeTab === tab ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700"
              )}>
              {tab === "reviews" ? `Reviews (${ratingCount})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === "description" && (
          <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed whitespace-pre-line">
            {product.description}
          </div>
        )}
        {activeTab === "specifications" && (
          <div className="card overflow-hidden">
            {product.specifications?.length > 0 ? (
              <table className="w-full text-sm">
                <tbody>
                  {product.specifications.map((spec, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                      <td className="px-5 py-3 font-medium text-gray-700 w-1/3">{spec.key}</td>
                      <td className="px-5 py-3 text-gray-600">{spec.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="p-6 text-gray-400 text-sm text-center">No specifications available.</p>
            )}
          </div>
        )}
        {activeTab === "reviews" && (
          <ProductReviews productId={product._id} ratings={ratingValue} totalReviews={ratingCount} />
        )}
      </div>

      {/* ── Related Products ── */}
      {relatedProducts.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Related Products</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {relatedProducts.map(p => <ProductCard key={p._id} product={p} />)}
          </div>
        </div>
      )}
    </div>
  );
}
