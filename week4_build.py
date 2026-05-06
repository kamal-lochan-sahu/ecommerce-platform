import os

def write(path, content):
    full = os.path.expanduser(f"~/projects/ecommerce-platform/{path}")
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w') as f:
        f.write(content.lstrip('\n'))
    print(f"  ✅ {path.split('/')[-1]}")

print("\n📦 SERVICES...\n")

write("frontend/src/services/user.service.js", """
import api from "./api";
const userService = {
  getProfile:      ()     => api.get("/users/profile"),
  updateProfile:   (data) => api.put("/users/profile", data),
  updatePassword:  (data) => api.put("/users/change-password", data),
  uploadAvatar:    (form) => api.post("/users/avatar", form, { headers: { "Content-Type": "multipart/form-data" } }),
  deleteAccount:   ()     => api.delete("/users/account"),
};
export default userService;
""")

write("frontend/src/services/address.service.js", """
import api from "./api";
const addressService = {
  getAll:     ()        => api.get("/addresses"),
  add:        (data)    => api.post("/addresses", data),
  update:     (id,data) => api.put(`/addresses/${id}`, data),
  remove:     (id)      => api.delete(`/addresses/${id}`),
  setDefault: (id)      => api.put(`/addresses/${id}/default`),
};
export default addressService;
""")

write("frontend/src/services/wishlist.service.js", """
import api from "./api";
const wishlistService = {
  getAll:  ()    => api.get("/wishlist"),
  add:     (pid) => api.post("/wishlist", { productId: pid }),
  remove:  (pid) => api.delete(`/wishlist/${pid}`),
};
export default wishlistService;
""")

write("frontend/src/services/notification.service.js", """
import api from "./api";
const notificationService = {
  getAll:      (p)   => api.get("/notifications", { params: p }),
  markRead:    (id)  => api.put(`/notifications/${id}/read`),
  markAllRead: ()    => api.put("/notifications/read-all"),
  remove:      (id)  => api.delete(`/notifications/${id}`),
};
export default notificationService;
""")

write("frontend/src/services/loyalty.service.js", """
import api from "./api";
const loyaltyService = {
  get:     ()  => api.get("/loyalty"),
  history: (p) => api.get("/loyalty/history", { params: p }),
};
export default loyaltyService;
""")

print("\n👤 CUSTOMER PAGES...\n")

write("frontend/src/pages/customer/Profile.jsx", """
import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { User, Camera, Lock, Trash2, Save, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import userService from '../../services/user.service'
import Skeleton from '../../components/ui/Skeleton'
import Modal from '../../components/ui/Modal'

export default function Profile() {
  const { user, updateUser, logout } = useAuthStore()
  const qc = useQueryClient()
  const fileRef = useRef()
  const [showOldPw, setShowOldPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', phone: user?.phone || '' })
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => userService.getProfile().then(r => r.data?.user || r.data),
    onSuccess: (d) => setProfileForm({ name: d.name || '', phone: d.phone || '' }),
  })

  const updateMutation = useMutation({
    mutationFn: (data) => userService.updateProfile(data),
    onSuccess: (r) => {
      const updated = r.data?.user || r.data
      updateUser(updated)
      qc.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Profile updated!')
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Update failed'),
  })

  const pwMutation = useMutation({
    mutationFn: (data) => userService.updatePassword(data),
    onSuccess: () => { toast.success('Password changed!'); setPwForm({ oldPassword:'', newPassword:'', confirmPassword:'' }) },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed'),
  })

  const avatarMutation = useMutation({
    mutationFn: (form) => userService.uploadAvatar(form),
    onSuccess: (r) => { updateUser({ avatar: r.data?.avatar }); toast.success('Avatar updated!') },
    onError: () => toast.error('Upload failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => userService.deleteAccount(),
    onSuccess: () => { logout(); toast.success('Account deleted') },
  })

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const form = new FormData()
    form.append('avatar', file)
    avatarMutation.mutate(form)
  }

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    if (pwForm.newPassword !== pwForm.confirmPassword) return toast.error("Passwords don't match")
    if (pwForm.newPassword.length < 6) return toast.error("Min 6 characters")
    pwMutation.mutate({ oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword })
  }

  const avatar = user?.avatar || profile?.avatar
  const initials = (user?.name || 'U').charAt(0).toUpperCase()

  if (isLoading) return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      <Skeleton className="h-32 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /><Skeleton className="h-48 rounded-2xl" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <User className="text-indigo-600" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
            <p className="text-sm text-gray-500">Manage your account details</p>
          </div>
        </div>

        {/* Avatar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-5">
            <div className="relative">
              {avatar ? (
                <img src={avatar} alt="avatar" className="w-20 h-20 rounded-full object-cover border-4 border-indigo-100" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                  {initials}
                </div>
              )}
              <button
                onClick={() => fileRef.current.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center shadow-md hover:bg-indigo-700 transition-colors"
              >
                <Camera size={13} className="text-white" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-lg">{user?.name}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
              {user?.role === 'admin' && (
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full mt-1 inline-block font-medium">Admin</span>
              )}
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Personal Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input
                value={profileForm.name}
                onChange={(e) => setProfileForm(p => ({ ...p, name: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-gray-400 text-sm cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
              <input
                value={profileForm.phone}
                onChange={(e) => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition"
                placeholder="+91 9876543210"
              />
            </div>
            <button
              onClick={() => updateMutation.mutate(profileForm)}
              disabled={updateMutation.isPending}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              <Save size={15} />
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Lock size={17} className="text-indigo-500" /> Change Password
          </h2>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {[
              { key:'oldPassword', label:'Current Password', show: showOldPw, toggle: () => setShowOldPw(p=>!p) },
              { key:'newPassword', label:'New Password',     show: showNewPw, toggle: () => setShowNewPw(p=>!p) },
              { key:'confirmPassword', label:'Confirm New Password', show: showNewPw, toggle: () => setShowNewPw(p=>!p) },
            ].map(({ key, label, show, toggle }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                <div className="relative">
                  <input
                    type={show ? 'text' : 'password'}
                    value={pwForm[key]}
                    onChange={(e) => setPwForm(p => ({ ...p, [key]: e.target.value }))}
                    className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            ))}
            <button
              type="submit"
              disabled={pwMutation.isPending}
              className="flex items-center gap-2 bg-gray-900 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-60"
            >
              {pwMutation.isPending ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-2xl border border-red-100 p-6 shadow-sm">
          <h2 className="font-semibold text-red-600 mb-2 flex items-center gap-2">
            <AlertTriangle size={17} /> Danger Zone
          </h2>
          <p className="text-sm text-gray-500 mb-4">Once deleted, your account cannot be recovered.</p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 bg-red-50 text-red-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors"
          >
            <Trash2 size={15} /> Delete My Account
          </button>
        </div>

      </div>

      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Account?">
        <div className="p-4">
          <p className="text-sm text-gray-600 mb-6">This action is <strong>permanent</strong>. All your data will be erased.</p>
          <div className="flex gap-3">
            <button onClick={() => setShowDeleteModal(false)} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm font-medium">Cancel</button>
            <button onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending} className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-60">
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Forever'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
""")

