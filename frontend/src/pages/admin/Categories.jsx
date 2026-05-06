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
