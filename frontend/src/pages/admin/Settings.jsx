import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Save, Store, Globe, AlertCircle, Loader } from 'lucide-react'
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
    retry: false,
    // Backend settings API not yet implemented — graceful fail
    onError: () => {},
  })

  const mutation = useMutation({
    mutationFn: (d) => api.put('/admin/settings', d),
    onSuccess: () => toast.success('Settings saved!'),
    onError: (err) => {
      const msg = err?.response?.data?.message || 'Failed to save settings'
      // 404 means backend route not yet implemented
      if (err?.response?.status === 404) {
        toast.error('Settings API not yet configured on backend')
      } else {
        toast.error(msg)
      }
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

        {/* API status notice */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Settings persistence coming soon</p>
            <p className="text-amber-700 text-xs mt-0.5">
              Changes are not yet saved to the database. Backend /api/admin/settings endpoint needs to be implemented.
            </p>
          </div>
        </div>

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
          disabled={mutation.isPending}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60"
        >
          {mutation.isPending ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
          {mutation.isPending ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>
    </AdminLayout>
  )
}