write("frontend/src/pages/customer/Addresses.jsx", """
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
""")

write("frontend/src/pages/customer/Wishlist.jsx", """
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Heart, ShoppingCart, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import wishlistService from '../../services/wishlist.service'
import { useCartStore } from '../../store/cartStore'
import Skeleton from '../../components/ui/Skeleton'

export default function Wishlist() {
  const qc = useQueryClient()
  const addToCart = useCartStore(s => s.addItem)

  const { data, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => wishlistService.getAll().then(r => r.data?.items || r.data || []),
  })

  const removeMutation = useMutation({
    mutationFn: (pid) => wishlistService.remove(pid),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['wishlist'] }); toast.success('Removed from wishlist') },
  })

  const handleMoveToCart = (item) => {
    addToCart({ product: item.product, quantity: 1 })
    removeMutation.mutate(item.product._id)
    toast.success('Moved to cart!')
  }

  const items = data || []

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <Heart className="text-red-500" size={20} fill="currentColor"/>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Wishlist</h1>
            <p className="text-sm text-gray-500">{items.length} saved items</p>
          </div>
        </div>

        {isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_,i)=><Skeleton key={i} className="h-64 rounded-2xl"/>)}
          </div>
        )}

        {!isLoading && items.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <Heart className="mx-auto text-gray-200 mb-4" size={72}/>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Wishlist is empty</h3>
            <p className="text-sm text-gray-400 mb-6">Save products you love here</p>
            <Link to="/products" className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-indigo-700">Browse Products</Link>
          </div>
        )}

        {!isLoading && items.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item) => {
              const p = item.product || item
              const img = p.images?.[0] || '/placeholder.jpg'
              const price = p.salePrice || p.price
              const original = p.price
              const discount = original > price ? Math.round((1 - price/original)*100) : 0
              return (
                <div key={p._id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all group">
                  <Link to={`/products/${p.slug}`} className="block relative overflow-hidden">
                    <img src={img} alt={p.name} className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy"/>
                    {discount > 0 && (
                      <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">{discount}% off</span>
                    )}
                  </Link>
                  <div className="p-3">
                    <Link to={`/products/${p.slug}`}>
                      <h3 className="text-sm font-medium text-gray-900 line-clamp-2 hover:text-indigo-600 transition-colors">{p.name}</h3>
                    </Link>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="font-bold text-gray-900">₹{price?.toLocaleString('en-IN')}</span>
                      {discount > 0 && <span className="text-xs text-gray-400 line-through">₹{original?.toLocaleString('en-IN')}</span>}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => handleMoveToCart(item)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 text-white py-2 rounded-xl text-xs font-medium hover:bg-indigo-700 transition-colors">
                        <ShoppingCart size={13}/> Add to Cart
                      </button>
                      <button onClick={() => removeMutation.mutate(p._id)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
""")

write("frontend/src/pages/customer/Notifications.jsx", """
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, Trash2, Package, Tag, Star, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import notificationService from '../../services/notification.service'
import Skeleton from '../../components/ui/Skeleton'

const TYPE_ICON = {
  order:   { Icon: Package, bg: 'bg-indigo-100', color: 'text-indigo-600' },
  offer:   { Icon: Tag,     bg: 'bg-amber-100',  color: 'text-amber-600' },
  review:  { Icon: Star,    bg: 'bg-yellow-100', color: 'text-yellow-600' },
  default: { Icon: Info,    bg: 'bg-gray-100',   color: 'text-gray-500' },
}

export default function Notifications() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getAll().then(r => r.data?.notifications || r.data || []),
  })

  const readMutation = useMutation({
    mutationFn: (id) => notificationService.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey:['notifications'] }),
  })
  const readAllMutation = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['notifications'] }); toast.success('All marked as read') },
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => notificationService.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['notifications'] }); toast.success('Deleted') },
  })

  const notifications = data || []
  const unreadCount = notifications.filter(n => !n.isRead).length
  const filtered = filter === 'unread' ? notifications.filter(n=>!n.isRead) : notifications

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center relative">
              <Bell className="text-indigo-600" size={20}/>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{unreadCount}</span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
              <p className="text-sm text-gray-500">{unreadCount} unread</p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button onClick={() => readAllMutation.mutate()} disabled={readAllMutation.isPending}
              className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              <CheckCheck size={16}/> Mark all read
            </button>
          )}
        </div>

        <div className="flex gap-2 mb-5">
          {['all','unread'].map(f=>(
            <button key={f} onClick={()=>setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-all ${filter===f?'bg-indigo-600 text-white':'bg-white text-gray-600 border border-gray-200 hover:border-indigo-400'}`}>
              {f} {f==='unread' && unreadCount > 0 ? `(${unreadCount})` : ''}
            </button>
          ))}
        </div>

        {isLoading && <div className="space-y-3">{[...Array(6)].map((_,i)=><Skeleton key={i} className="h-20 rounded-2xl"/>)}</div>}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <Bell className="mx-auto text-gray-200 mb-4" size={64}/>
            <h3 className="text-lg font-semibold text-gray-700">No notifications</h3>
            <p className="text-sm text-gray-400 mt-1">{filter==='unread'?'All caught up!':'Nothing here yet'}</p>
          </div>
        )}

        <div className="space-y-2">
          {filtered.map((n) => {
            const cfg = TYPE_ICON[n.type] || TYPE_ICON.default
            const { Icon } = cfg
            return (
              <div key={n._id} onClick={() => !n.isRead && readMutation.mutate(n._id)}
                className={`flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${n.isRead?'bg-white border-gray-100':'bg-indigo-50 border-indigo-100'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                  <Icon size={18} className={cfg.color}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${n.isRead?'text-gray-700':'text-gray-900'}`}>{n.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(n.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!n.isRead && <div className="w-2 h-2 bg-indigo-600 rounded-full"/>}
                  <button onClick={(e)=>{ e.stopPropagation(); deleteMutation.mutate(n._id) }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
""")

