import { Package, ChevronRight, Clock, Truck, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

const STATUS_CONFIG = {
  placed:          { label: 'Pending',          bg: 'bg-yellow-100', text: 'text-yellow-700', Icon: Clock },
  processing:       { label: 'Processing',       bg: 'bg-blue-100',   text: 'text-blue-700',   Icon: Package },
  shipped:          { label: 'Shipped',          bg: 'bg-indigo-100', text: 'text-indigo-700', Icon: Truck },
  out_for_delivery: { label: 'Out for Delivery', bg: 'bg-purple-100', text: 'text-purple-700', Icon: Truck },
  delivered:        { label: 'Delivered',        bg: 'bg-green-100',  text: 'text-green-700',  Icon: CheckCircle },
  cancelled:        { label: 'Cancelled',        bg: 'bg-red-100',    text: 'text-red-700',    Icon: XCircle },
  returned:         { label: 'Returned',         bg: 'bg-orange-100', text: 'text-orange-700', Icon: AlertCircle },
}

export default function OrderCard({ order }) {
  const cfg = STATUS_CONFIG[order.orderStatus] || STATUS_CONFIG.placed
  const { Icon } = cfg

  const firstImage = order.items?.[0]?.product?.images?.[0] || 'https://placehold.co/400x400?text=Product'
  const itemCount  = order.items?.length || 0
  const extraCount = itemCount - 1

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Order</p>
          <p className="font-bold text-gray-900 font-mono text-sm mt-0.5">
            #{order.orderNumber}
          </p>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
          <Icon size={12} />
          {cfg.label}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex -space-x-2">
          <img
            src={firstImage}
            alt="product"
            className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-sm"
            loading="lazy"
          />
          {extraCount > 0 && (
            <div className="w-12 h-12 rounded-xl bg-gray-100 border-2 border-white flex items-center justify-center">
              <span className="text-xs font-semibold text-gray-500">+{extraCount}</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">
            {order.items?.[0]?.product?.name || 'Product'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {itemCount} item{itemCount > 1 ? 's' : ''}
          </p>
        </div>
        <ChevronRight size={18} className="text-gray-300 flex-shrink-0" />
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
        <div>
          <p className="text-xs text-gray-400">Total Amount</p>
          <p className="font-bold text-gray-900 mt-0.5">
            ₹{order.pricing?.total?.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Placed on</p>
          <p className="text-xs font-medium text-gray-600 mt-0.5">
            {new Date(order.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </p>
        </div>
      </div>
    </div>
  )
}
