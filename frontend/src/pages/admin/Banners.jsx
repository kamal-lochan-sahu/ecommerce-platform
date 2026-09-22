import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Eye, EyeOff, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import AdminLayout from '../../components/admin/AdminLayout'
import Modal from '../../components/ui/Modal'
import Skeleton from '../../components/ui/Skeleton'

const TYPE_OPTIONS = ['hero', 'promotional', 'category', 'popup']
const POSITION_OPTIONS = ['home_top', 'home_middle', 'sidebar', 'popup']

export default function Banners() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    title: '', subtitle: '', link: '',
    type: 'hero', position: 'home_top', isActive: true, sortOrder: 0,
  })
  const [imageFile, setImageFile] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: () => api.get('/banners').then(r => r.data?.data || []),
  })

  const createMutation = useMutation({
    mutationFn: (fd) => api.post('/banners', fd, { headers:{'Content-Type':'multipart/form-data'} }),
    onSuccess: () => {
      qc.invalidateQueries({queryKey:['admin-banners']})
      toast.success('Banner created!')
      setShowModal(false)
      setForm({ title:'', subtitle:'', link:'', type:'hero', position:'home_top', isActive:true, sortOrder:0 })
      setImageFile(null)
    },
    onError: (e) => toast.error(e?.response?.data?.message||'Failed'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/banners/${id}`),
    onSuccess: () => { qc.invalidateQueries({queryKey:['admin-banners']}); toast.success('Deleted') },
  })
  const toggleMutation = useMutation({
    mutationFn: ({id,active}) => api.put(`/banners/${id}`, { isActive: active }),
    onSuccess: () => qc.invalidateQueries({queryKey:['admin-banners']}),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const fd = new FormData()
    Object.entries(form).forEach(([k,v]) => { if (v !== '') fd.append(k, v) })
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
                <p className="text-xs text-gray-400 mt-1">{b.type} · {b.position} · order {b.sortOrder ?? 0}</p>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select
                value={form.type}
                onChange={e=>setForm(p=>({...p,type:e.target.value}))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm"
              >
                {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Position</label>
              <select
                value={form.position}
                onChange={e=>setForm(p=>({...p,position:e.target.value}))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm"
              >
                {POSITION_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Sort Order</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={e=>setForm(p=>({...p,sortOrder:Number(e.target.value)}))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer pb-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={e=>setForm(p=>({...p,isActive:e.target.checked}))}
                className="rounded text-indigo-600"
              />
              <span className="text-sm text-gray-700">Active (visible now)</span>
            </label>
          </div>

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