write("frontend/src/pages/customer/LoyaltyPoints.jsx", """
import { useQuery } from '@tanstack/react-query'
import { Star, Gift, TrendingUp, Clock, Plus, Minus } from 'lucide-react'
import loyaltyService from '../../services/loyalty.service'
import Skeleton from '../../components/ui/Skeleton'

const HOW_TO = [
  { icon: '🛒', title: 'Place an Order', desc: 'Earn 1 point per ₹10 spent' },
  { icon: '⭐', title: 'Write a Review', desc: 'Earn 10 points per review' },
  { icon: '👤', title: 'Refer a Friend', desc: 'Earn 100 points per referral' },
  { icon: '🎂', title: 'Birthday Bonus', desc: '50 bonus points on your birthday' },
]

export default function LoyaltyPoints() {
  const { data, isLoading } = useQuery({
    queryKey: ['loyalty'],
    queryFn: () => loyaltyService.get().then(r => r.data),
  })
  const { data: histData, isLoading: histLoading } = useQuery({
    queryKey: ['loyalty-history'],
    queryFn: () => loyaltyService.history().then(r => r.data?.transactions || r.data || []),
  })

  const points = data?.currentPoints || 0
  const lifetime = data?.lifetimePoints || 0
  const transactions = histData || []

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <Star className="text-amber-500" size={20} fill="currentColor"/>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Loyalty Points</h1>
            <p className="text-sm text-gray-500">Earn and redeem reward points</p>
          </div>
        </div>

        {/* Points Cards */}
        {isLoading ? <Skeleton className="h-36 rounded-2xl"/> : (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-5 text-white">
              <div className="flex items-center gap-2 mb-3">
                <Gift size={18} className="text-indigo-200"/>
                <p className="text-indigo-200 text-sm">Available Points</p>
              </div>
              <p className="text-4xl font-black">{points.toLocaleString('en-IN')}</p>
              <p className="text-indigo-200 text-xs mt-1">≈ ₹{(points/10).toFixed(0)} value</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-5 text-white">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={18} className="text-amber-200"/>
                <p className="text-amber-200 text-sm">Lifetime Earned</p>
              </div>
              <p className="text-4xl font-black">{lifetime.toLocaleString('en-IN')}</p>
              <p className="text-amber-200 text-xs mt-1">Total points earned</p>
            </div>
          </div>
        )}

        {/* How to Earn */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">How to Earn Points</h3>
          <div className="grid grid-cols-2 gap-3">
            {HOW_TO.map((item)=>(
              <div key={item.title} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="text-sm font-medium text-gray-800">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock size={17} className="text-indigo-500"/> Transaction History
          </h3>
          {histLoading && <div className="space-y-2">{[...Array(4)].map((_,i)=><Skeleton key={i} className="h-12 rounded-xl"/>)}</div>}
          {!histLoading && transactions.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">No transactions yet</p>
          )}
          <div className="space-y-2">
            {transactions.map((t,i)=>(
              <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.type==='credit'?'bg-green-100':'bg-red-100'}`}>
                    {t.type==='credit'?<Plus size={14} className="text-green-600"/>:<Minus size={14} className="text-red-500"/>}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{t.description}</p>
                    <p className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</p>
                  </div>
                </div>
                <span className={`font-bold text-sm ${t.type==='credit'?'text-green-600':'text-red-500'}`}>
                  {t.type==='credit'?'+':'-'}{Math.abs(t.points)}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
""")

print("\n🏢 ADMIN COMPONENTS...\n")

write("frontend/src/components/admin/AdminLayout.jsx", """
import { useState } from 'react'
import AdminSidebar from './AdminSidebar'
import AdminHeader from './AdminHeader'

export default function AdminLayout({ children, title }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}/>
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader title={title} onMenuClick={() => setSidebarOpen(p=>!p)}/>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
""")

write("frontend/src/components/admin/AdminSidebar.jsx", """
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, Grid3X3, ShoppingBag, Users,
  Star, Tag, Image, BarChart2, Settings, LogOut, X, Store
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import authService from '../../services/auth.service'
import toast from 'react-hot-toast'

const NAV = [
  { to:'/admin',              Icon:LayoutDashboard, label:'Dashboard',  end:true },
  { to:'/admin/products',     Icon:Package,         label:'Products' },
  { to:'/admin/categories',   Icon:Grid3X3,         label:'Categories' },
  { to:'/admin/orders',       Icon:ShoppingBag,     label:'Orders' },
  { to:'/admin/customers',    Icon:Users,           label:'Customers' },
  { to:'/admin/reviews',      Icon:Star,            label:'Reviews' },
  { to:'/admin/coupons',      Icon:Tag,             label:'Coupons' },
  { to:'/admin/banners',      Icon:Image,           label:'Banners' },
  { to:'/admin/analytics',    Icon:BarChart2,       label:'Analytics' },
  { to:'/admin/settings',     Icon:Settings,        label:'Settings' },
]

export default function AdminSidebar({ isOpen, onClose }) {
  const { logout, user } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try { await authService.logout() } catch {}
    logout()
    navigate('/login')
    toast.success('Logged out')
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={onClose}/>}

      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-gray-900 flex flex-col transition-transform duration-300 ${isOpen?'translate-x-0':'-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Store size={16} className="text-white"/>
            </div>
            <span className="font-bold text-white text-lg">Admin</span>
          </div>
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-white"><X size={20}/></button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {NAV.map(({ to, Icon, label, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }>
              <Icon size={18}/>{label}
            </NavLink>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="p-3 border-t border-gray-800">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <p className="text-gray-500 text-xs truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-all">
            <LogOut size={18}/> Logout
          </button>
        </div>
      </aside>
    </>
  )
}
""")

write("frontend/src/components/admin/AdminHeader.jsx", """
import { Menu, Bell, Search } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

export default function AdminHeader({ title, onMenuClick }) {
  const { user } = useAuthStore()
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="text-gray-500 hover:text-gray-700 lg:hidden">
          <Menu size={22}/>
        </button>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
          <Search size={15} className="text-gray-400"/>
          <input placeholder="Search..." className="bg-transparent text-sm outline-none w-40 text-gray-700 placeholder-gray-400"/>
        </div>
        <button className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500">
          <Bell size={18}/>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"/>
        </button>
        <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-sm font-bold">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  )
}
""")

write("frontend/src/components/admin/StatsCard.jsx", """
import { TrendingUp, TrendingDown } from 'lucide-react'

export default function StatsCard({ title, value, icon: Icon, color='indigo', change, prefix='', suffix='' }) {
  const up = change >= 0
  const colors = {
    indigo: 'bg-indigo-100 text-indigo-600',
    green:  'bg-green-100 text-green-600',
    amber:  'bg-amber-100 text-amber-600',
    purple: 'bg-purple-100 text-purple-600',
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon size={20}/>
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${up?'bg-green-100 text-green-700':'bg-red-100 text-red-600'}`}>
            {up?<TrendingUp size={12}/>:<TrendingDown size={12}/>}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-black text-gray-900">{prefix}{typeof value==='number'?value.toLocaleString('en-IN'):value}{suffix}</p>
      <p className="text-sm text-gray-500 mt-1">{title}</p>
    </div>
  )
}
""")

