import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Tag, Copy, Pause, Play } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import AdminLayout from '../../components/admin/AdminLayout'
import Modal from '../../components/ui/Modal'
import Skeleton from '../../components/ui/Skeleton'

const EMPTY = { code:'', type:'percentage', value:'', minOrder:'', maxUses:'', maxDiscount:'', expiresAt:'', isActive:true }

// Admin ko asli haalat dikhni chahiye: pehle expired/used-up coupon bhi "Active" dikhta tha
const couponState = (c) => {
  if (c.expiresAt && new Date(c.expiresAt) < new Date()) return { label:'Expired', cls:'bg-red-100 text-red-600' }
  if (c.usageLimit && (c.usedCount || 0) >= c.usageLimit) return { label:'Used up', cls:'bg-orange-100 text-orange-700' }
  if (!c.isActive) return { label:'Paused', cls:'bg-gray-100 text-gray-500' }
  return { label:'Active', cls:'bg-green-100 text-green-700' }
}

// Form field names (minOrder/maxUses) are UI-friendly; the backend's Joi
// schema/model use minOrderAmount/usageLimit and rejects unknown keys, and
// rejects empty strings on optional number fields — so we translate names
// and drop anything left blank rather than sending it as "".
function buildPayload(form) {
  const payload = {
    code: form.code.trim().toUpperCase(),
    type: form.type,
    value: Number(form.value),
    isActive: form.isActive,
    expiresAt: form.expiresAt,
  }
  if (form.minOrder !== '') payload.minOrderAmount = Number(form.minOrder)
  if (form.maxUses !== '')  payload.usageLimit    = Number(form.maxUses)
  // Percentage coupon par cap (jaise 50% off, max ₹500) - bina cap ke bade order par bahut bada discount
  if (form.type === 'percentage' && form.maxDiscount !== '') payload.maxDiscount = Number(form.maxDiscount)
  return payload
}

export default function Coupons() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: () => api.get('/admin/coupons').then(r => r.data?.data?.coupons || []),
  })

  const createMutation = useMutation({
    mutationFn: (d) => api.post('/admin/coupons', d),
    onSuccess: () => { qc.invalidateQueries({queryKey:['admin-coupons']}); toast.success('Coupon created!'); setShowModal(false); setForm(EMPTY) },
    onError: (e) => toast.error(e?.response?.data?.message||'Failed'),
  })
  const toggleMutation = useMutation({
    mutationFn: ({id,active}) => api.put(`/admin/coupons/${id}`, { isActive: active }),
    onSuccess: (_, v) => { qc.invalidateQueries({queryKey:['admin-coupons']}); toast.success(v.active ? 'Coupon resumed' : 'Coupon paused') },
    onError: (e) => toast.error(e?.response?.data?.message||'Failed'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/coupons/${id}`),
    onSuccess: () => { qc.invalidateQueries({queryKey:['admin-coupons']}); toast.success('Deleted') },
  })

  const coupons = data || []
  const f = (k) => (e) => setForm(p=>({...p,[k]:e.target.value}))

  return (
    <AdminLayout title="Coupons">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">{coupons.length} coupons</p>
        <button onClick={()=>setShowModal(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700">
          <Plus size={16}/> Create Coupon
        </button>
      </div>

      {isLoading && <div className="space-y-3">{[...Array(4)].map((_,i)=><Skeleton key={i} className="h-20 rounded-2xl"/>)}</div>}

      <div className="space-y-3">
        {!isLoading && coupons.length === 0 && <div className="text-center py-16 bg-white rounded-2xl border border-gray-100"><p className="text-gray-400">No coupons yet</p></div>}
        {coupons.map(c=>(
          <div key={c._id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Tag size={18} className="text-amber-600"/>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 font-mono tracking-wide">{c.code}</span>
                <button onClick={()=>{navigator.clipboard.writeText(c.code);toast.success('Copied!')}} className="text-gray-400 hover:text-gray-600"><Copy size={12}/></button>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${couponState(c).cls}`}>{couponState(c).label}</span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                {c.type==='percentage'?`${c.value}% off${c.maxDiscount?` (up to ₹${c.maxDiscount})`:''}`:`₹${c.value} off`}
                {c.minOrderAmount?` · Min ₹${c.minOrderAmount}`:''}
                {c.usageLimit?` · ${c.usedCount||0}/${c.usageLimit} used`:''}
                {c.expiresAt?` · Expires ${new Date(c.expiresAt).toLocaleDateString('en-IN')}` : ''}
              </p>
            </div>
            {couponState(c).label !== 'Expired' && couponState(c).label !== 'Used up' && (
              <button title={c.isActive ? 'Pause coupon' : 'Resume coupon'} onClick={()=>toggleMutation.mutate({id:c._id,active:!c.isActive})}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                {c.isActive ? <Pause size={15}/> : <Play size={15}/>}
              </button>
            )}
            <button onClick={()=>{ if(confirm('Delete this coupon? Past orders that used it keep their record.')) deleteMutation.mutate(c._id) }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
              <Trash2 size={15}/>
            </button>
          </div>
        ))}
      </div>

      <Modal isOpen={showModal} onClose={()=>setShowModal(false)} title="Create Coupon">
        <form onSubmit={(e)=>{ e.preventDefault(); createMutation.mutate(buildPayload(form)) }} className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Coupon Code *</label>
            <input value={form.code} onChange={f('code')} required placeholder="e.g. SAVE20" className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm uppercase"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select value={form.type} onChange={f('type')} className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm bg-white">
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed (₹)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Value *</label>
              <input type="number" value={form.value} onChange={f('value')} required min="1" className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm"/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Min Order (₹)</label>
              <input type="number" value={form.minOrder} onChange={f('minOrder')} min="0" className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Max Uses</label>
              <input type="number" value={form.maxUses} onChange={f('maxUses')} min="1" className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm"/>
            </div>
          </div>
          {form.type === 'percentage' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Max Discount (₹) — optional cap</label>
              <input type="number" value={form.maxDiscount} onChange={f('maxDiscount')} min="1" placeholder="e.g. 500" className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm"/>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Expiry Date *</label>
            <input type="date" value={form.expiresAt} onChange={f('expiresAt')} required min={new Date().toISOString().split('T')[0]} className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm"/>
          </div>
          <button type="submit" disabled={createMutation.isPending} className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
            {createMutation.isPending?'Creating...':'Create Coupon'}
          </button>
        </form>
      </Modal>
    </AdminLayout>
  )
}
