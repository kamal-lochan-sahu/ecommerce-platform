import { Truck } from 'lucide-react'

export default function OrderTrackingInfo({ tracking }) {
  if (!tracking) return null
  return (
    <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-xl">
      <Truck className="text-indigo-500 flex-shrink-0" size={20} />
      <div className="text-sm">
        {tracking.courierName && (
          <p className="font-semibold text-gray-800">{tracking.courierName}</p>
        )}
        {tracking.trackingNumber && (
          <p className="text-gray-500 font-mono text-xs mt-0.5">
            {tracking.trackingNumber}
          </p>
        )}
      </div>
    </div>
  )
}