write("frontend/src/components/admin/DataTable.jsx", """
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import Skeleton from '../ui/Skeleton'

export default function DataTable({ columns, data=[], isLoading, searchable=true, actions, emptyText='No data found' }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PER_PAGE = 10

  const filtered = searchable && search
    ? data.filter(row => Object.values(row).some(v => String(v).toLowerCase().includes(search.toLowerCase())))
    : data

  const total = Math.ceil(filtered.length / PER_PAGE)
  const paged = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {searchable && (
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 max-w-xs">
            <Search size={15} className="text-gray-400 flex-shrink-0"/>
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}
              placeholder="Search..." className="bg-transparent text-sm outline-none flex-1 text-gray-700"/>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {columns.map(c=>(
                <th key={c.key} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{c.label}</th>
              ))}
              {actions && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && [...Array(5)].map((_,i)=>(
              <tr key={i}>{columns.map(c=><td key={c.key} className="px-4 py-3"><Skeleton className="h-4 rounded"/></td>)}</tr>
            ))}
            {!isLoading && paged.length === 0 && (
              <tr><td colSpan={columns.length+(actions?1:0)} className="text-center py-12 text-gray-400 text-sm">{emptyText}</td></tr>
            )}
            {!isLoading && paged.map((row,i)=>(
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                {columns.map(c=>(
                  <td key={c.key} className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                    {c.render ? c.render(row[c.key], row) : row[c.key] ?? '—'}
                  </td>
                ))}
                {actions && <td className="px-4 py-3">{actions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">{filtered.length} results</p>
          <div className="flex items-center gap-2">
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
              <ChevronLeft size={15}/>
            </button>
            <span className="text-xs text-gray-600 font-medium">{page}/{total}</span>
            <button onClick={()=>setPage(p=>Math.min(total,p+1))} disabled={page===total} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
              <ChevronRight size={15}/>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
""")

print("\n🖥️ ADMIN PAGES...\n")

write("frontend/src/pages/admin/Dashboard.jsx", """
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
  const revenueChart = data?.revenueChart || []
  const ordersByStatus = data?.ordersByStatus || []
  const recentOrders = data?.recentOrders || []
  const lowStock = data?.lowStockProducts || []

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
""")

write("frontend/src/pages/admin/Products.jsx", """
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Trash2, Eye, EyeOff } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../services/api'
import AdminLayout from '../../components/admin/AdminLayout'
import DataTable from '../../components/admin/DataTable'

export default function Products() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', page],
    queryFn: () => api.get('/admin/products', { params:{page,limit:20} }).then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/products/${id}`),
    onSuccess: () => { qc.invalidateQueries({queryKey:['admin-products']}); toast.success('Deleted') },
    onError: () => toast.error('Delete failed'),
  })
  const toggleMutation = useMutation({
    mutationFn: ({id,active}) => api.patch(`/products/${id}`, { isActive: active }),
    onSuccess: () => qc.invalidateQueries({queryKey:['admin-products']}),
  })

  const products = data?.products || []

  const columns = [
    { key:'images', label:'Image', render:(v)=><img src={v?.[0]||'/placeholder.jpg'} alt="" className="w-10 h-10 rounded-xl object-cover"/> },
    { key:'name', label:'Product', render:(v)=><span className="font-medium text-gray-900 max-w-xs truncate block">{v}</span> },
    { key:'category', label:'Category', render:(v)=><span className="text-gray-500 text-xs">{v?.name||'—'}</span> },
    { key:'price', label:'Price', render:(v,row)=>(
      <div>
        <p className="font-semibold">₹{(row.salePrice||v)?.toLocaleString('en-IN')}</p>
        {row.salePrice && row.salePrice < v && <p className="text-xs text-gray-400 line-through">₹{v?.toLocaleString('en-IN')}</p>}
      </div>
    )},
    { key:'stock', label:'Stock', render:(v)=><span className={`font-medium ${v<=5?'text-red-600':v<=20?'text-amber-600':'text-green-600'}`}>{v}</span> },
    { key:'isActive', label:'Status', render:(v)=>(
      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${v?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>{v?'Active':'Inactive'}</span>
    )},
  ]

  return (
    <AdminLayout title="Products">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500">{data?.totalProducts||0} total products</p>
        </div>
        <Link to="/admin/products/add" className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
          <Plus size={16}/> Add Product
        </Link>
      </div>
      <DataTable
        columns={columns}
        data={products}
        isLoading={isLoading}
        emptyText="No products found"
        actions={(row) => (
          <div className="flex items-center gap-1">
            <button onClick={()=>toggleMutation.mutate({id:row._id,active:!row.isActive})}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
              {row.isActive?<EyeOff size={15}/>:<Eye size={15}/>}
            </button>
            <Link to={`/admin/products/${row._id}/edit`} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600">
              <Edit2 size={15}/>
            </Link>
            <button onClick={()=>{ if(confirm('Delete this product?')) deleteMutation.mutate(row._id) }}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
              <Trash2 size={15}/>
            </button>
          </div>
        )}
      />
    </AdminLayout>
  )
}
""")

