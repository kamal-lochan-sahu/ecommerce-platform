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
    queryFn: () => api.get('/products', { params:{page,limit:20,sortBy:'newest'} }).then(r => r.data?.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/products/${id}`),
    onSuccess: () => { qc.invalidateQueries({queryKey:['admin-products']}); toast.success('Deleted') },
    onError: () => toast.error('Delete failed'),
  })
  const toggleMutation = useMutation({
    mutationFn: ({id,active}) => api.put(`/products/${id}`, { isActive: active }),
    onSuccess: () => qc.invalidateQueries({queryKey:['admin-products']}),
  })

  const products = data?.products || []

  const columns = [
    { key:'images', label:'Image', render:(v)=><img src={v?.[0]||'https://placehold.co/400x400?text=Product'} alt="" className="w-10 h-10 rounded-xl object-cover"/> },
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
          <p className="text-sm text-gray-500">{data?.pagination?.total || 0} total products</p>
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
