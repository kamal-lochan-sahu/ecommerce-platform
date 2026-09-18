import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Package, ShoppingBag } from 'lucide-react'
import orderService from '../../services/order.service'
import OrderCard from '../../components/order/OrderCard'
import Pagination from '../../components/ui/Pagination'
import Skeleton from '../../components/ui/Skeleton'

const TABS = [
  { label: 'All Orders', value: '' },
  { label: 'Pending',    value: 'placed' },
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
      orderService.getAll({ status: activeStatus, page, limit: 8 }),
    staleTime: 1000 * 30, // 30s — order status (shipped/delivered) can change
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
