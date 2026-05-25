import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, Plus, X, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import AdminLayout from '../../components/admin/AdminLayout'

const EMPTY = { name:'', description:'', comparePrice:'', price:'', stock:'', category:'', brand:'', sku:'', tags:'' }

export default function AddProduct() {
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [images, setImages] = useState([])
  const [specs, setSpecs] = useState([{key:'',value:''}])

  const { data: catData } = useQuery({
    queryKey:['categories'],
    queryFn: ()=>api.get('/categories').then(r=>r.data?.data?.categories || []),
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
    filteredSpecs.forEach((s,i) => { fd.append(`specifications[${i}][key]`, s.key); fd.append(`specifications[${i}][value]`, s.value) })
    // tags: string → array
    if(form.tags) {
      const tagsArr = form.tags.split(',').map(t=>t.trim()).filter(Boolean)
      fd.append('tags', JSON.stringify(tagsArr))
    }
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
              {[['comparePrice','MRP (Original Price)','number'],['price','Selling Price *','number'],['stock','Stock *','number']].map(([k,l,t])=>(
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
