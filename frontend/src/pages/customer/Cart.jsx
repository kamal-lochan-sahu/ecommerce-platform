import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, ArrowLeft } from "lucide-react";
import CartItem from "../../components/cart/CartItem";
import CartSummary from "../../components/cart/CartSummary";
import EmptyState from "../../components/ui/EmptyState";
import Breadcrumb from "../../components/common/Breadcrumb";
import useCartStore from "../../store/cartStore";

export default function Cart() {
  const navigate = useNavigate();
  const { items, totalAmount, totalItems } = useCartStore();
  return (
    <div className="page-container">
      <Breadcrumb items={[{ label: "Cart" }]} />
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Shopping Cart {totalItems > 0 && <span className="text-base font-normal text-gray-500 ml-2">({totalItems} items)</span>}
      </h1>
      {items.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="Your cart is empty!" description="Add some products to your cart"
          actionLabel="Start Shopping" onAction={() => navigate("/products")} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 card p-5">
            {items.map(item => <CartItem key={`${item._id}-${item.variant}`} item={item} />)}
            <Link to="/products" className="flex items-center gap-2 text-sm text-primary font-medium mt-4 hover:underline">
              <ArrowLeft size={16} /> Continue Shopping
            </Link>
          </div>
          <div><CartSummary subtotal={totalAmount} onCheckout={() => navigate("/checkout")} /></div>
        </div>
      )}
    </div>
  );
}
