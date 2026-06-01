import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Heart, ShoppingCart, Zap, Share2, Shield,
  Truck, RefreshCw, Star, ChevronDown, ChevronUp,
  Check, Package
} from "lucide-react";
import { clsx } from "clsx";
import toast from "react-hot-toast";

import productService from "../../services/product.service";
import ProductImages from "../../components/product/ProductImages";
import { ColorVariant, SizeVariant } from "../../components/product/ProductVariants";
import ProductReviews from "../../components/product/ProductReviews";
import ProductCard from "../../components/product/ProductCard";
import { ProductCardSkeleton } from "../../components/ui/Skeleton";
import Breadcrumb from "../../components/common/Breadcrumb";
import Badge from "../../components/ui/Badge";
import Rating from "../../components/ui/Rating";
import useCartStore from "../../store/cartStore";
import useWishlistStore from "../../store/wishlistStore";
import useAuthStore from "../../store/authStore";

// Mock product for UI dev
const MOCK_PRODUCT = {
  _id: "mock-1", slug: "premium-wireless-headphones",
  name: "Premium Wireless Headphones Pro Max",
  brand: "Sony", category: "Electronics",
  price: 4999, comparePrice: 9999,
  discount: 50,
  images: [
    "https://placehold.co/400x400?text=Product",
    "https://placehold.co/400x400?text=Product",
    "https://placehold.co/400x400?text=Product",
    "https://placehold.co/400x400?text=Product",
  ],
  ratings: 4.5, totalReviews: 1284, stock: 15,
  description: `Premium wireless headphones with industry-leading noise cancellation. 
30-hour battery life, Hi-Res Audio, and multipoint connection technology. 
Touch sensor controls, speak-to-chat, wearing detection and many more features.
Foldable design for easy portability.`,
  specifications: [
    { key: "Driver Size",       value: "40mm" },
    { key: "Frequency Response", value: "4Hz–40,000Hz" },
    { key: "Battery Life",      value: "30 hours (NC on)" },
    { key: "Charging Time",     value: "3 hours" },
    { key: "Connectivity",      value: "Bluetooth 5.2" },
    { key: "Weight",            value: "250g" },
    { key: "Warranty",          value: "1 Year" },
    { key: "In the Box",        value: "Headphones, USB-C Cable, Carry Case" },
  ],
  colors: [
    { name: "Midnight Black", hex: "#111827" },
    { name: "Pearl White",    hex: "#f9fafb" },
    { name: "Navy Blue",      hex: "#1e3a8a" },
    { name: "Rose Gold",      hex: "#e8a598" },
  ],
  sizes: [],
  highlights: [
    "Industry-leading noise cancellation",
    "30-hour battery life",
    "Hi-Res Audio certified",
    "Multipoint connection (2 devices)",
    "Touch sensor controls",
  ],
};

const MOCK_RELATED = Array(4).fill(null).map((_, i) => ({
  _id: `r-${i}`, name: `Related Product ${i+1}`, slug: `related-${i+1}`,
  brand: ["Sony","Bose","JBL","Apple"][i],
  price: Math.floor(Math.random()*5000)+2000,
  comparePrice: Math.floor(Math.random()*8000)+5000,
  images: [`https://placehold.co/400x400?text=Product`],
  ratings: (3.5+Math.random()*1.5).toFixed(1),
  totalReviews: Math.floor(Math.random()*500)+50,
  stock: 10, discount: [10,20,30,15][i],
}));

