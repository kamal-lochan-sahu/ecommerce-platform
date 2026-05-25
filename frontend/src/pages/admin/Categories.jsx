import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Trash2, Grid3X3, ChevronDown, ChevronRight, FolderOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import AdminLayout from '../../components/admin/AdminLayout'
import Modal from '../../components/ui/Modal'
import Skeleton from '../../components/ui/Skeleton'

export default function Categories() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [expanded, setExpanded] = useState({})
  const [form, setForm] = useState({ name: '', description: '', parent: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => api.get('/categories').then(r => r.data?.data?.categories || []),
  })

  const saveMutation = useMutation({
    mutationFn: (d) => editing ? api.put(`/categories/${editing}`, d) : api.post('/categories', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-categories'] })
      toast.success(editing ? 'Updated!' : 'Created!')
      closeModal()
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/categories/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-categories'] }); toast.success('Deleted') },
    onError: () => toast.error('Cannot delete — products exist in this category'),
  })

  const allCategories = data || []
  const parents  = allCategories.filter(c => !c.parent)
  const children = allCategories.filter(c => c.parent)

  const getChildren = (parentId) =>
    children.filter(c => (c.parent?._id || c.parent) === parentId)

  const openAddTop    = () => { setEditing(null); setForm({ name: '', description: '', parent: '' }); setShowModal(true) }
  const openAddChild  = (parentId) => { setEditing(null); setForm({ name: '', description: '', parent: parentId }); setShowModal(true) }
  const openEdit      = (c) => { setEditing(c._id); setForm({ name: c.name, description: c.description || '', parent: c.parent?._id || c.parent || '' }); setShowModal(true) }
  const closeModal    = () => { setShowModal(false); setEditing(null) }
  const toggleExpand  = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }))

  return (
    <AdminLayout title="Categories">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500"><span className="font-medium">{parents.length}</span> categories &nbsp;·&nbsp; <span className="font-medium">{children.length}</span> subcategories</p>
        <button onClick={openAddTop} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700">
          <Plus size={16} /> Add Parent Category
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      )}

      {/* Category Tree */}
      {!isLoading && (
        <div className="space-y-4">
          {parents.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <FolderOpen size={40} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No categories yet. Add your first category!</p>
            </div>
          )}

          {parents.map(parent => {
            const subs = getChildren(parent._id)
            const isOpen = expanded[parent._id] !== false // default open

            return (
              <div key={parent._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

                {/* Parent Row */}
                <div className="flex items-center gap-3 px-4 py-4 hover:bg-gray-50 cursor-pointer" onClick={() => toggleExpand(parent._id)}>
                  <button className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    {parent.image
                      ? <img src={parent.image} alt="" className="w-full h-full object-cover rounded-xl" />
                      : <Grid3X3 size={16} className="text-indigo-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm">{parent.name}</h3>
                    {parent.description && <p className="text-xs text-gray-400 truncate">{parent.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{subs.length} sub</span>
                    <button
                      onClick={e => { e.stopPropagation(); openAddChild(parent._id) }}
                      className="flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg font-medium"
                    >
                      <Plus size={12} /> Add Sub
                    </button>
                    <button onClick={e => { e.stopPropagation(); openEdit(parent) }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); if (confirm('Delete category?')) deleteMutation.mutate(parent._id) }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Subcategories */}
                {isOpen && (
                  <div className="border-t border-gray-50">
                    {subs.length === 0 ? (
                      <div className="pl-16 pr-4 py-3 text-xs text-gray-400 italic">
                        No subcategories yet —
                        <button onClick={() => openAddChild(parent._id)} className="text-indigo-500 hover:underline ml-1">add one</button>
                      </div>
                    ) : (
                      subs.map((sub, idx) => (
                        <div key={sub._id} className={`flex items-center gap-3 pl-14 pr-4 py-3 hover:bg-gray-50 ${idx !== subs.length - 1 ? 'border-b border-gray-50' : ''}`}>
                          <div className="w-2 h-2 rounded-full bg-indigo-300 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800">{sub.name}</p>
                            {sub.description && <p className="text-xs text-gray-400 truncate">{sub.description}</p>}
                          </div>
                          <span className="text-xs text-gray-400">{sub.productCount || 0} products</span>
                          <button onClick={() => openEdit(sub)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(sub._id) }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={showModal} onClose={closeModal} title={editing ? 'Edit Category' : form.parent ? 'Add Subcategory' : 'Add Category'}>
        <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form) }} className="p-4 space-y-4">
          {form.parent && !editing && (
            <div className="bg-indigo-50 text-indigo-700 text-xs px-3 py-2 rounded-xl">
              Adding under: <strong>{parents.find(p => p._id === form.parent)?.name}</strong>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
            <input
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              required
              placeholder={form.parent ? 'e.g. Mobile Phones' : 'e.g. Electronics'}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={2}
              placeholder="Short description (optional)"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
          >
            {saveMutation.isPending ? 'Saving...' : editing ? 'Update Category' : form.parent ? 'Create Subcategory' : 'Create Category'}
          </button>
        </form>
      </Modal>

    </AdminLayout>
  )
}
