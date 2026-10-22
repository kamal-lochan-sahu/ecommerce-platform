import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Plus, Edit2, Trash2, Eye, EyeOff, Search } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../services/api'
import AdminLayout from '../../components/admin/AdminLayout'
import DataTable from '../../components/admin/DataTable'
import Pagination from '../../components/ui/Pagination'

function useDebounced(value, ms = 400) {
  const [v, setV] = useState(value)
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t) }, [value, ms])
  return v
}

const selectCls = 'px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm bg-white'

export default function Products() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('all')
  const [params] = useSearchParams()
  const [stock, setStock] = useState(params.get('stock') || '') // dashboard se /admin/products?stock=out
  const [sort, setSort] = useState('newest')
  const debouncedSearch = useDebounced(search.trim())

  // Public /products sirf active products deta hai. Admin ko inactive bhi dikhne chahiye
  // (warna hide kiya hua product wapas on karne ka koi raasta nahi), isliye alag admin endpoint.
  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', { page, debouncedSearch, category, status, stock, sort }],
    queryFn: () => api.get('/products/admin/list', {
      params: { page, limit: 20, search: debouncedSearch || undefined, category: category || undefined, status, stock: stock || undefined, sort },
    }).then(r => r.data?.data || {}),
    placeholderData: keepPreviousData,
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data?.data?.categories || []),
  })

  const refresh = () => { qc.invalidateQueries({ queryKey:['admin-products'] }); qc.invalidateQueries({ queryKey:['admin-dashboard'] }) }

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/products/${id}`),
    onSuccess: () => { refresh(); toast.success('Product deleted') },
    onError: (e) => toast.error(e?.response?.data?.message || 'Delete failed'),
  })
  const toggleMutation = useMutation({
    mutationFn: ({id,active}) => api.put(`/products/${id}`, { isActive: active }),
    onSuccess: (_, v) => { refresh(); toast.success(v.active ? 'Product is live in the store' : 'Product hidden from the store') },
    onError: (e) => toast.error(e?.response?.data?.message || 'Update failed'),
  })

  const products = data?.products || []
  const summary = data?.summary || {}

  const setFilter = (setter) => (e) => { setter(e.target.value); setPage(1) }
  const quick = (st, sk) => { setStatus(st); setStock(sk); setPage(1) }
  const chip = (active, tone='gray') => `px-3 py-1.5 rounded-full text-xs font-medium transition-all ${active
    ? 'bg-indigo-600 text-white'
    : tone==='red' ? 'bg-red-50 border border-red-200 text-red-600 hover:border-red-400'
    : tone==='amber' ? 'bg-amber-50 border border-amber-200 text-amber-700 hover:border-amber-400'
    : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-400'}`

  const columns = [
    { key:'images', label:'Image', render:(v)=><img src={v?.[0]||'https://placehold.co/400x400?text=Product'} alt="" className="w-10 h-10 rounded-xl object-cover"/> },
    { key:'name', label:'Product', render:(v,row)=>(
      <div className="max-w-xs">
        <p className="font-medium text-gray-900 truncate">{v}</p>
        {(row.sku || row.brand) && <p className="text-xs text-gray-400 truncate">{[row.brand, row.sku && `SKU ${row.sku}`].filter(Boolean).join(' · ')}</p>}
      </div>
    ) },
    { key:'category', label:'Category', render:(v)=><span className="text-gray-500 text-xs">{v?.name||'—'}</span> },
    { key:'price', label:'Price', render:(v,row)=>(
      <div>
        <p className="font-semibold">₹{v?.toLocaleString('en-IN')}</p>
        {row.comparePrice > v && <p className="text-xs text-gray-400 line-through">₹{row.comparePrice?.toLocaleString('en-IN')}</p>}
      </div>
    )},
    { key:'stock', label:'Stock', render:(v,row)=>{
      const threshold = row.lowStockThreshold ?? 10
      if (v <= 0) return <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Out of stock</span>
      if (v <= threshold) return <span className="font-medium text-amber-600">{v} <span className="text-[10px] bg-amber-100 px-1.5 py-0.5 rounded-full ml-1">LOW</span></span>
      return <span className="font-medium text-green-600">{v}</span>
    } },
    { key:'isActive', label:'Status', render:(v)=>(
      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${v?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>{v?'Active':'Hidden'}</span>
    )},
  ]

  return (
    <AdminLayout title="Products">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <button onClick={()=>quick('all','')} className={chip(status==='all' && !stock)}>All ({summary.total || 0})</button>
          <button onClick={()=>quick('active','')} className={chip(status==='active' && !stock)}>Active ({summary.active || 0})</button>
          <button onClick={()=>quick('inactive','')} className={chip(status==='inactive' && !stock)}>Hidden ({summary.inactive || 0})</button>
          <button onClick={()=>quick('all','low')} className={chip(stock==='low', 'amber')}>Low stock ({summary.lowStock || 0})</button>
          <button onClick={()=>quick('all','out')} className={chip(stock==='out', 'red')}>Out of stock ({summary.outOfStock || 0})</button>
        </div>
        <Link to="/admin/products/add" className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
          <Plus size={16}/> Add Product
        </Link>
      </div>

      <div className="flex gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 w-full sm:w-72">
          <Search size={15} className="text-gray-400 flex-shrink-0"/>
          <input value={search} onChange={e=>{ setSearch(e.target.value); setPage(1) }} placeholder="Search name, SKU or brand"
            className="bg-transparent text-sm outline-none flex-1 text-gray-700"/>
        </div>
        <select value={category} onChange={setFilter(setCategory)} className={selectCls}>
          <option value="">All categories</option>
          {(categories||[]).map(c=><option key={c._id} value={c._id}>{c.parent ? '— ' : ''}{c.name}</option>)}
        </select>
        <select value={sort} onChange={setFilter(setSort)} className={selectCls}>
          <option value="newest">Newest first</option>
          <option value="name">Name A–Z</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="stock_asc">Stock: lowest first</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={products}
        isLoading={isLoading}
        searchable={false}
        paginate={false}
        emptyText={debouncedSearch || category || stock || status !== 'all' ? 'No products match these filters' : 'No products yet'}
        actions={(row) => (
          <div className="flex items-center gap-1">
            <button onClick={()=>toggleMutation.mutate({id:row._id,active:!row.isActive})} title={row.isActive ? 'Hide from store' : 'Show in store'}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
              {row.isActive?<EyeOff size={15}/>:<Eye size={15}/>}
            </button>
            <Link to={`/admin/products/${row._id}/edit`} title="Edit" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600">
              <Edit2 size={15}/>
            </Link>
            <button title="Delete" onClick={()=>{ if(confirm(`Delete "${row.name}"?\n\nIt will disappear from the store and from this list. Past orders keep their record. (To just pause selling, use the eye button to hide it instead.)`)) deleteMutation.mutate(row._id) }}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
              <Trash2 size={15}/>
            </button>
          </div>
        )}
      />
      <p className="text-xs text-gray-400 mt-3">{data?.pagination?.total ?? 0} products shown</p>
      <Pagination page={page} totalPages={data?.pagination?.totalPages || 1} onPageChange={setPage}/>
    </AdminLayout>
  )
}
