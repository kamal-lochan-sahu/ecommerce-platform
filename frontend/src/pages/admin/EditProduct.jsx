import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, X, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import AdminLayout from '../../components/admin/AdminLayout'
import Skeleton from '../../components/ui/Skeleton'

const EMPTY = { name:'', description:'', comparePrice:'', price:'', stock:'', category:'', brand:'', sku:'', tags:'' }

// Edit form AddProduct ke same fields rakhta hai. Backend PUT /products/:id multipart leta hai
// (naye images ke liye), isliye yahan bhi FormData bhejte hain.
export default function EditProduct() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [form, setForm] = useState(EMPTY)
  const [newImages, setNewImages] = useState([])
  const [specs, setSpecs] = useState([{key:'',value:''}])
  const initializedFor = useRef(null)

  const { data: catData } = useQuery({
    queryKey:['categories'],
    queryFn: ()=>api.get('/categories').then(r=>r.data?.data?.categories || []),
  })

  // gcTime:0 -> purana cache nahi, hamesha taaza product (stock orders se badal chuka ho sakta hai)
  const { data: product, isLoading } = useQuery({
    queryKey: ['product-admin', id],
    queryFn: () => api.get(`/products/id/${id}`).then(r => r.data?.data?.product),
    gcTime: 0,
    refetchOnWindowFocus: false,
  })

  // TanStack Query v5 mein useQuery ka onSuccess hata diya gaya hai, isliye form yahan bharte hain.
  // initializedFor se sirf ek baar bharta hai, taaki user ki typing overwrite na ho.
  useEffect(() => {
    if (!product || initializedFor.current === product._id) return
    initializedFor.current = product._id
    setForm({
      name: product.name || '',
      description: product.description || '',
      comparePrice: product.comparePrice ? String(product.comparePrice) : '',
      price: product.price ?? '',
      stock: product.stock ?? '',
      category: product.category?._id || product.category || '',
      brand: product.brand || '',
      sku: product.sku || '',
      tags: (product.tags || []).join(', '),
    })
    const existing = (product.specifications || []).map(s => ({ key: s.key || '', value: s.value || '' }))
    setSpecs(existing.length ? existing : [{key:'',value:''}])
  }, [product])

  const mutation = useMutation({
    mutationFn: (fd) => api.put(`/products/${id}`, fd, { headers:{'Content-Type':'multipart/form-data'} }),
    onSuccess: () => {
      toast.success('Product updated!')
      qc.invalidateQueries({queryKey:['admin-products']})
      qc.invalidateQueries({queryKey:['product-admin', id]})
      navigate('/admin/products')
    },
    onError: (e) => toast.error(e?.response?.data?.message||'Failed'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const fd = new FormData()
    fd.append('name', form.name)
    fd.append('description', form.description)
    fd.append('category', form.category)
    fd.append('brand', form.brand)            // khaali bhi chalta hai (backend allow('') karta hai)
    fd.append('price', form.price)
    fd.append('comparePrice', form.comparePrice || '0')  // khaali = MRP hata diya
    fd.append('stock', form.stock)
    if (form.sku) fd.append('sku', form.sku)  // sku unique+sparse hai, '' bhejna duplicate de sakta hai
    // tags/specifications hamesha bhejte hain (khaali array bhi), taaki admin unhe saaf kar sake.
    // Backend ka parseJsonFields inhe wapas array banata hai.
    const tagsArr = form.tags.split(',').map(t=>t.trim()).filter(Boolean)
    fd.append('tags', JSON.stringify(tagsArr))
    fd.append('specifications', JSON.stringify(specs.filter(s=>s.key&&s.value)))
    newImages.forEach(img=>fd.append('images',img))
    mutation.mutate(fd)
  }

  const f = (k) => (e) => setForm(p=>({...p,[k]:e.target.value}))

  if (isLoading) return <AdminLayout title="Edit Product"><div className="space-y-4 max-w-3xl">{[...Array(3)].map((_,i)=><Skeleton key={i} className="h-40 rounded-2xl"/>)}</div></AdminLayout>

  if (!product) return (
    <AdminLayout title="Edit Product">
      <div className="max-w-3xl">
        <button onClick={()=>navigate('/admin/products')} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm font-medium">
          <ArrowLeft size={18}/> Back to Products
        </button>
        <p className="text-sm text-gray-500">Product not found.</p>
      </div>
    </AdminLayout>
  )

  return (
    <AdminLayout title="Edit Product">
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description *</label>
              <textarea value={form.description} onChange={f('description')} rows={4} required minLength={10} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm resize-none"/>
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
            {product.images?.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">Current images (naye upload inke saath jud jaate hain)</p>
                <div className="flex flex-wrap gap-2">
                  {product.images.map((src,i)=>(
                    <img key={i} src={src} alt="" className="w-16 h-16 object-cover rounded-xl border border-gray-100"/>
                  ))}
                </div>
              </div>
            )}
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all">
              <Upload size={24} className="text-gray-400 mb-2"/>
              <p className="text-sm text-gray-500">Click to add more images</p>
              <input type="file" accept="image/*" multiple className="hidden" onChange={e=>setNewImages(Array.from(e.target.files))}/>
            </label>
            {newImages.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {newImages.map((img,i)=>(
                  <div key={i} className="relative">
                    <img src={URL.createObjectURL(img)} alt="" className="w-16 h-16 object-cover rounded-xl"/>
                    <button type="button" onClick={()=>setNewImages(p=>p.filter((_,j)=>j!==i))}
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
              {mutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  )
}
