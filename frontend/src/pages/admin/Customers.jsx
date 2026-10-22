import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Eye, UserCheck, UserX, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import AdminLayout from '../../components/admin/AdminLayout'
import DataTable from '../../components/admin/DataTable'
import Modal from '../../components/ui/Modal'
import Pagination from '../../components/ui/Pagination'

function useDebounced(value, ms = 400) {
  const [v, setV] = useState(value)
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t) }, [value, ms])
  return v
}

export default function Customers() {
  const qc = useQueryClient()
  const [selected, setSelected] = useState(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('createdAt')
  const debouncedSearch = useDebounced(search.trim())

  // Search, status filter, sort aur pagination server par hote hain, taaki hazaaron customers
  // hone par bhi sab milein (pehle sirf pehle 20-100 hi dikhte the).
  const { data, isLoading } = useQuery({
    queryKey: ['admin-customers', { page, debouncedSearch, status, sort }],
    queryFn: () => api.get('/admin/customers', {
      params: { page, limit: 20, search: debouncedSearch || undefined, status: status || undefined, sort },
    }).then(r => ({
      customers: r.data?.data?.customers || [],
      total: r.data?.data?.pagination?.total || 0,
      totalPages: r.data?.data?.pagination?.totalPages || 1,
    })),
    placeholderData: keepPreviousData,
  })
  const customers = data?.customers || []

  // View modal khulte hi asli detail aati hai (stats + recent orders).
  // List wale row mein sirf ordersCount/totalSpent hain, isliye jab tak load ho wahi dikhate hain.
  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['admin-customer', selected?._id],
    queryFn: () => api.get(`/admin/customers/${selected._id}`).then(r => r.data?.data || null),
    enabled: !!selected?._id,
  })
  const ordersCount = detail?.stats?.totalOrders ?? selected?.ordersCount ?? 0
  const totalSpent = detail?.stats?.totalSpent ?? selected?.totalSpent ?? 0
  const lastOrderAt = detail?.stats?.lastOrderAt
  const recentOrders = detail?.recentOrders || []

  const toggleMutation = useMutation({
    mutationFn: ({id,active}) => api.put(`/admin/customers/${id}/status`, { isActive: active }),
    onSuccess: () => { qc.invalidateQueries({queryKey:['admin-customers']}); toast.success('Updated!') },
    onError: (e) => toast.error(e?.response?.data?.message||'Failed'),
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
      <div className="flex gap-3 flex-wrap items-center mb-4">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 w-full sm:w-72">
          <Search size={15} className="text-gray-400 flex-shrink-0"/>
          <input value={search} onChange={e=>{ setSearch(e.target.value); setPage(1) }} placeholder="Search name, email or phone"
            className="bg-transparent text-sm outline-none flex-1 text-gray-700"/>
        </div>
        <select value={status} onChange={e=>{ setStatus(e.target.value); setPage(1) }} className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white outline-none">
          <option value="">All customers</option>
          <option value="active">Active</option>
          <option value="inactive">Blocked</option>
        </select>
        <select value={sort} onChange={e=>{ setSort(e.target.value); setPage(1) }} className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white outline-none">
          <option value="createdAt">Newest first</option>
          <option value="name">Name A–Z</option>
          <option value="orders">Most orders</option>
        </select>
        <p className="text-sm text-gray-500 sm:ml-auto">{data?.total || 0} customers</p>
      </div>
      <DataTable columns={columns} data={customers} isLoading={isLoading} searchable={false} paginate={false} emptyText={debouncedSearch ? 'No customers match your search' : 'No customers found'}
        actions={(row)=>(
          <div className="flex gap-1">
            <button onClick={()=>setSelected(row)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600"><Eye size={15}/></button>
            <button title={row.isActive ? 'Block customer' : 'Unblock customer'} onClick={()=>{
                if (row.isActive && !confirm(`Block ${row.name}?\n\nThey will be signed out and will not be able to log in or place orders until you unblock them.`)) return
                toggleMutation.mutate({id:row._id,active:!row.isActive})
              }}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${row.isActive?'hover:bg-red-50 text-gray-400 hover:text-red-500':'hover:bg-green-50 text-gray-400 hover:text-green-600'}`}>
              {row.isActive?<UserX size={15}/>:<UserCheck size={15}/>}
            </button>
          </div>
        )}
      />
      <Pagination page={page} totalPages={data?.totalPages || 1} onPageChange={setPage}/>
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
            {[
              ['Phone',selected.phone||'Not provided'],
              ['Orders',ordersCount],
              ['Total Spent (paid)',`₹${totalSpent.toLocaleString('en-IN')}`],
              ...(lastOrderAt ? [['Last Order',new Date(lastOrderAt).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})]] : []),
              ['Joined',new Date(selected.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})],
            ].map(([k,v])=>(
              <div key={k} className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">{k}</span>
                <span className="text-sm font-medium text-gray-900">{v}</span>
              </div>
            ))}
            <div className="pt-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent Orders</p>
              {detailLoading ? <p className="text-sm text-gray-400">Loading...</p> : recentOrders.length === 0 ? (
                <p className="text-sm text-gray-400">No orders yet</p>
              ) : (
                <div className="space-y-1.5">
                  {recentOrders.map(o=>(
                    <div key={o._id} className="flex items-center justify-between text-sm">
                      <span className="font-mono text-gray-700">#{o.orderNumber}</span>
                      <span className="text-xs text-gray-500 capitalize">{o.orderStatus}</span>
                      <span className="font-medium text-gray-900">₹{(o.pricing?.total||0).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  )
}