write("frontend/src/pages/admin/AddProduct.jsx", """
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, Plus, X, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import AdminLayout from '../../components/admin/AdminLayout'

const EMPTY = { name:'', description:'', price:'', salePrice:'', stock:'', category:'', brand:'', sku:'', tags:'' }

export default function AddProduct() {
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [images, setImages] = useState([])
  const [specs, setSpecs] = useState([{key:'',value:''}])

  const { data: catData } = useQuery({
    queryKey:['categories'],
    queryFn: ()=>api.get('/categories').then(r=>r.data?.categories||r.data||[]),
  })

  const mutation = useMutation({
    mutationFn: (fd) => api.post('/products', fd, { headers:{'Content-Type':'multipart/form-data'} }),
    onSuccess: () => { toast.success('Product created!'); navigate('/admin/products') },
    onError: (e) => toast.error(e?.response?.data?.message||'Failed'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const fd = new FormData()
    Object.entries(form).forEach(([k,v])=>{ if(v) fd.append(k,v) })
    images.forEach(img=>fd.append('images',img))
    const filteredSpecs = specs.filter(s=>s.key&&s.value)
    if(filteredSpecs.length) fd.append('specifications', JSON.stringify(filteredSpecs))
    mutation.mutate(fd)
  }

  const f = (k) => (e) => setForm(p=>({...p,[k]:e.target.value}))

  return (
    <AdminLayout title="Add Product">
      <div className="max-w-3xl">
        <button onClick={()=>navigate('/admin/products')} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm font-medium">
          <ArrowLeft size={18}/> Back to Products
        </button>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900">Basic Information</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Product Name *</label>
              <input value={form.name} onChange={f('name')} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <textarea value={form.description} onChange={f('description')} rows={4} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm resize-none"/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Category *</label>
                <select value={form.category} onChange={f('category')} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm bg-white">
                  <option value="">Select Category</option>
                  {(catData||[]).map(c=><option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Brand</label>
                <input value={form.brand} onChange={f('brand')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm"/>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900">Pricing & Inventory</h3>
            <div className="grid grid-cols-3 gap-4">
              {[['price','MRP *','number'],['salePrice','Sale Price','number'],['stock','Stock *','number']].map(([k,l,t])=>(
                <div key={k}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{l}</label>
                  <input type={t} value={form[k]} onChange={f(k)} required={l.includes('*')} min="0"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm"/>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[['sku','SKU'],['tags','Tags (comma separated)']].map(([k,l])=>(
                <div key={k}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{l}</label>
                  <input value={form[k]} onChange={f(k)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm"/>
                </div>
              ))}
            </div>
          </div>

          {/* Images */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Product Images</h3>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all">
              <Upload size={24} className="text-gray-400 mb-2"/>
              <p className="text-sm text-gray-500">Click to upload images</p>
              <input type="file" accept="image/*" multiple className="hidden" onChange={e=>setImages(Array.from(e.target.files))}/>
            </label>
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {images.map((img,i)=>(
                  <div key={i} className="relative">
                    <img src={URL.createObjectURL(img)} alt="" className="w-16 h-16 object-cover rounded-xl"/>
                    <button type="button" onClick={()=>setImages(p=>p.filter((_,j)=>j!==i))}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <X size={10} className="text-white"/>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Specs */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Specifications</h3>
              <button type="button" onClick={()=>setSpecs(p=>[...p,{key:'',value:''}])}
                className="flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:text-indigo-700">
                <Plus size={15}/> Add
              </button>
            </div>
            {specs.map((s,i)=>(
              <div key={i} className="flex gap-3 mb-2">
                <input value={s.key} onChange={e=>setSpecs(p=>p.map((x,j)=>j===i?{...x,key:e.target.value}:x))}
                  placeholder="Key (e.g. Material)" className="flex-1 px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm"/>
                <input value={s.value} onChange={e=>setSpecs(p=>p.map((x,j)=>j===i?{...x,value:e.target.value}:x))}
                  placeholder="Value" className="flex-1 px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm"/>
                <button type="button" onClick={()=>setSpecs(p=>p.filter((_,j)=>j!==i))}
                  className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500">
                  <X size={15}/>
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={()=>navigate('/admin/products')} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl text-sm font-medium hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
              {mutation.isPending ? 'Creating...' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  )
}
""")

write("frontend/src/pages/admin/EditProduct.jsx", """
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import AdminLayout from '../../components/admin/AdminLayout'
import Skeleton from '../../components/ui/Skeleton'

export default function EditProduct() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [form, setForm] = useState({name:'',description:'',price:'',salePrice:'',stock:'',brand:'',tags:''})
  const [specs, setSpecs] = useState([])

  const { data: product, isLoading } = useQuery({
    queryKey: ['product-admin', id],
    queryFn: () => api.get(`/products/${id}`).then(r => r.data?.product || r.data),
    onSuccess: (p) => {
      setForm({ name:p.name||'', description:p.description||'', price:p.price||'', salePrice:p.salePrice||'', stock:p.stock||'', brand:p.brand||'', tags:p.tags?.join(',')||'' })
      setSpecs(p.specifications?.length ? p.specifications : [{key:'',value:''}])
    }
  })

  const mutation = useMutation({
    mutationFn: (data) => api.put(`/products/${id}`, data),
    onSuccess: () => { toast.success('Product updated!'); qc.invalidateQueries({queryKey:['admin-products']}); navigate('/admin/products') },
    onError: (e) => toast.error(e?.response?.data?.message||'Failed'),
  })

  const { data: catData } = useQuery({ queryKey:['categories'], queryFn: ()=>api.get('/categories').then(r=>r.data?.categories||[]) })

  const handleSubmit = (e) => {
    e.preventDefault()
    mutation.mutate({ ...form, specifications: specs.filter(s=>s.key&&s.value) })
  }

  const f = (k) => (e) => setForm(p=>({...p,[k]:e.target.value}))

  if(isLoading) return <AdminLayout title="Edit Product"><div className="space-y-4 max-w-3xl">{[...Array(3)].map((_,i)=><Skeleton key={i} className="h-40 rounded-2xl"/>)}</div></AdminLayout>

  return (
    <AdminLayout title="Edit Product">
      <div className="max-w-3xl">
        <button onClick={()=>navigate('/admin/products')} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm font-medium">
          <ArrowLeft size={18}/> Back
        </button>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900">Edit Product</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
              <input value={form.name} onChange={f('name')} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <textarea value={form.description} onChange={f('description')} rows={4} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm resize-none"/>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[['price','MRP *'],['salePrice','Sale Price'],['stock','Stock *']].map(([k,l])=>(
                <div key={k}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{l}</label>
                  <input type="number" value={form[k]} onChange={f(k)} required={l.includes('*')} min="0"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm"/>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Brand</label>
                <input value={form.brand} onChange={f('brand')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tags</label>
                <input value={form.tags} onChange={f('tags')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm"/>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Specifications</h3>
              <button type="button" onClick={()=>setSpecs(p=>[...p,{key:'',value:''}])} className="flex items-center gap-1.5 text-sm text-indigo-600 font-medium">
                <Plus size={15}/> Add
              </button>
            </div>
            {specs.map((s,i)=>(
              <div key={i} className="flex gap-3 mb-2">
                <input value={s.key} onChange={e=>setSpecs(p=>p.map((x,j)=>j===i?{...x,key:e.target.value}:x))} placeholder="Key" className="flex-1 px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm"/>
                <input value={s.value} onChange={e=>setSpecs(p=>p.map((x,j)=>j===i?{...x,value:e.target.value}:x))} placeholder="Value" className="flex-1 px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm"/>
                <button type="button" onClick={()=>setSpecs(p=>p.filter((_,j)=>j!==i))} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500"><X size={15}/></button>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={()=>navigate('/admin/products')} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl text-sm font-medium">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
              {mutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  )
}
""")

