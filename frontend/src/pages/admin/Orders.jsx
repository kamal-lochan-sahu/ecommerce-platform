import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import AdminLayout from '../../components/admin/AdminLayout'
import DataTable from '../../components/admin/DataTable'
import Modal from '../../components/ui/Modal'

// Backend ke Order.orderStatus enum se match karta hai.
// FILTER: list filter chips (sab statuses). UPDATE: admin jo status SET kar sakta hai
// (backend 'placed' set karne nahi deta - wo sirf order banne par apne aap hota hai).
const FILTER_STATUSES = ['placed','confirmed','processing','shipped','delivered','cancelled','returned']
const UPDATE_STATUSES = ['confirmed','processing','shipped','delivered','cancelled','returned']
const STATUS_COLORS = {
  placed:'bg-yellow-100 text-yellow-700',
  confirmed:'bg-sky-100 text-sky-700',
  processing:'bg-blue-100 text-blue-700',
  shipped:'bg-indigo-100 text-indigo-700',
  delivered:'bg-green-100 text-green-700',
  cancelled:'bg-red-100 text-red-700',
  returned:'bg-orange-100 text-orange-700',
}

// API ke asli fields (userId populated, pricing.total, orderStatus) ko flat karte hain,
// taaki table columns simple rahein aur DataTable ka search naam/email/amount par chale
// (nested object par search "[object Object]" dekhta hai).
const normalizeOrder = (o) => ({
  ...o,
  customerName: o.userId?.name || '—',
  customerEmail: o.userId?.email || '',
  total: o.pricing?.total ?? 0,
})

export default function Orders() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState(null)
  const [newStatus, setNewStatus] = useState('')
  const locked = selected?.orderStatus === 'cancelled'

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', statusFilter],
    queryFn: () => api.get('/orders/admin/all', { params:{ status:statusFilter, limit:100 } }).then(r => (r.data?.data?.orders || []).map(normalizeOrder)),
  })

  const updateMutation = useMutation({
    mutationFn: ({id,status}) => api.put(`/orders/admin/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({queryKey:['admin-orders']}); toast.success('Status updated!'); setSelected(null) },
    onError: (e) => toast.error(e?.response?.data?.message||'Failed'),
  })

  const columns = [
    { key:'orderNumber', label:'Order ID', render:(v)=><span className="font-mono font-semibold text-gray-900">#{v}</span> },
    { key:'customerName', label:'Customer', render:(v,row)=><div><p className="text-sm font-medium">{v}</p><p className="text-xs text-gray-400">{row.customerEmail}</p></div> },
    { key:'total', label:'Amount', render:(v)=><span className="font-semibold">₹{v?.toLocaleString('en-IN')}</span> },
    { key:'orderStatus', label:'Status', render:(v)=><span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[v]||'bg-gray-100 text-gray-600'}`}>{v}</span> },
    { key:'paymentStatus', label:'Payment', render:(v)=><span className={`text-xs font-medium capitalize ${v==='paid'?'text-green-600':'text-amber-600'}`}>{v}</span> },
    { key:'createdAt', label:'Date', render:(v)=>new Date(v).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) },
  ]

  return (
    <AdminLayout title="Orders">
      <div className="flex gap-2 flex-wrap mb-5">
        {['', ...FILTER_STATUSES].map(s=>(
          <button key={s} onClick={()=>setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${statusFilter===s?'bg-indigo-600 text-white':'bg-white border border-gray-200 text-gray-600 hover:border-indigo-400'}`}>
            {s||'All'}
          </button>
        ))}
      </div>
      <DataTable columns={columns} data={data||[]} isLoading={isLoading} emptyText="No orders found"
        actions={(row)=>(
          <button onClick={()=>{ setSelected(row); setNewStatus(row.orderStatus) }}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600">
            <Eye size={15}/>
          </button>
        )}
      />

      <Modal isOpen={!!selected} onClose={()=>setSelected(null)} title={`Update Order #${selected?.orderNumber}`}>
        <div className="p-4 space-y-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Customer</p>
            <p className="font-medium text-gray-900">{selected?.customerName}</p>
            <p className="text-sm text-gray-500">{selected?.customerEmail}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Amount</p>
            <p className="font-bold text-gray-900">₹{selected?.total?.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Update Status</label>
            <select value={newStatus} onChange={e=>setNewStatus(e.target.value)} disabled={locked}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm bg-white disabled:bg-gray-50 disabled:text-gray-400">
              {/* Abhi ka status (jaise 'placed') dikhana hai, par usse set nahi kar sakte */}
              {!UPDATE_STATUSES.includes(selected?.orderStatus) && selected && <option value={selected.orderStatus} disabled className="capitalize">{selected.orderStatus} (current)</option>}
              {UPDATE_STATUSES.map(s=><option key={s} value={s} className="capitalize">{s}</option>)}
            </select>
            {locked && <p className="text-xs text-gray-400 mt-1.5">Cancelled order ka status badla nahi ja sakta.</p>}
          </div>
          <button onClick={()=>updateMutation.mutate({id:selected._id,status:newStatus})} disabled={locked||updateMutation.isPending||newStatus===selected?.orderStatus}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
            {updateMutation.isPending?'Updating...':'Update Status'}
          </button>
        </div>
      </Modal>
    </AdminLayout>
  )
}
