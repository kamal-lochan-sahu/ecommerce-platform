import { useNavigate } from "react-router-dom";
import { ShoppingCart, ArrowRight } from "lucide-react";
import Drawer from "../ui/Drawer";
import CartItem from "./CartItem";
import CartSummary from "./CartSummary";
import EmptyState from "../ui/EmptyState";
import useCartStore from "../../store/cartStore";

export default function CartDrawer() {
  const navigate = useNavigate();
  const { items, totalAmount, totalItems, isOpen, closeCart } = useCartStore();

  const handleCheckout = () => {
    closeCart();
    navigate("/checkout");
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={closeCart}
      title={`Cart (${totalItems})`}
      position="right"
      width="w-full max-w-md"
    >
      {items.length === 0 ? (
        <div className="h-full flex items-center justify-center">
          <EmptyState
            icon={ShoppingCart}
            title="Cart khali hai!"
            description="Kuch products add karo"
            actionLabel="Products Dekho"
            onAction={() => { closeCart(); navigate("/products"); }}
          />
        </div>
      ) : (
        <div className="flex flex-col h-full">
          {/* Items */}
          <div className="flex-1 overflow-y-auto px-5">
            {items.map(item => (
              <CartItem key={`${item._id}-${item.variant}`} item={item} />
            ))}
          </div>

          {/* Summary */}
          <div className="border-t border-gray-100 p-5 bg-gray-50">
            <CartSummary
              subtotal={totalAmount}
              onCheckout={handleCheckout}
              compact
            />
          </div>
        </div>
      )}
    </Drawer>
  );
}
