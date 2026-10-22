import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Save, Store, Globe, Loader } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import AdminLayout from '../../components/admin/AdminLayout'
import Skeleton from '../../components/ui/Skeleton'

const FIELDS = ['storeName','storeEmail','storePhone','storeAddress','currency','deliveryFee','freeDeliveryAbove','taxRate','maintenanceMode']

export default function Settings() {
  const qc = useQueryClient()
  // Form = server ki saved settings + jo admin ne abhi badla (edits).
  // TanStack Query v5 mein useQuery ka onSuccess nahi chalta; pehle yahi wajah thi ki form hamesha
  // default values (delivery 49, tax 18...) se khulta tha aur Save dabane par asli settings default se
  // overwrite ho jaati thi. Ab form tab tak khulta hi nahi jab tak asli settings load na ho jaayein.
  const [edits, setEdits] = useState({})

  const { data: saved, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => api.get('/admin/settings').then(r => r.data?.data?.settings),
  })

  const form = { ...(saved || {}), ...edits }

  const mutation = useMutation({
    mutationFn: (d) => api.put('/admin/settings', d),
    onSuccess: () => {
      setEdits({})
      qc.invalidateQueries({ queryKey: ['admin-settings'] })
      qc.invalidateQueries({ queryKey: ['public-settings-maintenance'] })
      toast.success('Settings saved!')
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to save settings'),
  })

  const set = (k, v) => setEdits(p => ({ ...p, [k]: v }))
  const dirty = Object.keys(edits).length > 0

  const save = () => {
    const payload = {}
    FIELDS.forEach(k => { if (form[k] !== undefined) payload[k] = form[k] })
    mutation.mutate(payload)
  }

  const SECTIONS = [
    { icon: Store, title: 'Store Information', fields: [
      { key: 'storeName',    label: 'Store Name' },
      { key: 'storeEmail',   label: 'Store Email',   type: 'email' },
      { key: 'storePhone',   label: 'Store Phone' },
      { key: 'storeAddress', label: 'Store Address' },
    ]},
    { icon: Globe, title: 'Commerce Settings', fields: [
      { key: 'currency',          label: 'Currency (3-letter code)' },
      { key: 'deliveryFee',       label: 'Delivery Fee (₹)',        type: 'number' },
      { key: 'freeDeliveryAbove', label: 'Free Delivery Above (₹)', type: 'number' },
      { key: 'taxRate',           label: 'Tax Rate (%)',            type: 'number' },
    ]},
  ]

  if (isLoading) return <AdminLayout title="Settings"><div className="max-w-2xl space-y-4">{[...Array(3)].map((_,i)=><Skeleton key={i} className="h-40 rounded-2xl"/>)}</div></AdminLayout>

  if (isError || !saved) return (
    <AdminLayout title="Settings">
      <div className="max-w-2xl bg-white rounded-2xl border border-red-100 p-6 text-sm">
        <p className="text-red-600 font-medium mb-1">Could not load the current settings.</p>
        <p className="text-gray-500 mb-4">Saving is disabled so your existing settings are not overwritten.</p>
        <button onClick={()=>refetch()} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700">Try again</button>
      </div>
    </AdminLayout>
  )

  return (
    <AdminLayout title="Settings">
      <div className="max-w-2xl space-y-4">

        {SECTIONS.map(({ icon: Icon, title, fields }) => (
          <div key={title} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Icon size={18} className="text-indigo-500"/> {title}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {fields.map(({ key, label, type = 'text' }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                  <input
                    type={type}
                    min={type === 'number' ? '0' : undefined}
                    value={form[key] ?? ''}
                    onChange={(e) => set(key, e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="bg-white rounded-2xl border border-amber-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Maintenance</h3>
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              className={`w-11 h-6 rounded-full transition-colors relative ${form.maintenanceMode ? 'bg-amber-500' : 'bg-gray-200'}`}
              onClick={() => set('maintenanceMode', !form.maintenanceMode)}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.maintenanceMode ? 'translate-x-6' : 'translate-x-1'}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">Maintenance Mode</p>
              <p className="text-xs text-gray-500">Shows a notice on the store and pauses new orders. Customers can still browse; this admin panel keeps working.</p>
            </div>
          </label>
        </div>

        <button
          onClick={save}
          disabled={mutation.isPending || !dirty}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {mutation.isPending ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
          {mutation.isPending ? 'Saving...' : dirty ? 'Save Settings' : 'No changes to save'}
        </button>
      </div>
    </AdminLayout>
  )
}