write("frontend/src/pages/admin/Categories.jsx", """
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Trash2, Grid3X3 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import AdminLayout from '../../components/admin/AdminLayout'
import Modal from '../../components/ui/Modal'
import Skeleton from '../../components/ui/Skeleton'

export default function Categories() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name:'', description:'', sortOrder:0 })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => api.get('/categories').then(r => r.data?.categories || r.data || []),
  })

  const saveMutation = useMutation({
    mutationFn: (d) => editing ? api.put(`/categories/${editing}`, d) : api.post('/categories', d),
    onSuccess: () => { qc.invalidateQueries({queryKey:['admin-categories']}); toast.success(editing?'Updated!':'Created!'); closeModal() },
    onError: (e) => toast.error(e?.response?.data?.message||'Failed'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/categories/${id}`),
    onSuccess: () => { qc.invalidateQueries({queryKey:['admin-categories']}); toast.success('Deleted') },
    onError: () => toast.error('Cannot delete — products exist in this category'),
  })

  const openAdd = () => { setEditing(null); setForm({name:'',description:'',sortOrder:0}); setShowModal(true) }
  const openEdit = (c) => { setEditing(c._id); setForm({name:c.name,description:c.description||'',sortOrder:c.sortOrder||0}); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditing(null) }

  const categories = data || []

  return (
    <AdminLayout title="Categories">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">{categories.length} categories</p>
        <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700">
          <Plus size={16}/> Add Category
        </button>
      </div>

      {isLoading && <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{[...Array(6)].map((_,i)=><Skeleton key={i} className="h-24 rounded-2xl"/>)}</div>}

      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map(c=>(
            <div key={c._id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center mb-3">
                  {c.image ? <img src={c.image} alt="" className="w-full h-full object-cover rounded-xl"/> : <Grid3X3 size={18} className="text-indigo-600"/>}
                </div>
                <div className="flex gap-1">
                  <button onClick={()=>openEdit(c)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600"><Edit2 size={13}/></button>
                  <button onClick={()=>{ if(confirm('Delete?')) deleteMutation.mutate(c._id) }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 size={13}/></button>
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">{c.name}</h3>
              {c.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{c.description}</p>}
              <p className="text-xs text-gray-400 mt-2">{c.productCount||0} products</p>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={closeModal} title={editing?'Edit Category':'Add Category'}>
        <form onSubmit={(e)=>{ e.preventDefault(); saveMutation.mutate(form) }} className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
            <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} required className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={3} className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm resize-none"/>
          </div>
          <button type="submit" disabled={saveMutation.isPending} className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
            {saveMutation.isPending?'Saving...':editing?'Update':'Create Category'}
          </button>
        </form>
      </Modal>
    </AdminLayout>
  )
}
""")

write("frontend/src/pages/admin/Orders.jsx", """
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
""")

write("frontend/src/pages/admin/Customers.jsx", """
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, UserCheck, UserX } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import AdminLayout from '../../components/admin/AdminLayout'
import DataTable from '../../components/admin/DataTable'
import Modal from '../../components/ui/Modal'

export default function Customers() {
  const qc = useQueryClient()
  const [selected, setSelected] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-customers'],
    queryFn: () => api.get('/admin/users').then(r => r.data?.users || r.data || []),
  })

  const toggleMutation = useMutation({
    mutationFn: ({id,active}) => api.patch(`/admin/users/${id}`, { isActive: active }),
    onSuccess: () => { qc.invalidateQueries({queryKey:['admin-customers']}); toast.success('Updated!') },
  })

  const columns = [
    { key:'avatar', label:'', render:(v,row)=>(
      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm overflow-hidden">
        {v ? <img src={v} alt="" className="w-full h-full object-cover"/> : row.name?.charAt(0).toUpperCase()}
      </div>
    )},
    { key:'name', label:'Name', render:(v)=><span className="font-medium text-gray-900">{v}</span> },
    { key:'email', label:'Email', render:(v)=><span className="text-gray-500 text-sm">{v}</span> },
    { key:'phone', label:'Phone', render:(v)=><span className="text-gray-500 text-sm">{v||'—'}</span> },
    { key:'ordersCount', label:'Orders', render:(v)=><span className="font-semibold text-gray-900">{v||0}</span> },
    { key:'isActive', label:'Status', render:(v)=>(
      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${v?'bg-green-100 text-green-700':'bg-red-100 text-red-600'}`}>{v?'Active':'Blocked'}</span>
    )},
    { key:'createdAt', label:'Joined', render:(v)=>new Date(v).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) },
  ]

  return (
    <AdminLayout title="Customers">
      <div className="mb-4">
        <p className="text-sm text-gray-500">{(data||[]).length} total customers</p>
      </div>
      <DataTable columns={columns} data={data||[]} isLoading={isLoading} emptyText="No customers found"
        actions={(row)=>(
          <div className="flex gap-1">
            <button onClick={()=>setSelected(row)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600"><Eye size={15}/></button>
            <button onClick={()=>toggleMutation.mutate({id:row._id,active:!row.isActive})}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${row.isActive?'hover:bg-red-50 text-gray-400 hover:text-red-500':'hover:bg-green-50 text-gray-400 hover:text-green-600'}`}>
              {row.isActive?<UserX size={15}/>:<UserCheck size={15}/>}
            </button>
          </div>
        )}
      />
      <Modal isOpen={!!selected} onClose={()=>setSelected(null)} title="Customer Detail">
        {selected && (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-700 overflow-hidden">
                {selected.avatar?<img src={selected.avatar} alt="" className="w-full h-full object-cover"/>:selected.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{selected.name}</h3>
                <p className="text-sm text-gray-500">{selected.email}</p>
              </div>
            </div>
            {[['Phone',selected.phone||'Not provided'],['Orders',selected.ordersCount||0],['Total Spent',`₹${(selected.totalSpent||0).toLocaleString('en-IN')}`],['Joined',new Date(selected.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})]].map(([k,v])=>(
              <div key={k} className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">{k}</span>
                <span className="text-sm font-medium text-gray-900">{v}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </AdminLayout>
  )
}
""")

write("frontend/src/pages/admin/Reviews.jsx", """
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
    queryFn: () => api.get('/admin/reviews', { params:{ status:filter } }).then(r => r.data?.reviews || r.data || []),
  })

  const actionMutation = useMutation({
    mutationFn: ({id,action}) => api.put(`/reviews/${id}/${action}`),
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
""")

