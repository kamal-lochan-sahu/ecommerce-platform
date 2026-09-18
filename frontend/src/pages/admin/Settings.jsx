import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Save, Store, Globe, Loader } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import AdminLayout from '../../components/admin/AdminLayout'

const DEFAULT_SETTINGS = {
  storeName: 'Luxora',
  storeEmail: '',
  storePhone: '',
  storeAddress: '',
  currency: 'INR',
  deliveryFee: '49',
  freeDeliveryAbove: '499',
  taxRate: '18',
  maintenanceMode: false,
}

export default function Settings() {
  const [form, setForm] = useState(DEFAULT_SETTINGS)

  const { isLoading: loadingSettings } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => api.get('/admin/settings').then(r => r.data?.data?.settings),
    onSuccess: (data) => { if (data) setForm(prev => ({ ...prev, ...data })); },
  })

  const mutation = useMutation({
    mutationFn: (d) => api.put('/admin/settings', d),
    onSuccess: () => toast.success('Settings saved!'),
    onError: (err) => {
      const msg = err?.response?.data?.message || 'Failed to save settings'
      toast.error(msg)
    },
  })

  const f = (k) => (e) => setForm(p => ({
    ...p,
    [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value
  }))

  const SECTIONS = [
    { icon: Store, title: 'Store Information', fields: [
      { key: 'storeName',    label: 'Store Name' },
      { key: 'storeEmail',   label: 'Store Email',   type: 'email' },
      { key: 'storePhone',   label: 'Store Phone' },
      { key: 'storeAddress', label: 'Store Address' },
    ]},
    { icon: Globe, title: 'Commerce Settings', fields: [
      { key: 'currency',         label: 'Currency' },
      { key: 'deliveryFee',      label: 'Delivery Fee (₹)',       type: 'number' },
      { key: 'freeDeliveryAbove',label: 'Free Delivery Above (₹)', type: 'number' },
      { key: 'taxRate',          label: 'Tax Rate (%)',           type: 'number' },
    ]},
  ]

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
                    value={form[key]}
                    onChange={f(key)}
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
              onClick={() => setForm(p => ({ ...p, maintenanceMode: !p.maintenanceMode }))}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.maintenanceMode ? 'translate-x-6' : 'translate-x-1'}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">Maintenance Mode</p>
              <p className="text-xs text-gray-500">Disable store for customers</p>
            </div>
          </label>
        </div>

        <button
          onClick={() => mutation.mutate(form)}
          disabled={mutation.isPending || loadingSettings}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60"
        >
          {mutation.isPending ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
          {mutation.isPending ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>
    </AdminLayout>
  )
}
