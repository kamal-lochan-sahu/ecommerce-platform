import { useState } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { CheckCircle, XCircle, Star, BadgeCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import AdminLayout from '../../components/admin/AdminLayout'
import Skeleton from '../../components/ui/Skeleton'
import Modal from '../../components/ui/Modal'
import Pagination from '../../components/ui/Pagination'

const TABS = ['pending','approved','rejected']

export default function Reviews() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState('pending')
  const [page, setPage] = useState(1)
  const [rejecting, setRejecting] = useState(null) // review jise reject karna hai
  const [reason, setReason] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reviews', filter, page],
    queryFn: () => api.get('/admin/reviews', { params:{ status:filter, page, limit:20 } }).then(r => r.data?.data || {}),
    placeholderData: keepPreviousData,
  })

  const actionMutation = useMutation({
    mutationFn: ({id,action,body}) => api.put(`/admin/reviews/${id}/${action}`, body || {}),
    onSuccess: (_, v) => {
      qc.invalidateQueries({queryKey:['admin-reviews']})
      qc.invalidateQueries({queryKey:['admin-dashboard']})
      toast.success(v.action === 'approve' ? 'Review is live' : 'Review rejected')
      setRejecting(null); setReason('')
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed'),
  })

  const reviews = data?.reviews || []
  const switchTab = (t) => { setFilter(t); setPage(1) }

  const approveBtn = (r, label) => (
    <button onClick={()=>actionMutation.mutate({id:r._id,action:'approve'})} disabled={actionMutation.isPending}
      className="flex items-center gap-1.5 bg-green-50 text-green-600 px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-green-100 disabled:opacity-60">
      <CheckCircle size={13}/> {label}
    </button>
  )
  const rejectBtn = (r, label) => (
    <button onClick={()=>{ setRejecting(r); setReason('') }}
      className="flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-red-100">
      <XCircle size={13}/> {label}
    </button>
  )

  return (
    <AdminLayout title="Reviews">
      <div className="flex gap-2 mb-6">
        {TABS.map(s=>(
          <button key={s} onClick={()=>switchTab(s)}
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
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3 flex-1 min-w-0">
                {r.product?.images?.[0] && <img src={r.product.images[0]} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0"/>}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-gray-900 text-sm">{r.user?.name}</span>
                    <div className="flex">{[...Array(5)].map((_,i)=><Star key={i} size={12} className={i<r.rating?'text-amber-400 fill-amber-400':'text-gray-200 fill-gray-200'}/>)}</div>
                    {r.isVerifiedPurchase && <span className="flex items-center gap-1 text-[11px] text-green-600"><BadgeCheck size={12}/> Verified purchase</span>}
                    <span className="text-[11px] text-gray-400">{new Date(r.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">on <span className="font-medium text-gray-700">{r.product?.name}</span></p>
                  {r.title && <p className="text-sm font-semibold text-gray-800">{r.title}</p>}
                  <p className="text-sm text-gray-700 break-words">{r.comment}</p>
                  {filter==='rejected' && r.rejectionReason && <p className="text-xs text-red-600 mt-2">Reason: {r.rejectionReason}</p>}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {filter==='pending' && <>{approveBtn(r,'Approve')}{rejectBtn(r,'Reject')}</>}
                {filter==='approved' && rejectBtn(r,'Take down')}
                {filter==='rejected' && approveBtn(r,'Approve')}
              </div>
            </div>
          </div>
        ))}
      </div>
      <Pagination page={page} totalPages={data?.pagination?.totalPages || 1} onPageChange={setPage}/>

      <Modal isOpen={!!rejecting} onClose={()=>setRejecting(null)} title="Reject review">
        <div className="space-y-3">
          <p className="text-sm text-gray-600">This review will not be shown in the store{rejecting?.isApproved ? ' and the product rating will be recalculated' : ''}.</p>
          <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={3} maxLength={200} placeholder="Reason (optional, for your own record)"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm resize-none"/>
          <button onClick={()=>actionMutation.mutate({id:rejecting._id,action:'reject',body:{reason:reason.trim()}})} disabled={actionMutation.isPending}
            className="w-full bg-red-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-60">
            {actionMutation.isPending ? 'Rejecting...' : 'Reject review'}
          </button>
        </div>
      </Modal>
    </AdminLayout>
  )
}