write("frontend/src/pages/admin/Coupons.jsx", """
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Tag, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import AdminLayout from '../../components/admin/AdminLayout'
import Modal from '../../components/ui/Modal'
import Skeleton from '../../components/ui/Skeleton'

const EMPTY = { code:'', type:'percentage', value:'', minOrder:'', maxUses:'', expiresAt:'', isActive:true }

export default function Coupons() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: () => api.get('/coupons/admin').then(r => r.data?.coupons || r.data || []),
  })

  const createMutation = useMutation({
    mutationFn: (d) => api.post('/coupons', d),
    onSuccess: () => { qc.invalidateQueries({queryKey:['admin-coupons']}); toast.success('Coupon created!'); setShowModal(false); setForm(EMPTY) },
    onError: (e) => toast.error(e?.response?.data?.message||'Failed'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/coupons/${id}`),
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
        {coupons.map(c=>(
          <div key={c._id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Tag size={18} className="text-amber-600"/>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 font-mono tracking-wide">{c.code}</span>
                <button onClick={()=>{navigator.clipboard.writeText(c.code);toast.success('Copied!')}} className="text-gray-400 hover:text-gray-600"><Copy size={12}/></button>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.isActive?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>{c.isActive?'Active':'Inactive'}</span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                {c.type==='percentage'?`${c.value}% off`:`₹${c.value} off`}
                {c.minOrder?` · Min ₹${c.minOrder}`:''}
                {c.maxUses?` · ${c.usedCount||0}/${c.maxUses} used`:''}
                {c.expiresAt?` · Expires ${new Date(c.expiresAt).toLocaleDateString('en-IN')}` : ''}
              </p>
            </div>
            <button onClick={()=>{ if(confirm('Delete?')) deleteMutation.mutate(c._id) }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
              <Trash2 size={15}/>
            </button>
          </div>
        ))}
      </div>

      <Modal isOpen={showModal} onClose={()=>setShowModal(false)} title="Create Coupon">
        <form onSubmit={(e)=>{ e.preventDefault(); createMutation.mutate(form) }} className="p-4 space-y-3">
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
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Expiry Date</label>
            <input type="date" value={form.expiresAt} onChange={f('expiresAt')} min={new Date().toISOString().split('T')[0]} className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm"/>
          </div>
          <button type="submit" disabled={createMutation.isPending} className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
            {createMutation.isPending?'Creating...':'Create Coupon'}
          </button>
        </form>
      </Modal>
    </AdminLayout>
  )
}
""")

write("frontend/src/pages/admin/Banners.jsx", """
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Eye, EyeOff, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import AdminLayout from '../../components/admin/AdminLayout'
import Modal from '../../components/ui/Modal'
import Skeleton from '../../components/ui/Skeleton'

export default function Banners() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title:'', subtitle:'', link:'', sortOrder:0 })
  const [imageFile, setImageFile] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: () => api.get('/banners').then(r => r.data?.banners || r.data || []),
  })

  const createMutation = useMutation({
    mutationFn: (fd) => api.post('/banners', fd, { headers:{'Content-Type':'multipart/form-data'} }),
    onSuccess: () => { qc.invalidateQueries({queryKey:['admin-banners']}); toast.success('Banner created!'); setShowModal(false); setForm({title:'',subtitle:'',link:'',sortOrder:0}); setImageFile(null) },
    onError: (e) => toast.error(e?.response?.data?.message||'Failed'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/banners/${id}`),
    onSuccess: () => { qc.invalidateQueries({queryKey:['admin-banners']}); toast.success('Deleted') },
  })
  const toggleMutation = useMutation({
    mutationFn: ({id,active}) => api.patch(`/banners/${id}`, { isActive: active }),
    onSuccess: () => qc.invalidateQueries({queryKey:['admin-banners']}),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const fd = new FormData()
    Object.entries(form).forEach(([k,v])=>v!==''&&fd.append(k,v))
    if(imageFile) fd.append('image', imageFile)
    createMutation.mutate(fd)
  }

  const banners = data || []

  return (
    <AdminLayout title="Banners">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">{banners.length} banners</p>
        <button onClick={()=>setShowModal(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700">
          <Plus size={16}/> Add Banner
        </button>
      </div>

      {isLoading && <div className="space-y-3">{[...Array(3)].map((_,i)=><Skeleton key={i} className="h-32 rounded-2xl"/>)}</div>}

      <div className="space-y-3">
        {banners.map(b=>(
          <div key={b._id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="flex items-center gap-4 p-4">
              {b.image && <img src={b.image} alt={b.title} className="w-32 h-16 object-cover rounded-xl flex-shrink-0"/>}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900">{b.title}</h3>
                {b.subtitle && <p className="text-sm text-gray-500 mt-0.5">{b.subtitle}</p>}
                {b.link && <p className="text-xs text-indigo-500 mt-1 truncate">{b.link}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full ${b.isActive?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>{b.isActive?'Active':'Hidden'}</span>
                <button onClick={()=>toggleMutation.mutate({id:b._id,active:!b.isActive})} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                  {b.isActive?<EyeOff size={15}/>:<Eye size={15}/>}
                </button>
                <button onClick={()=>{ if(confirm('Delete?')) deleteMutation.mutate(b._id) }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                  <Trash2 size={15}/>
                </button>
              </div>
            </div>
          </div>
        ))}
        {!isLoading && banners.length===0 && <div className="text-center py-16 bg-white rounded-2xl border border-gray-100"><p className="text-gray-400">No banners yet</p></div>}
      </div>

      <Modal isOpen={showModal} onClose={()=>setShowModal(false)} title="Add Banner">
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {[['title','Title *'],['subtitle','Subtitle'],['link','Link URL']].map(([k,l])=>(
            <div key={k}>
              <label className="block text-xs font-medium text-gray-700 mb-1">{l}</label>
              <input value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} required={l.includes('*')} className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm"/>
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Banner Image</label>
            {imageFile ? (
              <div className="relative inline-block">
                <img src={URL.createObjectURL(imageFile)} alt="" className="h-24 rounded-xl object-cover"/>
                <button type="button" onClick={()=>setImageFile(null)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"><X size={10} className="text-white"/></button>
              </div>
            ) : (
              <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all">
                <Upload size={16} className="text-gray-400"/><span className="text-sm text-gray-500">Upload image</span>
                <input type="file" accept="image/*" className="hidden" onChange={e=>setImageFile(e.target.files[0])}/>
              </label>
            )}
          </div>
          <button type="submit" disabled={createMutation.isPending} className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
            {createMutation.isPending?'Creating...':'Create Banner'}
          </button>
        </form>
      </Modal>
    </AdminLayout>
  )
}
""")

