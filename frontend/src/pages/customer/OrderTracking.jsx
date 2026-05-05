import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, Package, Truck, MapPin,
  CheckCircle, Clock, ExternalLink, RefreshCw,
} from 'lucide-react'
import orderService from '../../services/order.service'
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
    queryFn: () => orderService.getById(id),
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
