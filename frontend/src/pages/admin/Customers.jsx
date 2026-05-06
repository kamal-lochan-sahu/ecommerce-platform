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
