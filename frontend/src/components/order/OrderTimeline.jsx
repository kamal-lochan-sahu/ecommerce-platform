import { Clock, Package, Truck, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

// Backend flow (utils/orderRules.js): placed -> confirmed -> processing -> shipped -> delivered
const STEPS = [
  { key: 'placed',     label: 'Order Placed', Icon: Clock },
  { key: 'confirmed',  label: 'Confirmed',    Icon: CheckCircle },
  { key: 'processing', label: 'Processing',   Icon: Package },
  { key: 'shipped',    label: 'Shipped',      Icon: Truck },
  { key: 'delivered',  label: 'Delivered',    Icon: CheckCircle },
]

const STATUS_ORDER = STEPS.map((s) => s.key)

// Tailwind poori class string dhundta hai (bani hui `bg-${color}-50` build mein miss ho sakti hai - Returned ka bg-orange-50 miss thi)
const FINAL = {
  cancelled: { Icon: XCircle,     title: 'Order Cancelled', box: 'bg-red-50',    icon: 'text-red-500',    head: 'text-red-700',    sub: 'text-red-500' },
  returned:  { Icon: AlertCircle, title: 'Order Returned',  box: 'bg-orange-50', icon: 'text-orange-500', head: 'text-orange-700', sub: 'text-orange-500' },
}

function getStepIndex(status) {
  const i = STATUS_ORDER.indexOf(status)
  return i === -1 ? 0 : i
}

export default function OrderTimeline({ status, statusHistory = [] }) {
  const currentIdx = getStepIndex(status)
  const final = FINAL[status]

  if (final) {
    const { Icon } = final
    const when = statusHistory?.find(h => h.status === status)?.timestamp
    return (
      <div className={`flex items-center gap-3 p-4 ${final.box} rounded-xl`}>
        <Icon className={final.icon} size={22} />
        <div>
          <p className={`font-semibold ${final.head} text-sm`}>{final.title}</p>
          {when && (
            <p className={`text-xs ${final.sub} mt-0.5`}>
              {new Date(when).toLocaleString('en-IN', {
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
