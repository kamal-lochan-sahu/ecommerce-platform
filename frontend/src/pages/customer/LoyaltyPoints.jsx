import { useQuery } from '@tanstack/react-query'
import { Star, Gift, TrendingUp, Clock, Plus, Minus } from 'lucide-react'
import loyaltyService from '../../services/loyalty.service'
import Skeleton from '../../components/ui/Skeleton'

const HOW_TO = [
  { icon: '🛒', title: 'Place an Order', desc: 'Earn 1 point per ₹10 spent' },
  { icon: '⭐', title: 'Write a Review', desc: 'Earn 10 points per review' },
  { icon: '👤', title: 'Refer a Friend', desc: 'Earn 100 points per referral' },
  { icon: '🎂', title: 'Birthday Bonus', desc: '50 bonus points on your birthday' },
]

export default function LoyaltyPoints() {
  const { data, isLoading } = useQuery({
    queryKey: ['loyalty'],
    queryFn: () => loyaltyService.get().then(r => r.data?.data?.user || {}),
  })
  const { data: histData, isLoading: histLoading } = useQuery({
    queryKey: ['loyalty-history'],
    queryFn: () => loyaltyService.history().then(r => r.data?.data?.notifications || []),
  })

  const points = data?.loyaltyPoints || 0 || 0
  const lifetime = data?.loyaltyPoints || 0 || 0
  const transactions = histData || []

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <Star className="text-amber-500" size={20} fill="currentColor"/>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Loyalty Points</h1>
            <p className="text-sm text-gray-500">Earn and redeem reward points</p>
          </div>
        </div>

        {/* Points Cards */}
        {isLoading ? <Skeleton className="h-36 rounded-2xl"/> : (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-5 text-white">
              <div className="flex items-center gap-2 mb-3">
                <Gift size={18} className="text-indigo-200"/>
                <p className="text-indigo-200 text-sm">Available Points</p>
              </div>
              <p className="text-4xl font-black">{points.toLocaleString('en-IN')}</p>
              <p className="text-indigo-200 text-xs mt-1">≈ ₹{(points/10).toFixed(0)} value</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-5 text-white">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={18} className="text-amber-200"/>
                <p className="text-amber-200 text-sm">Lifetime Earned</p>
              </div>
              <p className="text-4xl font-black">{lifetime.toLocaleString('en-IN')}</p>
              <p className="text-amber-200 text-xs mt-1">Total points earned</p>
            </div>
          </div>
        )}

        {/* How to Earn */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">How to Earn Points</h3>
          <div className="grid grid-cols-2 gap-3">
            {HOW_TO.map((item)=>(
              <div key={item.title} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="text-sm font-medium text-gray-800">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock size={17} className="text-indigo-500"/> Transaction History
          </h3>
          {histLoading && <div className="space-y-2">{[...Array(4)].map((_,i)=><Skeleton key={i} className="h-12 rounded-xl"/>)}</div>}
          {!histLoading && transactions.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">No transactions yet</p>
          )}
          <div className="space-y-2">
            {transactions.map((t,i)=>(
              <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.type==='credit'?'bg-green-100':'bg-red-100'}`}>
                    {t.type==='credit'?<Plus size={14} className="text-green-600"/>:<Minus size={14} className="text-red-500"/>}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{t.description}</p>
                    <p className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</p>
                  </div>
                </div>
                <span className={`font-bold text-sm ${t.type==='credit'?'text-green-600':'text-red-500'}`}>
                  {t.type==='credit'?'+':'-'}{Math.abs(t.points)}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
