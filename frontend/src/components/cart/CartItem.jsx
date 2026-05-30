import { Trash2, Minus, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import useCartStore from "../../store/cartStore";
import toast from "react-hot-toast";

export default function CartItem({ item }) {
  const { updateQty, removeItem } = useCartStore();
  const handleRemove = () => { removeItem(item._id, item.variant); toast.success("Item removed"); };
  return (
    <div className="flex gap-3 py-4 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <Link to={`/products/${item.slug}`} className="flex-shrink-0">
        <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
          <img src={item.image || "https://placehold.co/80x80?text=P"} alt={item.name} className="w-full h-full object-cover" />
        </div>
      </Link>
      <div className="flex-1 min-w-0">
        <Link to={`/products/${item.slug}`}>
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 hover:text-primary transition-colors">{item.name}</h4>
        </Link>
        {item.variant && <p className="text-xs text-gray-400 mt-0.5">{item.variant}</p>}
        <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">₹{(item.price * item.quantity).toLocaleString("en-IN")}</p>
        <p className="text-xs text-gray-400">₹{item.price?.toLocaleString("en-IN")} × {item.quantity}</p>
      </div>
      <div className="flex flex-col items-end justify-between">
        <button onClick={handleRemove} className="p-2 text-gray-400 hover:text-danger transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30">
          <Trash2 size={18} />
        </button>
        <div className="flex items-center border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
          <button onClick={() => updateQty(item._id, item.variant, item.quantity - 1)} className="w-9 h-9 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">
            <Minus size={14} />
          </button>
          <span className="w-8 text-center text-sm font-semibold dark:text-gray-200">{item.quantity}</span>
          <button onClick={() => updateQty(item._id, item.variant, item.quantity + 1)} className="w-9 h-9 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">
            <Plus size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
