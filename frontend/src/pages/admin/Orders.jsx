import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Eye, Search, Truck, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import AdminLayout from '../../components/admin/AdminLayout'
import DataTable from '../../components/admin/DataTable'
import Modal from '../../components/ui/Modal'
import Pagination from '../../components/ui/Pagination'

const FILTER_STATUSES = ['placed','confirmed','processing','shipped','delivered','cancelled','returned']
const STATUS_COLORS = {
  placed:'bg-yellow-100 text-yellow-700',
  confirmed:'bg-sky-100 text-sky-700',
  processing:'bg-blue-100 text-blue-700',
  shipped:'bg-indigo-100 text-indigo-700',
  delivered:'bg-green-100 text-green-700',
  cancelled:'bg-red-100 text-red-700',
  returned:'bg-orange-100 text-orange-700',
}
const PAYMENT_COLORS = { paid:'text-green-600', pending:'text-amber-600', failed:'text-red-600', refunded:'text-gray-500' }
const PAYMENT_LABEL = { cod:'COD', razorpay:'Razorpay', stripe:'Stripe' }

const money = (n) => `₹${(n || 0).toLocaleString('en-IN')}`
const when = (d) => new Date(d).toLocaleString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })

function useDebounced(value, ms = 400) {
  const [v, setV] = useState(value)
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t) }, [value, ms])
  return v
}

const Badge = ({ status }) => (
  <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>
)

