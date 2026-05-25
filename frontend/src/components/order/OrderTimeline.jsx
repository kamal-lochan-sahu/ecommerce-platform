import { Clock, Package, Truck, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

const STEPS = [
  { key: 'placed',          label: 'Order Placed',      Icon: Clock },
  { key: 'processing',       label: 'Processing',        Icon: Package },
  { key: 'shipped',          label: 'Shipped',           Icon: Truck },
  { key: 'shipped', label: 'Out for Delivery',  Icon: Truck },
  { key: 'delivered',        label: 'Delivered',         Icon: CheckCircle },
]

const STATUS_ORDER = STEPS.map((s) => s.key)

function getStepIndex(status) {
  if (status === 'cancelled' || status === 'returned') return -1
  const i = STATUS_ORDER.indexOf(status)
  return i === -1 ? 0 : i
}

export default function OrderTimeline({ status, statusHistory = [] }) {
  const currentIdx = getStepIndex(status)
  const isCancelled = status === 'cancelled'
  const isReturned  = status === 'returned'

  if (isCancelled || isReturned) {
    const Icon = isCancelled ? XCircle : AlertCircle
    const color = isCancelled ? 'red' : 'orange'
    return (
      <div className={`flex items-center gap-3 p-4 bg-${color}-50 rounded-xl`}>
        <Icon className={`text-${color}-500`} size={22} />
        <div>
          <p className={`font-semibold text-${color}-700 text-sm`}>
            Order {isCancelled ? 'Cancelled' : 'Returned'}
          </p>
          {statusHistory?.find(h => h.status === status)?.timestamp && (
            <p className={`text-xs text-${color}-500 mt-0.5`}>
              {new Date(
                statusHistory.find(h => h.status === status).timestamp
              ).toLocaleString('en-IN', {
                day: 'numeric', month: 'short',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step, idx) => {
        const done    = idx <= currentIdx
        const current = idx === currentIdx
        const { Icon } = step

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                done
                  ? current
                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                    : 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-300'
              }`}>
                <Icon size={14} />
              </div>
              <p className={`text-xs text-center leading-tight max-w-[60px] ${
                done ? 'text-gray-700 font-medium' : 'text-gray-400'
              }`}>
                {step.label}
              </p>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mb-5 mx-1 rounded transition-all duration-500 ${
                idx < currentIdx ? 'bg-indigo-600' : 'bg-gray-100'
              }`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
