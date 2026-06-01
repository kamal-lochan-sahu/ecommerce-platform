import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { TrendingUp, ShoppingBag, Users, Package } from 'lucide-react'
import api from '../../services/api'
import AdminLayout from '../../components/admin/AdminLayout'
import StatsCard from '../../components/admin/StatsCard'
import Skeleton from '../../components/ui/Skeleton'

export default function Analytics() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => api.get('/admin/analytics/sales').then(r => r.data?.data || r.data),
  })

  const stats = data?.stats || {}
  const revenueData = data?.revenueByMonth || []
  const topProducts = data?.topProducts || []
  const ordersTrend = data?.ordersTrend || []

  return (
    <AdminLayout title="Analytics">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {isLoading ? [...Array(4)].map((_,i)=><Skeleton key={i} className="h-28 rounded-2xl"/>) : (
          <>
            <StatsCard title="Total Revenue" value={stats.totalRevenue||0} icon={TrendingUp} color="indigo" prefix="₹"/>
            <StatsCard title="Total Orders" value={stats.totalOrders||0} icon={ShoppingBag} color="amber"/>
            <StatsCard title="Total Customers" value={stats.totalCustomers||0} icon={Users} color="green"/>
            <StatsCard title="Avg Order Value" value={stats.avgOrderValue||0} icon={Package} color="purple" prefix="₹"/>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Revenue by Month</h3>
          {isLoading ? <Skeleton className="h-48"/> : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={revenueData}>
                <defs><linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="month" tick={{fontSize:11}} stroke="#9ca3af"/>
                <YAxis tick={{fontSize:11}} stroke="#9ca3af" tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`}/>
                <Tooltip formatter={(v)=>[`₹${v.toLocaleString('en-IN')}`, 'Revenue']} contentStyle={{borderRadius:'12px',border:'1px solid #e5e7eb'}}/>
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#rev)"/>
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Orders Trend</h3>
          {isLoading ? <Skeleton className="h-48"/> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ordersTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="month" tick={{fontSize:11}} stroke="#9ca3af"/>
                <YAxis tick={{fontSize:11}} stroke="#9ca3af"/>
                <Tooltip contentStyle={{borderRadius:'12px',border:'1px solid #e5e7eb'}}/>
                <Bar dataKey="orders" fill="#f59e0b" radius={[6,6,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Top Selling Products</h3>
        {isLoading ? <Skeleton className="h-40"/> : topProducts.length===0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No data yet</p>
        ) : (
          <div className="space-y-3">
            {topProducts.slice(0,8).map((p,i)=>(
              <div key={p._id} className="flex items-center gap-3">
                <span className="w-6 text-xs font-bold text-gray-400">#{i+1}</span>
                <img src={p.images?.[0]||'https://placehold.co/400x400?text=Product'} alt={p.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0"/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                    <div className="bg-indigo-600 h-1.5 rounded-full" style={{width:`${(p.soldCount/topProducts[0]?.soldCount*100)||0}%`}}/>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-gray-900">{p.soldCount} sold</p>
                  <p className="text-xs text-gray-400">₹{(p.revenue||0).toLocaleString('en-IN')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
