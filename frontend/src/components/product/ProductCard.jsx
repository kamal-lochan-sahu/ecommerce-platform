import { Link } from "react-router-dom";
import { ShoppingCart, Heart } from "lucide-react";
import { clsx } from "clsx";
import toast from "react-hot-toast";
import Rating from "../ui/Rating";
import Badge from "../ui/Badge";
import useCartStore from "../../store/cartStore";
import useWishlistStore from "../../store/wishlistStore";
import useAuthStore from "../../store/authStore";

export default function ProductCard({ product }) {
  const { addItem, openCart } = useCartStore();
  const { toggleItem, isInWishlist } = useWishlistStore();
  const { isAuthenticated } = useAuthStore();

  if (!product) return null;

  const {
    _id, name, slug, brand,
    price, comparePrice,
    images, ratings, totalReviews,
    stock, discount,
  } = product;

  const inWishlist = isInWishlist(_id);
  const isOutOfStock = stock === 0;
  const discountPct = discount || (comparePrice > price
    ? Math.round(((comparePrice - price) / comparePrice) * 100)
    : 0);

  const handleAddToCart = (e) => {
    e.preventDefault();
    if (!isAuthenticated) { toast.error("Pehle login karo!"); return; }
    if (isOutOfStock) return;
    addItem({ _id, name, slug, price, image: images?.[0], stock });
    openCart();
    toast.success("Cart mein add ho gaya! 🛒");
  };

  const handleWishlist = (e) => {
    e.preventDefault();
    if (!isAuthenticated) { toast.error("Pehle login karo!"); return; }
    toggleItem(product);
    toast.success(inWishlist ? "Wishlist se remove hua" : "Wishlist mein add hua ❤️");
  };

  return (
    <Link to={`/products/${slug}`} className="group block">
      <div className="card-hover overflow-hidden">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-gray-50">
          <img
            src={images?.[0] || "https://placehold.co/300x300?text=No+Image"}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-500
                       group-hover:scale-105"
            loading="lazy"
          />

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {discountPct > 0 && (
              <Badge variant="danger">{discountPct}% OFF</Badge>
            )}
            {isOutOfStock && (
              <Badge variant="gray">Out of Stock</Badge>
            )}
          </div>

          {/* Wishlist button */}
          <button
            onClick={handleWishlist}
            className={clsx(
              "absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center",
              "bg-white shadow-md transition-all duration-200",
              "opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0",
              inWishlist ? "text-red-500" : "text-gray-400 hover:text-red-400"
            )}
          >
            <Heart size={15} fill={inWishlist ? "currentColor" : "none"} />
          </button>

          {/* Add to cart overlay */}
          {!isOutOfStock && (
            <button
              onClick={handleAddToCart}
              className="absolute bottom-0 left-0 right-0 bg-primary text-white
                         py-2.5 text-sm font-medium flex items-center justify-center gap-2
                         translate-y-full group-hover:translate-y-0 transition-transform duration-300"
            >
              <ShoppingCart size={15} />
              Add to Cart
            </button>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          {brand && (
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{brand}</p>
          )}
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1.5 group-hover:text-primary transition-colors">
            {name}
          </h3>

          <Rating value={ratings || 0} count={totalReviews || 0} size={12} />

          <div className="flex items-center gap-2 mt-2">
            <span className="text-base font-bold text-gray-900">
              ₹{price?.toLocaleString("en-IN")}
            </span>
            {comparePrice > price && (
              <span className="text-xs text-gray-400 line-through">
                ₹{comparePrice?.toLocaleString("en-IN")}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
