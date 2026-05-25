import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import AdminLayout from '../../components/admin/AdminLayout'
import Skeleton from '../../components/ui/Skeleton'

export default function Reviews() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState('pending')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reviews', filter],
    queryFn: () => api.get('/admin/reviews', { params:{ status:filter } }).then(r => r.data?.data?.reviews || []),
  })

  const actionMutation = useMutation({
    mutationFn: ({id,action}) => api.put(`/admin/reviews/${id}/${action}`),
    onSuccess: () => { qc.invalidateQueries({queryKey:['admin-reviews']}); toast.success('Done!') },
    onError: () => toast.error('Failed'),
  })

  const reviews = data || []

  return (
    <AdminLayout title="Reviews">
      <div className="flex gap-2 mb-6">
        {['pending','approved','rejected'].map(s=>(
          <button key={s} onClick={()=>setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${filter===s?'bg-indigo-600 text-white':'bg-white border border-gray-200 text-gray-600 hover:border-indigo-400'}`}>
            {s}
          </button>
        ))}
      </div>

      {isLoading && <div className="space-y-3">{[...Array(4)].map((_,i)=><Skeleton key={i} className="h-28 rounded-2xl"/>)}</div>}
      {!isLoading && reviews.length===0 && <div className="text-center py-16 bg-white rounded-2xl border border-gray-100"><p className="text-gray-400">No {filter} reviews</p></div>}

      <div className="space-y-3">
        {reviews.map(r=>(
          <div key={r._id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900 text-sm">{r.user?.name}</span>
                  <div className="flex">{[...Array(5)].map((_,i)=><Star key={i} size={12} className={i<r.rating?'text-amber-400 fill-amber-400':'text-gray-200 fill-gray-200'}/>)}</div>
                </div>
                <p className="text-xs text-gray-500 mb-2">on <span className="font-medium text-gray-700">{r.product?.name}</span></p>
                <p className="text-sm text-gray-700">{r.comment}</p>
              </div>
              {filter==='pending' && (
                <div className="flex gap-2 ml-4 flex-shrink-0">
                  <button onClick={()=>actionMutation.mutate({id:r._id,action:'approve'})} className="flex items-center gap-1.5 bg-green-50 text-green-600 px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-green-100">
                    <CheckCircle size={13}/> Approve
                  </button>
                  <button onClick={()=>actionMutation.mutate({id:r._id,action:'reject'})} className="flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-red-100">
                    <XCircle size={13}/> Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  )
}
