import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Tag, Copy, Pause, Play, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import AdminLayout from '../../components/admin/AdminLayout'
import Modal from '../../components/ui/Modal'
import Skeleton from '../../components/ui/Skeleton'
import CouponScopePicker from '../../components/admin/CouponScopePicker'

const EMPTY = { code:'', type:'percentage', value:'', minOrder:'', maxUses:'', maxDiscount:'', expiresAt:'', isActive:true, scopeProducts:[], scopeCategories:[] }

// Admin ko asli haalat dikhni chahiye: pehle expired/used-up coupon bhi "Active" dikhta tha
const couponState = (c) => {
  if (c.expiresAt && new Date(c.expiresAt) < new Date()) return { label:'Expired', cls:'bg-red-100 text-red-600' }
  if (c.usageLimit && (c.usedCount || 0) >= c.usageLimit) return { label:'Used up', cls:'bg-orange-100 text-orange-700' }
  if (!c.isActive) return { label:'Paused', cls:'bg-gray-100 text-gray-500' }
  return { label:'Active', cls:'bg-green-100 text-green-700' }
}

// Admin list par: coupon kin par lagta hai (backend names populate karke bhejta hai)
const scopeInfo = (c) => {
  const products = (c.applicableProducts || []).filter(Boolean)
  const categories = (c.applicableCategories || []).filter(Boolean)
  if (products.length + categories.length === 0) return null
  const names = [...products, ...categories].map(x => x.name || '').filter(Boolean)
  const parts = []
  if (products.length) parts.push(`${products.length} product${products.length > 1 ? 's' : ''}`)
  if (categories.length) parts.push(`${categories.length} categor${categories.length > 1 ? 'ies' : 'y'}`)
  return { label: parts.join(' · '), names: names.join(', ') }
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
  // Khaali list = poore cart par lagega
  payload.applicableProducts = form.scopeProducts.map(p => p._id)
  payload.applicableCategories = form.scopeCategories.map(c => c._id)
  return payload
}

// Edit: backend ka update schema code/type badalne nahi deta, aur khaali field ko null se clear karna padta hai.
// expiresAt tabhi bhejte hain jab admin ne badla ho (backend 'future date' maangta hai; purani date dobara bhejna fail hoga).
function buildUpdatePayload(form, originalExpiry) {
  const payload = {
    value: Number(form.value),
    isActive: form.isActive,
    minOrderAmount: form.minOrder === '' ? 0 : Number(form.minOrder),
    usageLimit: form.maxUses === '' ? null : Number(form.maxUses),
    applicableProducts: form.scopeProducts.map(p => p._id),
    applicableCategories: form.scopeCategories.map(c => c._id),
  }
  if (form.type === 'percentage') payload.maxDiscount = form.maxDiscount === '' ? null : Number(form.maxDiscount)
  if (form.expiresAt && form.expiresAt !== originalExpiry) payload.expiresAt = form.expiresAt
  return payload
}

export default function Coupons() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null) // { id, originalExpiry } jab edit mode ho

  const { data, isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: () => api.get('/admin/coupons').then(r => r.data?.data?.coupons || []),
  })

  const closeModal = () => { setShowModal(false); setEditing(null); setForm(EMPTY) }
  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowModal(true) }
  const openEdit = (c) => {
    const day = c.expiresAt ? new Date(c.expiresAt).toISOString().split('T')[0] : ''
    setEditing({ id: c._id, originalExpiry: day })
    setForm({
      code: c.code, type: c.type, value: String(c.value ?? ''),
      minOrder: c.minOrderAmount ? String(c.minOrderAmount) : '',
      maxUses: c.usageLimit ? String(c.usageLimit) : '',
      maxDiscount: c.maxDiscount ? String(c.maxDiscount) : '',
      expiresAt: day, isActive: c.isActive,
      scopeProducts: (c.applicableProducts || []).filter(Boolean).map(p => ({ _id: p._id, name: p.name })),
      scopeCategories: (c.applicableCategories || []).filter(Boolean).map(x => ({ _id: x._id, name: x.name })),
    })
    setShowModal(true)
  }

  const createMutation = useMutation({
    mutationFn: (d) => api.post('/admin/coupons', d),
    onSuccess: () => { qc.invalidateQueries({queryKey:['admin-coupons']}); toast.success('Coupon created!'); closeModal() },
    onError: (e) => toast.error(e?.response?.data?.message||'Failed'),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/admin/coupons/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({queryKey:['admin-coupons']}); toast.success('Coupon updated!'); closeModal() },
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
        <button onClick={openCreate} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700">
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
              {scopeInfo(c) && (
                <p className="mt-1">
                  <span title={scopeInfo(c).names} className="inline-block text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                    Only on: {scopeInfo(c).label}
                  </span>
                </p>
              )}
            </div>
            <button title="Edit coupon" onClick={()=>openEdit(c)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
              <Pencil size={15}/>
            </button>
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

      <Modal isOpen={showModal} onClose={closeModal} title={editing ? 'Edit Coupon' : 'Create Coupon'} size="lg">
        <form onSubmit={(e)=>{ e.preventDefault(); editing ? updateMutation.mutate({ id: editing.id, data: buildUpdatePayload(form, editing.originalExpiry) }) : createMutation.mutate(buildPayload(form)) }} className="p-4 space-y-3 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Coupon Code *</label>
            <input value={form.code} onChange={f('code')} required disabled={!!editing} placeholder="e.g. SAVE20" className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm uppercase disabled:bg-gray-50 disabled:text-gray-400"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select value={form.type} onChange={f('type')} disabled={!!editing} className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm bg-white disabled:bg-gray-50 disabled:text-gray-400">
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
            <input type="date" value={form.expiresAt} onChange={f('expiresAt')} required min={editing ? undefined : new Date().toISOString().split('T')[0]} className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm"/>
          </div>
          <CouponScopePicker
            products={form.scopeProducts}
            categories={form.scopeCategories}
            onChange={({ products, categories }) => setForm(p => ({ ...p, scopeProducts: products, scopeCategories: categories }))}
          />
          <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
            {editing ? (updateMutation.isPending ? 'Saving...' : 'Save Changes') : (createMutation.isPending ? 'Creating...' : 'Create Coupon')}
          </button>
        </form>
      </Modal>
    </AdminLayout>
  )
}
