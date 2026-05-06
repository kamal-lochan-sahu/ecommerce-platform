import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import AdminLayout from '../../components/admin/AdminLayout'
import DataTable from '../../components/admin/DataTable'
import Modal from '../../components/ui/Modal'

const STATUSES = ['pending','processing','shipped','out_for_delivery','delivered','cancelled']
const STATUS_COLORS = { pending:'bg-yellow-100 text-yellow-700', processing:'bg-blue-100 text-blue-700', shipped:'bg-indigo-100 text-indigo-700', out_for_delivery:'bg-purple-100 text-purple-700', delivered:'bg-green-100 text-green-700', cancelled:'bg-red-100 text-red-700' }

export default function Orders() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState(null)
  const [newStatus, setNewStatus] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', statusFilter],
    queryFn: () => api.get('/admin/orders', { params:{ status:statusFilter, limit:100 } }).then(r => r.data?.orders || r.data || []),
  })

  const updateMutation = useMutation({
    mutationFn: ({id,status}) => api.put(`/orders/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({queryKey:['admin-orders']}); toast.success('Status updated!'); setSelected(null) },
    onError: (e) => toast.error(e?.response?.data?.message||'Failed'),
  })

  const columns = [
    { key:'orderNumber', label:'Order ID', render:(v)=><span className="font-mono font-semibold text-gray-900">#{v}</span> },
    { key:'user', label:'Customer', render:(v)=><div><p className="text-sm font-medium">{v?.name}</p><p className="text-xs text-gray-400">{v?.email}</p></div> },
    { key:'totalAmount', label:'Amount', render:(v)=><span className="font-semibold">₹{v?.toLocaleString('en-IN')}</span> },
    { key:'status', label:'Status', render:(v)=><span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[v]||'bg-gray-100 text-gray-600'}`}>{v}</span> },
    { key:'paymentStatus', label:'Payment', render:(v)=><span className={`text-xs font-medium capitalize ${v==='paid'?'text-green-600':'text-amber-600'}`}>{v}</span> },
    { key:'createdAt', label:'Date', render:(v)=>new Date(v).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) },
  ]

  return (
    <AdminLayout title="Orders">
      <div className="flex gap-2 flex-wrap mb-5">
        {['', ...STATUSES].map(s=>(
          <button key={s} onClick={()=>setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${statusFilter===s?'bg-indigo-600 text-white':'bg-white border border-gray-200 text-gray-600 hover:border-indigo-400'}`}>
            {s||'All'}
          </button>
        ))}
      </div>
      <DataTable columns={columns} data={data||[]} isLoading={isLoading} emptyText="No orders found"
        actions={(row)=>(
          <button onClick={()=>{ setSelected(row); setNewStatus(row.status) }}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600">
            <Eye size={15}/>
          </button>
        )}
      />

      <Modal isOpen={!!selected} onClose={()=>setSelected(null)} title={`Update Order #${selected?.orderNumber}`}>
        <div className="p-4 space-y-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Customer</p>
            <p className="font-medium text-gray-900">{selected?.user?.name}</p>
            <p className="text-sm text-gray-500">{selected?.user?.email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Amount</p>
            <p className="font-bold text-gray-900">₹{selected?.totalAmount?.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Update Status</label>
            <select value={newStatus} onChange={e=>setNewStatus(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm bg-white">
              {STATUSES.map(s=><option key={s} value={s} className="capitalize">{s}</option>)}
            </select>
          </div>
          <button onClick={()=>updateMutation.mutate({id:selected._id,status:newStatus})} disabled={updateMutation.isPending||newStatus===selected?.status}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
            {updateMutation.isPending?'Updating...':'Update Status'}
          </button>
        </div>
      </Modal>
    </AdminLayout>
  )
}
