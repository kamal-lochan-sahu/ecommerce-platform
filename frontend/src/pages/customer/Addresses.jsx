import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MapPin, Plus, Edit2, Trash2, Star, Home, Briefcase } from 'lucide-react'
import toast from 'react-hot-toast'
import addressService from '../../services/address.service'
import Modal from '../../components/ui/Modal'
import Skeleton from '../../components/ui/Skeleton'

const EMPTY = { name:'', phone:'', addressLine1:'', addressLine2:'', city:'', state:'', pincode:'', type:'home' }
const STATES = ['Andhra Pradesh','Assam','Bihar','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal']

export default function Addresses() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)

  const { data, isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => addressService.getAll().then(r => r.data?.addresses || r.data || []),
  })

  const addMutation = useMutation({
    mutationFn: (data) => addressService.add(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['addresses'] }); toast.success('Address added!'); closeModal() },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed'),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => addressService.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['addresses'] }); toast.success('Address updated!'); closeModal() },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => addressService.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['addresses'] }); toast.success('Deleted') },
  })
  const defaultMutation = useMutation({
    mutationFn: (id) => addressService.setDefault(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['addresses'] }); toast.success('Default address set!') },
  })

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowModal(true) }
  const openEdit = (addr) => { setEditing(addr._id); setForm({ name:addr.name, phone:addr.phone, addressLine1:addr.addressLine1, addressLine2:addr.addressLine2||'', city:addr.city, state:addr.state, pincode:addr.pincode, type:addr.type||'home' }); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(EMPTY) }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editing) updateMutation.mutate({ id: editing, data: form })
    else addMutation.mutate(form)
  }

  const addresses = data || []

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <MapPin className="text-indigo-600" size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Addresses</h1>
              <p className="text-sm text-gray-500">Manage delivery addresses</p>
            </div>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
            <Plus size={16} /> Add New
          </button>
        </div>

        {isLoading && <div className="space-y-3">{[...Array(3)].map((_,i)=><Skeleton key={i} className="h-32 rounded-2xl"/>)}</div>}

        {!isLoading && addresses.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <MapPin className="mx-auto text-gray-200 mb-4" size={64} />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No addresses yet</h3>
            <p className="text-sm text-gray-400 mb-6">Add your delivery address</p>
            <button onClick={openAdd} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700">Add Address</button>
          </div>
        )}

        <div className="space-y-3">
          {addresses.map((addr) => (
            <div key={addr._id} className={`bg-white rounded-2xl border p-5 shadow-sm transition-all ${addr.isDefault ? 'border-indigo-200 ring-2 ring-indigo-100' : 'border-gray-100'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 mb-2">
                  {addr.type === 'work' ? <Briefcase size={15} className="text-gray-400"/> : <Home size={15} className="text-gray-400"/>}
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{addr.type || 'Home'}</span>
                  {addr.isDefault && (
                    <span className="flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                      <Star size={10} fill="currentColor"/> Default
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!addr.isDefault && (
                    <button onClick={() => defaultMutation.mutate(addr._id)} className="text-xs text-indigo-600 hover:underline">Set Default</button>
                  )}
                  <button onClick={() => openEdit(addr)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                    <Edit2 size={14}/>
                  </button>
                  <button onClick={() => deleteMutation.mutate(addr._id)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={14}/>
                  </button>
                </div>
              </div>
              <p className="font-semibold text-gray-900">{addr.name}</p>
              <p className="text-sm text-gray-500 mt-0.5">{addr.phone}</p>
              <p className="text-sm text-gray-600 mt-1">
                {addr.addressLine1}{addr.addressLine2 && `, ${addr.addressLine2}`}<br/>
                {addr.city}, {addr.state} — {addr.pincode}
              </p>
            </div>
          ))}
        </div>
      </div>

      <Modal isOpen={showModal} onClose={closeModal} title={editing ? 'Edit Address' : 'Add New Address'}>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[['name','Full Name'],['phone','Phone']].map(([k,l])=>(
              <div key={k}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{l}</label>
                <input value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} required
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm"/>
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Address Line 1</label>
            <input value={form.addressLine1} onChange={e=>setForm(p=>({...p,addressLine1:e.target.value}))} required
              className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Address Line 2 (Optional)</label>
            <input value={form.addressLine2} onChange={e=>setForm(p=>({...p,addressLine2:e.target.value}))}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm"/>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
              <input value={form.city} onChange={e=>setForm(p=>({...p,city:e.target.value}))} required
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">State</label>
              <select value={form.state} onChange={e=>setForm(p=>({...p,state:e.target.value}))} required
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm bg-white">
                <option value="">Select</option>
                {STATES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Pincode</label>
              <input value={form.pincode} onChange={e=>setForm(p=>({...p,pincode:e.target.value}))} required maxLength={6}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm"/>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
            <div className="flex gap-3">
              {['home','work','other'].map(t=>(
                <button key={t} type="button" onClick={()=>setForm(p=>({...p,type:t}))}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border capitalize transition-all ${form.type===t?'bg-indigo-600 text-white border-indigo-600':'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={addMutation.isPending||updateMutation.isPending}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60 mt-2">
            {addMutation.isPending||updateMutation.isPending ? 'Saving...' : editing ? 'Update Address' : 'Add Address'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