write("frontend/src/pages/admin/Analytics.jsx", """
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { TrendingUp, ShoppingBag, Users, Package } from 'lucide-react'
import api from '../../services/api'
import AdminLayout from '../../components/admin/AdminLayout'
import StatsCard from '../../components/admin/StatsCard'
import Skeleton from '../../components/ui/Skeleton'

export default function Analytics() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => api.get('/admin/analytics').then(r => r.data?.data || r.data),
  })

  const stats = data?.stats || {}
  const revenueData = data?.revenueByMonth || []
  const topProducts = data?.topProducts || []
  const ordersTrend = data?.ordersTrend || []

  return (
    <AdminLayout title="Analytics">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {isLoading ? [...Array(4)].map((_,i)=><Skeleton key={i} className="h-28 rounded-2xl"/>) : (
          <>
            <StatsCard title="Total Revenue" value={stats.totalRevenue||0} icon={TrendingUp} color="indigo" prefix="₹"/>
            <StatsCard title="Total Orders" value={stats.totalOrders||0} icon={ShoppingBag} color="amber"/>
            <StatsCard title="Total Customers" value={stats.totalCustomers||0} icon={Users} color="green"/>
            <StatsCard title="Avg Order Value" value={stats.avgOrderValue||0} icon={Package} color="purple" prefix="₹"/>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Revenue by Month</h3>
          {isLoading ? <Skeleton className="h-48"/> : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={revenueData}>
                <defs><linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="month" tick={{fontSize:11}} stroke="#9ca3af"/>
                <YAxis tick={{fontSize:11}} stroke="#9ca3af" tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`}/>
                <Tooltip formatter={(v)=>[`₹${v.toLocaleString('en-IN')}`, 'Revenue']} contentStyle={{borderRadius:'12px',border:'1px solid #e5e7eb'}}/>
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#rev)"/>
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Orders Trend</h3>
          {isLoading ? <Skeleton className="h-48"/> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ordersTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="month" tick={{fontSize:11}} stroke="#9ca3af"/>
                <YAxis tick={{fontSize:11}} stroke="#9ca3af"/>
                <Tooltip contentStyle={{borderRadius:'12px',border:'1px solid #e5e7eb'}}/>
                <Bar dataKey="orders" fill="#f59e0b" radius={[6,6,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Top Selling Products</h3>
        {isLoading ? <Skeleton className="h-40"/> : topProducts.length===0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No data yet</p>
        ) : (
          <div className="space-y-3">
            {topProducts.slice(0,8).map((p,i)=>(
              <div key={p._id} className="flex items-center gap-3">
                <span className="w-6 text-xs font-bold text-gray-400">#{i+1}</span>
                <img src={p.images?.[0]||'/placeholder.jpg'} alt={p.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0"/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                    <div className="bg-indigo-600 h-1.5 rounded-full" style={{width:`${(p.soldCount/topProducts[0]?.soldCount*100)||0}%`}}/>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-gray-900">{p.soldCount} sold</p>
                  <p className="text-xs text-gray-400">₹{(p.revenue||0).toLocaleString('en-IN')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
""")

write("frontend/src/pages/admin/Settings.jsx", """
import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Save, Store, Mail, Phone, Globe } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import AdminLayout from '../../components/admin/AdminLayout'

export default function Settings() {
  const [form, setForm] = useState({ storeName:'MyShop', storeEmail:'', storePhone:'', storeAddress:'', currency:'INR', deliveryFee:'50', freeDeliveryAbove:'500', taxRate:'18', maintenanceMode:false })

  useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => api.get('/admin/settings').then(r => r.data?.settings || r.data),
    onSuccess: (d) => d && setForm(p => ({...p,...d})),
  })

  const mutation = useMutation({
    mutationFn: (d) => api.put('/admin/settings', d),
    onSuccess: () => toast.success('Settings saved!'),
    onError: () => toast.error('Failed to save'),
  })

  const f = (k) => (e) => setForm(p => ({...p, [k]: e.target.type==='checkbox'?e.target.checked:e.target.value}))

  const SECTIONS = [
    { icon: Store, title: 'Store Information', fields: [
      { key:'storeName', label:'Store Name' },
      { key:'storeEmail', label:'Store Email', type:'email' },
      { key:'storePhone', label:'Store Phone' },
      { key:'storeAddress', label:'Store Address' },
    ]},
    { icon: Globe, title: 'Commerce Settings', fields: [
      { key:'currency', label:'Currency' },
      { key:'deliveryFee', label:'Delivery Fee (₹)', type:'number' },
      { key:'freeDeliveryAbove', label:'Free Delivery Above (₹)', type:'number' },
      { key:'taxRate', label:'Tax Rate (%)', type:'number' },
    ]},
  ]

  return (
    <AdminLayout title="Settings">
      <div className="max-w-2xl space-y-4">
        {SECTIONS.map(({ icon: Icon, title, fields }) => (
          <div key={title} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Icon size={18} className="text-indigo-500"/> {title}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {fields.map(({ key, label, type='text' }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                  <input type={type} value={form[key]} onChange={f(key)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm"/>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="bg-white rounded-2xl border border-amber-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Maintenance</h3>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className={`w-11 h-6 rounded-full transition-colors relative ${form.maintenanceMode?'bg-amber-500':'bg-gray-200'}`} onClick={()=>setForm(p=>({...p,maintenanceMode:!p.maintenanceMode}))}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.maintenanceMode?'translate-x-6':'translate-x-1'}`}/>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">Maintenance Mode</p>
              <p className="text-xs text-gray-500">Disable store for customers</p>
            </div>
          </label>
        </div>

        <button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60">
          <Save size={16}/> {mutation.isPending?'Saving...':'Save All Settings'}
        </button>
      </div>
    </AdminLayout>
  )
}
""")

print("\n✅ ALL DONE!\n")
print("Files created:")
print("\nSERVICES (5):")
for s in ['user','address','wishlist','notification','loyalty']:
    print(f"  frontend/src/services/{s}.service.js")
print("\nCUSTOMER PAGES (5):")
for p in ['Profile','Addresses','Wishlist','Notifications','LoyaltyPoints']:
    print(f"  frontend/src/pages/customer/{p}.jsx")
print("\nADMIN COMPONENTS (5):")
for c in ['AdminLayout','AdminSidebar','AdminHeader','StatsCard','DataTable']:
    print(f"  frontend/src/components/admin/{c}.jsx")
print("\nADMIN PAGES (12):")
for p in ['Dashboard','Products','AddProduct','EditProduct','Categories','Orders','Customers','Reviews','Coupons','Banners','Analytics','Settings']:
    print(f"  frontend/src/pages/admin/{p}.jsx")
print("\n🔥 Total: 27 files. Browser check karo!")
