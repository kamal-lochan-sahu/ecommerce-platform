import { useQuery } from '@tanstack/react-query'
import { ShoppingBag, Users, Package, TrendingUp, AlertTriangle, Clock } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import api from '../../services/api'
import AdminLayout from '../../components/admin/AdminLayout'
import StatsCard from '../../components/admin/StatsCard'
import Skeleton from '../../components/ui/Skeleton'

const STATUS_COLORS = { pending:'#f59e0b', processing:'#6366f1', shipped:'#3b82f6', delivered:'#10b981', cancelled:'#ef4444' }

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get('/admin/dashboard').then(r => r.data?.data || r.data),
  })

  const stats = data?.stats || {}
  const revenueChart = Array.isArray(data?.revenueChart) ? data.revenueChart : []
  const ordersByStatus = Array.isArray(data?.ordersByStatus) ? data.ordersByStatus : []
  const recentOrders = Array.isArray(data?.recentOrders) ? data.recentOrders : []
  const lowStock = Array.isArray(data?.lowStockProducts) ? data.lowStockProducts : []

  return (
    <AdminLayout title="Dashboard">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {isLoading ? [...Array(4)].map((_,i)=><Skeleton key={i} className="h-28 rounded-2xl"/>) : (
          <>
            <StatsCard title="Total Revenue" value={stats.totalRevenue||0} icon={TrendingUp} color="indigo" prefix="₹" change={stats.revenueChange}/>
            <StatsCard title="Total Orders" value={stats.totalOrders||0} icon={ShoppingBag} color="amber" change={stats.ordersChange}/>
            <StatsCard title="Customers" value={stats.totalCustomers||0} icon={Users} color="green" change={stats.customersChange}/>
            <StatsCard title="Products" value={stats.totalProducts||0} icon={Package} color="purple"/>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        {/* Revenue Chart */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Revenue Overview</h3>
          {isLoading ? <Skeleton className="h-56"/> : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={revenueChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="month" tick={{fontSize:11}} stroke="#9ca3af"/>
                <YAxis tick={{fontSize:11}} stroke="#9ca3af" tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`}/>
                <Tooltip formatter={(v)=>[`₹${v.toLocaleString('en-IN')}`, 'Revenue']} contentStyle={{borderRadius:'12px',border:'1px solid #e5e7eb'}}/>
                <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} dot={{fill:'#6366f1',r:3}} activeDot={{r:5}}/>
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Orders by Status */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Orders by Status</h3>
          {isLoading ? <Skeleton className="h-56"/> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={ordersByStatus} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="count" nameKey="status">
                  {ordersByStatus.map((e,i)=><Cell key={i} fill={STATUS_COLORS[e.status]||'#94a3b8'}/>)}
                </Pie>
                <Tooltip contentStyle={{borderRadius:'12px',border:'1px solid #e5e7eb'}}/>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:'11px'}}/>
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Recent Orders */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={17} className="text-indigo-500"/>
            <h3 className="font-semibold text-gray-900">Recent Orders</h3>
          </div>
          {isLoading ? <Skeleton className="h-40"/> : recentOrders.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No orders yet</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.slice(0,5).map(o=>(
                <div key={o._id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800 font-mono">#{o.orderNumber}</p>
                    <p className="text-xs text-gray-400">{o.user?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">₹{o.totalAmount?.toLocaleString('en-IN')}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      o.status==='delivered'?'bg-green-100 text-green-700':
                      o.status==='cancelled'?'bg-red-100 text-red-700':
                      'bg-indigo-100 text-indigo-700'
                    }`}>{o.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={17} className="text-amber-500"/>
            <h3 className="font-semibold text-gray-900">Low Stock Alert</h3>
          </div>
          {isLoading ? <Skeleton className="h-40"/> : lowStock.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">All products well stocked</p>
          ) : (
            <div className="space-y-3">
              {lowStock.slice(0,5).map(p=>(
                <div key={p._id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <img src={p.images?.[0]||'/placeholder.jpg'} alt={p.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                      <div className="bg-amber-500 h-1.5 rounded-full" style={{width:`${Math.min((p.stock/10)*100,100)}%`}}/>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ${p.stock<=5?'bg-red-100 text-red-600':'bg-amber-100 text-amber-700'}`}>{p.stock} left</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
