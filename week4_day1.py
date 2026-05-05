#!/usr/bin/env python3
"""
Week 4 - Day 1: Order Pages
OrderHistory + OrderDetail + OrderTracking
"""
import os

def write(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        f.write(content.lstrip('\n'))
    print(f"  {os.path.basename(path)}")

BASE = os.path.expanduser(
    "~/projects/ecommerce-platform/frontend/src/pages/customer"
)

print("\n[Day 1] Order Pages bana raha hoon...\n")

# ──────────────────────────────────────────────────────────────
# FILE 1 — OrderHistory.jsx
# ──────────────────────────────────────────────────────────────
write(f"{BASE}/OrderHistory.jsx", """
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Package, ShoppingBag } from 'lucide-react'
import { orderService } from '../../services/order.service'
import OrderCard from '../../components/order/OrderCard'
import Pagination from '../../components/ui/Pagination'
import Skeleton from '../../components/ui/Skeleton'

const TABS = [
  { label: 'All Orders', value: '' },
  { label: 'Pending',    value: 'pending' },
  { label: 'Processing', value: 'processing' },
  { label: 'Shipped',    value: 'shipped' },
  { label: 'Delivered',  value: 'delivered' },
  { label: 'Cancelled',  value: 'cancelled' },
  { label: 'Returned',   value: 'returned' },
]

export default function OrderHistory() {
  const [activeStatus, setActiveStatus] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['orders', activeStatus, page],
    queryFn: () =>
      orderService.getOrders({ status: activeStatus, page, limit: 8 }),
  })

  const handleTabChange = (val) => {
    setActiveStatus(val)
    setPage(1)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <ShoppingBag className="text-indigo-600" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
            <p className="text-sm text-gray-500">View and track all your orders</p>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                activeStatus === tab.value
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-400 hover:text-indigo-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="text-center py-16 bg-white rounded-2xl border border-red-100">
            <p className="text-red-500 font-medium">Something went wrong</p>
            <button
              onClick={() => refetch()}
              className="mt-3 text-sm text-indigo-600 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Orders List */}
        {!isLoading && !isError && (
          <>
            {!data?.orders?.length ? (
              /* Empty State */
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                <Package className="mx-auto text-gray-200 mb-4" size={72} />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  No orders found
                </h3>
                <p className="text-gray-400 text-sm mb-6">
                  {activeStatus
                    ? `No ${activeStatus} orders yet`
                    : "You haven't placed any orders yet"}
                </p>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  <ShoppingBag size={16} />
                  Start Shopping
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {data.orders.map((order) => (
                  <Link
                    key={order._id}
                    to={`/orders/${order._id}`}
                    className="block hover:scale-[1.01] transition-transform duration-200"
                  >
                    <OrderCard order={order} />
                  </Link>
                ))}
                {data.totalPages > 1 && (
                  <div className="pt-4">
                    <Pagination
                      currentPage={page}
                      totalPages={data.totalPages}
                      onPageChange={setPage}
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
""")

# ──────────────────────────────────────────────────────────────
# FILE 2 — OrderDetail.jsx
# ──────────────────────────────────────────────────────────────
write(f"{BASE}/OrderDetail.jsx", """
import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Download, XCircle, MapPin, Package,
  Truck, Clock, CheckCircle, AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { orderService } from '../../services/order.service'
import OrderTimeline from '../../components/order/OrderTimeline'
import Skeleton from '../../components/ui/Skeleton'
import Modal from '../../components/ui/Modal'

const STATUS_CONFIG = {
  pending:    { color: 'yellow', Icon: Clock,         label: 'Pending' },
  processing: { color: 'blue',   Icon: Package,       label: 'Processing' },
  shipped:    { color: 'indigo', Icon: Truck,         label: 'Shipped' },
  delivered:  { color: 'green',  Icon: CheckCircle,   label: 'Delivered' },
  cancelled:  { color: 'red',    Icon: XCircle,       label: 'Cancelled' },
  returned:   { color: 'orange', Icon: AlertCircle,   label: 'Returned' },
}

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showCancelModal, setShowCancelModal] = useState(false)

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['order', id],
    queryFn: () => orderService.getOrderById(id),
  })

  const cancelMutation = useMutation({
    mutationFn: () => orderService.cancelOrder(id),
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
    try {
      const blob = await orderService.downloadInvoice(id)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${order.orderNumber}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to download invoice')
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

  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const { Icon: StatusIcon } = cfg
  const canCancel = ['pending', 'processing'].includes(order.status)
  const canTrack  = ['shipped', 'out_for_delivery'].includes(order.status)

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
              className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              <Download size={16} />
              Invoice
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

            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-${cfg.color}-100 text-${cfg.color}-700`}>
              <StatusIcon size={14} />
              {cfg.label}
            </div>
          </div>

          <OrderTimeline status={order.status} statusHistory={order.statusHistory} />
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
                  src={item.product?.images?.[0] || '/placeholder.jpg'}
                  alt={item.product?.name}
                  className="w-16 h-16 object-cover rounded-xl border border-gray-100 flex-shrink-0"
                  loading="lazy"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {item.product?.name}
                  </p>
                  {item.variant && (
                    <p className="text-xs text-gray-400 mt-0.5">{item.variant}</p>
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
              <span>₹{order.subtotal?.toLocaleString('en-IN')}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>- ₹{order.discount?.toLocaleString('en-IN')}</span>
              </div>
            )}
            {order.couponDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Coupon ({order.couponCode})</span>
                <span>- ₹{order.couponDiscount?.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Delivery Fee</span>
              <span>
                {order.deliveryFee === 0
                  ? <span className="text-green-600 font-medium">FREE</span>
                  : `₹${order.deliveryFee}`}
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Tax (GST)</span>
              <span>₹{order.tax?.toLocaleString('en-IN')}</span>
            </div>
            <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-gray-900 text-base">
              <span>Total Paid</span>
              <span className="text-indigo-600">
                ₹{order.totalAmount?.toLocaleString('en-IN')}
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
              <p className="font-semibold text-gray-800">{order.shippingAddress.name}</p>
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
            <strong className="text-gray-900">#{order.orderNumber}</strong>?
            Refund will be processed within 5–7 business days.
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
""")

# ──────────────────────────────────────────────────────────────
# FILE 3 — OrderTracking.jsx
# ──────────────────────────────────────────────────────────────
write(f"{BASE}/OrderTracking.jsx", """
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, Package, Truck, MapPin,
  CheckCircle, Clock, ExternalLink, RefreshCw,
} from 'lucide-react'
import { orderService } from '../../services/order.service'
import Skeleton from '../../components/ui/Skeleton'

const STEPS = [
  { key: 'placed',            label: 'Order Placed',      Icon: Package },
  { key: 'confirmed',         label: 'Confirmed',         Icon: CheckCircle },
  { key: 'processing',        label: 'Processing',        Icon: Clock },
  { key: 'shipped',           label: 'Shipped',           Icon: Truck },
  { key: 'out_for_delivery',  label: 'Out for Delivery',  Icon: Truck },
  { key: 'delivered',         label: 'Delivered',         Icon: CheckCircle },
]
const STATUS_ORDER = STEPS.map((s) => s.key)

function getStepIndex(status) {
  const i = STATUS_ORDER.indexOf(status)
  return i === -1 ? 0 : i
}

export default function OrderTracking() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: order, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['order-tracking', id],
    queryFn: () => orderService.getOrderById(id),
    refetchInterval: 30_000,
  })

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
    )
  }

  /* ── Error ── */
  if (isError || !order) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Could not load tracking info</p>
        <button
          onClick={() => navigate(`/orders/${id}`)}
          className="mt-3 text-indigo-600 underline text-sm"
        >
          Back to Order
        </button>
      </div>
    )
  }

  const currentStep = getStepIndex(order.status)
  const tracking = order.trackingInfo
  const progressPct = (currentStep / (STEPS.length - 1)) * 100

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate(`/orders/${id}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Order Details</span>
          </button>
          <button
            onClick={() => refetch()}
            className={`flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors ${
              isFetching ? 'animate-spin text-indigo-400' : ''
            }`}
          >
            <RefreshCw size={14} />
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Banner */}
        <div className="bg-indigo-600 text-white rounded-2xl p-5 mb-5">
          <p className="text-indigo-200 text-xs mb-1">Tracking Order</p>
          <h2 className="text-xl font-bold font-mono">#{order.orderNumber}</h2>
          {order.expectedDelivery && (
            <div className="mt-3 bg-indigo-500 rounded-xl p-3">
              <p className="text-indigo-200 text-xs">Expected Delivery</p>
              <p className="font-semibold mt-0.5">
                {new Date(order.expectedDelivery).toLocaleDateString('en-IN', {
                  weekday: 'long', day: 'numeric', month: 'long',
                })}
              </p>
            </div>
          )}
        </div>

        {/* Progress Tracker */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-8">Delivery Progress</h3>

          <div className="relative">
            {/* Track line — background */}
            <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-100" />
            {/* Track line — filled */}
            <div
              className="absolute left-5 top-5 w-0.5 bg-indigo-500 transition-all duration-700"
              style={{ height: `${progressPct}%` }}
            />

            <div className="space-y-7 relative">
              {STEPS.map((step, idx) => {
                const done    = idx <= currentStep
                const current = idx === currentStep
                const { Icon } = step
                const event = order.statusHistory?.find((h) => h.status === step.key)

                return (
                  <div key={step.key} className="flex items-start gap-4">
                    {/* Circle */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-all duration-300 ${
                        done
                          ? current
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 ring-4 ring-indigo-100'
                            : 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      <Icon size={18} />
                    </div>

                    {/* Label */}
                    <div className="flex-1 pt-2">
                      <div className="flex items-center gap-2">
                        <p className={`font-medium text-sm ${done ? 'text-gray-900' : 'text-gray-400'}`}>
                          {step.label}
                        </p>
                        {current && (
                          <span className="bg-indigo-100 text-indigo-600 text-xs px-2 py-0.5 rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                      {event?.timestamp && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(event.timestamp).toLocaleString('en-IN', {
                            day: 'numeric', month: 'short',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Courier Info */}
        {tracking && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Truck size={18} className="text-indigo-500" />
              Courier Details
            </h3>
            <div className="space-y-3 text-sm">
              {tracking.courierName && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Courier</span>
                  <span className="font-medium text-gray-800">{tracking.courierName}</span>
                </div>
              )}
              {tracking.trackingNumber && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Tracking No.</span>
                  <span className="font-mono font-medium text-gray-800">
                    {tracking.trackingNumber}
                  </span>
                </div>
              )}
              {tracking.trackingUrl && (
                
                  href={tracking.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full mt-3 bg-indigo-50 text-indigo-600 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-100 transition-colors"
                >
                  <ExternalLink size={15} />
                  Track on Courier Website
                </a>
              )}
            </div>
          </div>
        )}

        {/* Delivery Address */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <MapPin size={18} className="text-indigo-500" />
            Delivering to
          </h3>
          {order.shippingAddress && (
            <div className="text-sm text-gray-600 leading-relaxed">
              <p className="font-semibold text-gray-800">{order.shippingAddress.name}</p>
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

      </div>
    </div>
  )
}
""")

print("\nDone! 3 files bane:")
print("  frontend/src/pages/customer/OrderHistory.jsx")
print("  frontend/src/pages/customer/OrderDetail.jsx")
print("  frontend/src/pages/customer/OrderTracking.jsx")
print("\nAb 'python3 week4_day1.py' already run ho gaya.")
print("Dev server check karo: http://localhost:5173/orders\n")
