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