export default function Orders() {
  const qc = useQueryClient()
  const [params] = useSearchParams()
  const [statusFilter, setStatusFilter] = useState(params.get('status') || '')
  const [refundOnly, setRefundOnly] = useState(params.get('refundDue') === 'true')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)
  const [newStatus, setNewStatus] = useState('')
  const [message, setMessage] = useState('')
  const [tracking, setTracking] = useState({ courier:'', trackingNumber:'', trackingUrl:'' })
  const [refundRef, setRefundRef] = useState('')
  const debouncedSearch = useDebounced(search.trim())

  // Filter badalte hi page 1 par jao (effect mein nahi, seedha handler mein)
  const applyFilter = (status, refund) => { setStatusFilter(status); setRefundOnly(refund); setPage(1) }

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', { statusFilter, refundOnly, debouncedSearch, page }],
    queryFn: () => api.get('/orders/admin/all', {
      params: { status: statusFilter || undefined, refundDue: refundOnly ? 'true' : undefined, search: debouncedSearch || undefined, page, limit: 20 },
    }).then(r => r.data?.data || {}),
    placeholderData: keepPreviousData,
  })
  const orders = data?.orders || []
  const counts = data?.statusCounts || {}
  const refundDueCount = data?.refundDueCount || 0
  const allCount = Object.values(counts).reduce((a, b) => a + b, 0)

  const openOrder = (o) => {
    setSelected(o)
    setNewStatus(o.allowedNext?.[0] || '')
    setMessage('')
    setTracking({ courier: o.tracking?.courier || '', trackingNumber: o.tracking?.trackingNumber || '', trackingUrl: o.tracking?.trackingUrl || '' })
    setRefundRef('')
  }
  const close = () => setSelected(null)

  const onDone = (msg) => { qc.invalidateQueries({ queryKey:['admin-orders'] }); qc.invalidateQueries({ queryKey:['admin-dashboard'] }); toast.success(msg); close() }
  const onFail = (e) => toast.error(e?.response?.data?.message || 'Failed')

  const updateMutation = useMutation({
    mutationFn: (payload) => api.put(`/orders/admin/${selected._id}/status`, payload),
    onSuccess: () => onDone('Order updated'),
    onError: onFail,
  })
  const refundMutation = useMutation({
    mutationFn: (payload) => api.put(`/orders/admin/${selected._id}/refund`, payload),
    onSuccess: () => onDone('Refund marked as done'),
    onError: onFail,
  })

  const submitStatus = () => {
    if (['cancelled', 'returned'].includes(newStatus)) {
      const ok = window.confirm(newStatus === 'cancelled'
        ? 'Cancel this order? Stock will be put back and the customer will be notified. This cannot be undone.'
        : 'Mark this order as returned? This cannot be undone.')
      if (!ok) return
    }
    const payload = { status: newStatus }
    if (message.trim()) payload.message = message.trim()
    if (newStatus === 'shipped') {
      if (tracking.courier.trim()) payload.courier = tracking.courier.trim()
      if (tracking.trackingNumber.trim()) payload.trackingNumber = tracking.trackingNumber.trim()
      if (tracking.trackingUrl.trim()) payload.trackingUrl = tracking.trackingUrl.trim()
    }
    updateMutation.mutate(payload)
  }

  const columns = [
    { key:'orderNumber', label:'Order', render:(v)=><span className="font-mono font-semibold text-gray-900">#{v}</span> },
    { key:'userId', label:'Customer', render:(v)=><div><p className="text-sm font-medium">{v?.name || '—'}</p><p className="text-xs text-gray-400">{v?.email}</p></div> },
    { key:'items', label:'Items', render:(v)=><span className="text-gray-600">{(v||[]).reduce((n,i)=>n+(i.quantity||0),0)}</span> },
    { key:'pricing', label:'Amount', render:(v)=><span className="font-semibold">{money(v?.total)}</span> },
    { key:'paymentStatus', label:'Payment', render:(v,row)=>(
      <div>
        <p className="text-xs text-gray-500">{PAYMENT_LABEL[row.paymentMethod] || row.paymentMethod}</p>
        <span className={`text-xs font-medium capitalize ${PAYMENT_COLORS[v] || 'text-gray-600'}`}>{v}</span>
        {row.refundDue && <span className="ml-1.5 text-[10px] font-semibold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">REFUND DUE</span>}
      </div>
    ) },
    { key:'orderStatus', label:'Status', render:(v)=><Badge status={v}/> },
    { key:'createdAt', label:'Placed', render:(v)=>new Date(v).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) },
  ]

  const chip = (active) => `px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${active ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-400'}`
  const s = selected
  const locked = s && (s.allowedNext || []).length === 0

  return (
    <AdminLayout title="Orders">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-3">
        <button onClick={()=>applyFilter('', false)} className={chip(!statusFilter && !refundOnly)}>All ({allCount})</button>
        {FILTER_STATUSES.map(st=>(
          <button key={st} onClick={()=>applyFilter(st, false)} className={chip(statusFilter===st && !refundOnly)}>
            {st} ({counts[st] || 0})
          </button>
        ))}
        <button onClick={()=>applyFilter('', !refundOnly)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${refundOnly ? 'bg-red-600 text-white' : 'bg-red-50 border border-red-200 text-red-600 hover:border-red-400'}`}>
          Refund due ({refundDueCount})
        </button>
      </div>
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 max-w-sm mb-4">
        <Search size={15} className="text-gray-400 flex-shrink-0"/>
        <input value={search} onChange={e=>{ setSearch(e.target.value); setPage(1) }} placeholder="Order number, customer name, email or phone"
          className="bg-transparent text-sm outline-none flex-1 text-gray-700"/>
      </div>

      <DataTable columns={columns} data={orders} isLoading={isLoading} searchable={false} paginate={false}
        emptyText={debouncedSearch ? 'No orders match your search' : 'No orders found'}
        actions={(row)=>(
          <button onClick={()=>openOrder(row)} title="View / update"
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600">
            <Eye size={15}/>
          </button>
        )}
      />
      <p className="text-xs text-gray-400 mt-3">{data?.pagination?.total ?? 0} orders</p>
      <Pagination page={page} totalPages={data?.pagination?.totalPages || 1} onPageChange={setPage}/>

      {/* Order detail */}
      <Modal isOpen={!!s} onClose={close} size="2xl" title={s ? `Order #${s.orderNumber}` : ''}>
        {s && (
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-gray-500">Placed {when(s.createdAt)}</p>
              <Badge status={s.orderStatus}/>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Customer</p>
                <p className="font-medium text-gray-900">{s.userId?.name || '—'}</p>
                <p className="text-sm text-gray-500">{s.userId?.email}</p>
                {s.userId?.phone && <p className="text-sm text-gray-500">{s.userId.phone}</p>}
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ship to</p>
                <p className="font-medium text-gray-900">{s.shippingAddress?.fullName}</p>
                <p className="text-sm text-gray-600">{s.shippingAddress?.addressLine1}{s.shippingAddress?.addressLine2 ? `, ${s.shippingAddress.addressLine2}` : ''}</p>
                <p className="text-sm text-gray-600">{[s.shippingAddress?.city, s.shippingAddress?.state, s.shippingAddress?.pincode].filter(Boolean).join(', ')}</p>
                {s.shippingAddress?.phone && <p className="text-sm text-gray-600 mt-1">📞 {s.shippingAddress.phone}</p>}
              </div>
            </div>

            {/* Items to pack */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Items ({(s.items||[]).reduce((n,i)=>n+(i.quantity||0),0)})</p>
              <div className="border border-gray-100 rounded-xl divide-y divide-gray-100">
                {(s.items||[]).map((it, i)=>(
                  <div key={i} className="flex items-center gap-3 p-3">
                    <img src={it.image || 'https://placehold.co/80x80?text=Item'} alt="" className="w-12 h-12 rounded-lg object-cover bg-gray-100 flex-shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{it.name}</p>
                      {it.variant?.name && <p className="text-xs text-gray-500">{it.variant.name}</p>}
                      <p className="text-xs text-gray-400">{money(it.price)} × {it.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{money(it.total ?? it.price * it.quantity)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 text-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Payment</p>
                <div className="flex justify-between"><span className="text-gray-500">Method</span><span className="font-medium">{PAYMENT_LABEL[s.paymentMethod] || s.paymentMethod}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Status</span><span className={`font-medium capitalize ${PAYMENT_COLORS[s.paymentStatus] || ''}`}>{s.paymentStatus}</span></div>
                {s.paymentMethod === 'cod' && s.paymentStatus !== 'paid' && <p className="text-xs text-amber-600 pt-1">Collect {money(s.pricing?.total)} in cash on delivery.</p>}
              </div>
              <div className="space-y-1.5 text-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Amount</p>
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{money(s.pricing?.subtotal)}</span></div>
                {s.pricing?.discount > 0 && <div className="flex justify-between"><span className="text-gray-500">Discount{s.couponCode ? ` (${s.couponCode})` : ''}</span><span className="text-green-600">− {money(s.pricing.discount)}</span></div>}
                <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>{s.pricing?.shippingCharge ? money(s.pricing.shippingCharge) : 'Free'}</span></div>
                {s.pricing?.tax > 0 && <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>{money(s.pricing.tax)}</span></div>}
                <div className="flex justify-between border-t border-gray-100 pt-1.5 font-bold text-gray-900"><span>Total</span><span>{money(s.pricing?.total)}</span></div>
              </div>
            </div>

            {s.notes && <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm"><span className="font-medium text-amber-800">Customer note: </span><span className="text-amber-900">{s.notes}</span></div>}
            {s.cancelReason && <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm"><span className="font-medium text-red-700">Cancel reason: </span><span className="text-red-800">{s.cancelReason}</span></div>}
            {(s.tracking?.trackingNumber || s.tracking?.courier) && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-sm flex items-center gap-2">
                <Truck size={15} className="text-indigo-500"/>
                <span>{s.tracking.courier} {s.tracking.trackingNumber}</span>
                {s.tracking.trackingUrl && <a href={s.tracking.trackingUrl} target="_blank" rel="noreferrer" className="ml-auto text-indigo-600 hover:underline">Track</a>}
              </div>
            )}

            {/* Timeline */}
            {(s.statusHistory||[]).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">History</p>
                <div className="space-y-1.5">
                  {[...s.statusHistory].reverse().map((h, i)=>(
                    <div key={i} className="flex gap-3 text-xs">
                      <span className="text-gray-400 w-32 flex-shrink-0">{when(h.timestamp)}</span>
                      <span className="text-gray-700"><span className="font-medium capitalize">{h.status}</span>{h.message ? ` — ${h.message}` : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            {s.refundDue ? (
              <div className="border border-red-200 bg-red-50 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <RotateCcw size={16} className="text-red-500 mt-0.5"/>
                  <p className="text-sm text-red-800">
                    <span className="font-semibold">Refund due: {money(s.pricing?.total)}.</span> The customer paid ({PAYMENT_LABEL[s.paymentMethod] || s.paymentMethod}) but this order is {s.orderStatus}.
                    Send the money back (from your payment gateway dashboard{s.paymentMethod==='cod' ? ' or in cash/UPI' : ''}), then mark it done here.
                  </p>
                </div>
                <input value={refundRef} onChange={e=>setRefundRef(e.target.value)} placeholder="Refund reference / transaction ID (optional)" maxLength={100}
                  className="w-full px-3 py-2 rounded-xl border border-red-200 focus:border-red-400 outline-none text-sm bg-white"/>
                <button onClick={()=>refundMutation.mutate(refundRef.trim() ? { reference: refundRef.trim() } : {})} disabled={refundMutation.isPending}
                  className="w-full bg-red-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-60">
                  {refundMutation.isPending ? 'Saving...' : 'Mark refund as done'}
                </button>
              </div>
            ) : locked ? (
              <p className="text-sm text-gray-500 bg-gray-50 rounded-xl p-3">
                {s.orderStatus === 'cancelled' || s.orderStatus === 'returned' ? `This order is ${s.orderStatus}; no further changes are possible.` : 'No further changes are possible.'}
              </p>
            ) : (
              <div className="border border-gray-100 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Update order</p>
                {s.paymentMethod !== 'cod' && s.paymentStatus !== 'paid' && (
                  <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2">Online payment not received yet, so this order can only be cancelled.</p>
                )}
                <select value={newStatus} onChange={e=>setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm bg-white capitalize">
                  {s.allowedNext.map(st=><option key={st} value={st}>{st}</option>)}
                </select>

                {newStatus === 'shipped' && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    <input value={tracking.courier} onChange={e=>setTracking(t=>({...t,courier:e.target.value}))} placeholder="Courier (e.g. Delhivery)" maxLength={60}
                      className="px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm"/>
                    <input value={tracking.trackingNumber} onChange={e=>setTracking(t=>({...t,trackingNumber:e.target.value}))} placeholder="Tracking number" maxLength={60}
                      className="px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm"/>
                    <input value={tracking.trackingUrl} onChange={e=>setTracking(t=>({...t,trackingUrl:e.target.value}))} placeholder="Tracking link (https://...) — optional" maxLength={300}
                      className="sm:col-span-2 px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm"/>
                  </div>
                )}

                <input value={message} onChange={e=>setMessage(e.target.value)} placeholder="Note to customer (optional)" maxLength={200}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm"/>

                <button onClick={submitStatus} disabled={!newStatus || updateMutation.isPending}
                  className={`w-full text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-60 ${['cancelled','returned'].includes(newStatus) ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                  {updateMutation.isPending ? 'Updating...' : `Mark as ${newStatus}`}
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </AdminLayout>
  )
}