export default function ProductDetail() {
  const { slug }    = useParams();
  const navigate    = useNavigate();
  const { addItem, openCart } = useCartStore();
  const { toggleItem, isInWishlist } = useWishlistStore();
  const { isAuthenticated } = useAuthStore();

  const [selectedColor, setSelectedColor] = useState(MOCK_PRODUCT.colors[0]?.name || "");
  const [selectedSize,  setSelectedSize]  = useState("");
  const [qty,           setQty]           = useState(1);
  const [specsOpen,     setSpecsOpen]     = useState(false);
  const [activeTab,     setActiveTab]     = useState("description");

  const { data, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn:  async () => {
      const res = await productService.getBySlug(slug);
      return res.data?.data?.product || res.data?.product || null;
    },
    retry: false,
  });

  const product    = data || MOCK_PRODUCT;
  const inWishlist = isInWishlist(product._id);

  // Handle empty images
  const productImages = product.images?.length > 0
    ? product.images
    : [`https://placehold.co/400x400?text=Product`];
  const isOOS      = product.stock === 0;

  // Handle real backend ratings object
  const ratingValue = typeof product.ratings === "object"
    ? product.ratings?.average || 0 : product.ratings || 0;
  const ratingCount = typeof product.ratings === "object"
    ? product.ratings?.count || 0 : product.totalReviews || 0;

  const discountPct = product.discount || (product.comparePrice > product.price
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100) : 0);

  const savings = product.comparePrice - product.price;

  const handleAddToCart = () => {
    if (isOOS) return;
    addItem({ ...product, quantity: qty, variant: selectedColor || selectedSize });
    openCart();
    toast.success("Added to cart! 🛒");
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate("/checkout");
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

  if (isLoading) return (
    <div className="page-container">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="aspect-square bg-gray-100 rounded-2xl animate-pulse" />
        <div className="space-y-4">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className={clsx("h-4 bg-gray-100 rounded animate-pulse",
              [40,80,60,100,50,70][i] + "%" )} />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="page-container">
      <Breadcrumb items={[
        { label: "Products",          href: "/products" },
        { label: product.category?.name || product.category, href: `/products?category=${product.category?.slug || product.category}` },
        { label: product.name },
      ]} />

      {/* ── Main Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-16">

        {/* Left — Images */}
        <ProductImages images={productImages} name={product.name} />

        {/* Right — Product Info */}
        <div className="space-y-5">
          {/* Brand + Title */}
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

          {/* Rating */}
          <div className="flex items-center gap-3">
            <Rating value={Math.round(ratingValue)} count={ratingCount} size={16} />
            <span className="text-sm text-gray-600 font-medium">{ratingValue} / 5</span>
            <span className="text-gray-200">|</span>
            <span className="text-sm text-gray-500">{product.stock} in stock</span>
          </div>

          {/* Price */}
          <div className="flex items-end gap-3 py-3 border-y border-gray-100">
            <span className="text-3xl font-bold text-gray-900">
              ₹{product.price?.toLocaleString("en-IN")}
            </span>
            {product.comparePrice > product.price && (
              <>
                <span className="text-lg text-gray-400 line-through mb-0.5">
                  ₹{product.comparePrice?.toLocaleString("en-IN")}
                </span>
                <span className="text-sm font-semibold text-green-600 mb-0.5">
                  Save ₹{savings?.toLocaleString("en-IN")}
                </span>
              </>
            )}
          </div>

          {/* Highlights */}
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

          {/* Color Variants */}
          {product.colors?.length > 0 && (
            <ColorVariant
              colors={product.colors}
              selected={selectedColor}
              onChange={setSelectedColor}
            />
          )}

          {/* Size Variants */}
          {product.sizes?.length > 0 && (
            <SizeVariant
              sizes={product.sizes}
              selected={selectedSize}
              onChange={setSelectedSize}
            />
          )}

          {/* Quantity */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Quantity:</span>
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setQty(q => Math.max(1, q - 1))}
                className="w-10 h-10 flex items-center justify-center text-gray-600
                           hover:bg-gray-50 transition-colors text-lg font-medium"
              >
                −
              </button>
              <span className="w-12 text-center text-sm font-semibold">{qty}</span>
              <button
                onClick={() => setQty(q => Math.min(product.stock || 10, q + 1))}
                className="w-10 h-10 flex items-center justify-center text-gray-600
                           hover:bg-gray-50 transition-colors text-lg font-medium"
              >
                +
              </button>
            </div>
            {product.stock <= 5 && product.stock > 0 && (
              <span className="text-xs text-orange-500 font-medium">
                ⚠️ Only {product.stock} left!
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleAddToCart}
              disabled={isOOS}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl",
                "font-semibold text-sm border-2 transition-all",
                isOOS
                  ? "border-gray-200 text-gray-400 cursor-not-allowed"
                  : "border-primary text-primary hover:bg-primary-50 active:scale-95"
              )}
            >
              <ShoppingCart size={18} />
              Add to Cart
            </button>
            <button
              onClick={handleBuyNow}
              disabled={isOOS}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl",
                "font-semibold text-sm transition-all",
                isOOS
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-primary text-white hover:bg-primary-600 active:scale-95 shadow-md"
              )}
            >
              <Zap size={18} />
              Buy Now
            </button>
          </div>

          {/* Secondary Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleWishlist}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all",
                inWishlist
                  ? "border-red-200 text-red-500 bg-red-50"
                  : "border-gray-200 text-gray-600 hover:border-red-200 hover:text-red-500"
              )}
            >
              <Heart size={16} fill={inWishlist ? "currentColor" : "none"} />
              {inWishlist ? "Wishlisted" : "Wishlist"}
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200
                         text-sm font-medium text-gray-600 hover:border-gray-300 transition-all"
            >
              <Share2 size={16} /> Share
            </button>
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { icon: Truck,     label: "Free Delivery", sub: "Above ₹499"   },
              { icon: RefreshCw, label: "7-Day Return",  sub: "Easy returns" },
              { icon: Shield,    label: "Genuine",       sub: "100% original"},
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex flex-col items-center text-center p-3
                                          bg-gray-50 rounded-xl">
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
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                "px-5 py-3 text-sm font-medium capitalize transition-all border-b-2 -mb-px",
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              {tab === "reviews"
                ? `Reviews (${product.totalReviews})`
                : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Description Tab */}
        {activeTab === "description" && (
          <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed whitespace-pre-line">
            {product.description}
          </div>
        )}

        {/* Specifications Tab */}
        {activeTab === "specifications" && (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {product.specifications?.map((spec, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                    <td className="px-5 py-3 font-medium text-gray-700 w-1/3">{spec.key}</td>
                    <td className="px-5 py-3 text-gray-600">{spec.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === "reviews" && (
          <ProductReviews
            productId={product._id}
            ratings={product.ratings}
            totalReviews={product.totalReviews}
          />
        )}
      </div>

      {/* ── Related Products ── */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-6">Related Products</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {MOCK_RELATED.map(p => <ProductCard key={p._id} product={p} />)}
        </div>
      </div>
    </div>
  );
}
