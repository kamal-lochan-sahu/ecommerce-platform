import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Download, XCircle, MapPin, Package,
  Truck, Clock, CheckCircle, AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import orderService from '../../services/order.service'
import OrderTimeline from '../../components/order/OrderTimeline'
import Skeleton from '../../components/ui/Skeleton'
import Modal from '../../components/ui/Modal'

// Poori Tailwind class strings (`bg-${color}-100` jaisi bani hui classes tabhi chalti hain jab wahi class
// kahin aur literal likhi ho - e.g. Returned ka bg-orange-50 build mein tha hi nahi)
const STATUS_CONFIG = {
  placed:     { badge: 'bg-yellow-100 text-yellow-700', Icon: Clock,         label: 'Pending' },
  confirmed:  { badge: 'bg-sky-100 text-sky-700',       Icon: CheckCircle,   label: 'Confirmed' },
  processing: { badge: 'bg-blue-100 text-blue-700',     Icon: Package,       label: 'Processing' },
  shipped:    { badge: 'bg-indigo-100 text-indigo-700', Icon: Truck,         label: 'Shipped' },
  delivered:  { badge: 'bg-green-100 text-green-700',   Icon: CheckCircle,   label: 'Delivered' },
  cancelled:  { badge: 'bg-red-100 text-red-700',       Icon: XCircle,       label: 'Cancelled' },
  returned:   { badge: 'bg-orange-100 text-orange-700', Icon: AlertCircle,   label: 'Returned' },
}

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['order', id],
    // Unwrap the axios response — without this, `order` was the raw
    // {data, status, headers, ...} axios object, so every field read off
    // it (order.createdAt, order.pricing, order.orderStatus, ...) was
    // undefined, showing up as "Invalid Date" / missing price / a
    // default status even though the backend data was correct.
    queryFn: () => orderService.getById(id).then(r => r.data?.data?.order ?? null),
  })

  const cancelMutation = useMutation({
    mutationFn: () => orderService.cancel(id),
    onSuccess: () => {
      toast.success('Order cancelled successfully')
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setShowCancelModal(false)
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to cancel order')
      setShowCancelModal(false)
    },
  })

  const handleDownloadInvoice = async () => {
    if (downloading) return
    setDownloading(true)
    try {
      // getInvoice axios response deta hai - PDF bytes res.data mein hain
      // (pehle poora response object createObjectURL ko diya jaata tha, isliye hamesha fail hota tha)
      const res = await orderService.getInvoice(id)
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${order.orderNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to download invoice')
    } finally {
      setDownloading(false)
    }
  }

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    )
  }

  /* ── Error ── */
  if (isError || !order) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="mx-auto text-red-400 mb-4" size={48} />
        <p className="text-gray-600 font-medium">Order not found</p>
        <button
          onClick={() => navigate('/orders')}
          className="mt-4 text-indigo-600 underline text-sm"
        >
          Back to Orders
        </button>
      </div>
    )
  }

  const cfg = STATUS_CONFIG[order.orderStatus] || STATUS_CONFIG.placed
  const { Icon: StatusIcon } = cfg
  // Backend (cancelOrder) sirf placed/confirmed cancel hone deta hai
  const canCancel = ['placed', 'confirmed'].includes(order.orderStatus)
  const canTrack  = ['shipped', 'delivered'].includes(order.orderStatus)
  const isPaid    = order.paymentStatus === 'paid'
  const isClosed  = ['cancelled', 'returned'].includes(order.orderStatus)
  // createOrder discount pricing.couponDiscount mein rakhta hai
  const couponSaving = order.pricing?.couponDiscount || order.pricing?.discount || 0
  const totalLabel = isPaid
    ? 'Total Paid'
    : order.paymentMethod === 'cod' && !isClosed ? 'Total to Pay on Delivery' : 'Total'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/orders')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Back to Orders</span>
          </button>

          <div className="flex gap-3">
            {canTrack && (
              <Link
                to={`/orders/${id}/tracking`}
                className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-100 transition-colors"
              >
                <Truck size={16} />
                Track Order
              </Link>
            )}
            <button
              onClick={handleDownloadInvoice}
              disabled={downloading}
              className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-60"
            >
              <Download size={16} />
              {downloading ? 'Preparing...' : 'Invoice'}
            </button>
          </div>
        </div>

        {/* Order Summary + Timeline */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4 shadow-sm">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Order ID</p>
              <h2 className="text-lg font-bold text-gray-900 font-mono mt-0.5">
                #{order.orderNumber}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Placed on{' '}
                {new Date(order.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </p>
            </div>

            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${cfg.badge}`}>
              <StatusIcon size={14} />
              {cfg.label}
            </div>
          </div>

          <OrderTimeline status={order.orderStatus} statusHistory={order.statusHistory} />
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Package size={18} className="text-indigo-500" />
            Order Items ({order.items?.length})
          </h3>
          <div className="divide-y divide-gray-50">
            {order.items?.map((item, idx) => (
              <div key={idx} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                <img
                  src={item.image || item.product?.images?.[0] || 'https://placehold.co/400x400?text=Product'}
                  alt={item.name || item.product?.name}
                  className="w-16 h-16 object-cover rounded-xl border border-gray-100 flex-shrink-0"
                  loading="lazy"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {item.name || item.product?.name}
                  </p>
                  {(item.variantLabel || item.variant?.name) && (
                    <p className="text-xs text-gray-400 mt-0.5">{item.variantLabel || item.variant?.name}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">Qty: {item.quantity}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-gray-900">
                    ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    ₹{item.price.toLocaleString('en-IN')} each
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Price Details</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>₹{order.pricing?.subtotal?.toLocaleString('en-IN')}</span>
            </div>
            {couponSaving > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</span>
                <span>- ₹{couponSaving.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Delivery Fee</span>
              <span>
                {order.pricing?.shippingCharge === 0
                  ? <span className="text-green-600 font-medium">FREE</span>
                  : `₹${order.pricing?.shippingCharge}`}
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Tax (GST)</span>
              <span>₹{order.pricing?.tax?.toLocaleString('en-IN')}</span>
            </div>
            <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-gray-900 text-base">
              <span>{totalLabel}</span>
              <span className="text-indigo-600">
                ₹{order.pricing?.total?.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-400 pt-1">
              <span>Payment via</span>
              <span className="capitalize">{order.paymentMethod}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>Payment Status</span>
              <span className={
                order.paymentStatus === 'paid'
                  ? 'text-green-500 font-medium'
                  : 'text-amber-500 font-medium'
              }>
                {order.paymentStatus?.toUpperCase()}
              </span>
            </div>
            {isClosed && isPaid && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mt-2">
                Your refund will be processed within 5–7 business days.
              </p>
            )}
          </div>
        </div>

        {/* Shipping Address */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin size={18} className="text-indigo-500" />
            Delivery Address
          </h3>
          {order.shippingAddress && (
            <div className="text-sm text-gray-600 leading-relaxed">
              <p className="font-semibold text-gray-800">{order.shippingAddress.fullName}</p>
              <p>{order.shippingAddress.phone}</p>
              <p className="mt-1">
                {order.shippingAddress.addressLine1}
                {order.shippingAddress.addressLine2 && `, ${order.shippingAddress.addressLine2}`}
              </p>
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state} — {order.shippingAddress.pincode}
              </p>
            </div>
          )}
        </div>

        {/* Cancel Action */}
        {canCancel && (
          <div className="bg-white rounded-2xl border border-red-100 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">Need to cancel?</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  You can cancel before the order is shipped
                </p>
              </div>
              <button
                onClick={() => setShowCancelModal(true)}
                className="bg-red-50 text-red-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors"
              >
                Cancel Order
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Order?"
      >
        <div className="p-4">
          <p className="text-gray-600 text-sm mb-6">
            Are you sure you want to cancel order{' '}
            <strong className="text-gray-900">#{order.orderNumber}</strong>?{' '}
            {isPaid
              ? 'Your refund will be processed within 5–7 business days.'
              : 'You have not been charged for this order.'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCancelModal(false)}
              className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Keep Order
            </button>
            <button
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-60"
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Yes, Cancel'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
