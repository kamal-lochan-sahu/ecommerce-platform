import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Save, Loader, RotateCcw, ExternalLink, Plus, Trash2, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import AdminLayout from '../../components/admin/AdminLayout'
import Skeleton from '../../components/ui/Skeleton'

// Terms / Privacy / Shipping / Returns / FAQs. Jab tak admin kuch nahi badalta, text store ki Settings
// (naam, contact, delivery, return days) se khud banta hai. Badalkar save karne par custom text chalta hai;
// "Reset to default" ya default jaisa text save karne par wapas auto text.
const TABS = [
  { key: 'terms',    label: 'Terms',             field: 'policyTerms',    path: '/terms' },
  { key: 'privacy',  label: 'Privacy',           field: 'policyPrivacy',  path: '/privacy' },
  { key: 'shipping', label: 'Shipping',          field: 'policyShipping', path: '/shipping-policy' },
  { key: 'returns',  label: 'Returns & Refunds', field: 'policyReturns',  path: '/returns-policy' },
  { key: 'faqs',     label: 'FAQs',              field: 'faqs',           path: '/faq' },
]

const fetchPages = (defaults) =>
  api.get('/settings/pages', { params: defaults ? { defaults: 1 } : {} }).then((r) => r.data?.data)

const sameFaqs = (a, b) => JSON.stringify(a) === JSON.stringify(b)

export default function StorePages() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('terms')
  const [edits, setEdits] = useState({})

  const { data: effective, isLoading, isError, refetch } = useQuery({ queryKey: ['store-pages'], queryFn: () => fetchPages(false) })
  const { data: defaults } = useQuery({ queryKey: ['store-pages-defaults'], queryFn: () => fetchPages(true) })

  const mutation = useMutation({
    mutationFn: (payload) => api.put('/admin/settings', payload),
    onSuccess: (_res, payload) => {
      const saved = TABS.find((t) => t.field in payload)
      setEdits((p) => { const n = { ...p }; delete n[saved.key]; return n })
      qc.invalidateQueries({ queryKey: ['store-pages'] })
      qc.invalidateQueries({ queryKey: ['store-pages-defaults'] })
      qc.invalidateQueries({ queryKey: ['admin-settings'] })
      toast.success('Saved!')
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to save'),
  })

  if (isLoading || !defaults) return (
    <AdminLayout title="Store Pages"><div className="max-w-3xl space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-72 w-full" /></div></AdminLayout>
  )
  if (isError || !effective) return (
    <AdminLayout title="Store Pages">
      <div className="max-w-md bg-white rounded-2xl border border-gray-100 p-6 text-center space-y-3">
        <p className="text-gray-600">Could not load the store pages.</p>
        <button onClick={() => refetch()} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700">Try again</button>
      </div>
    </AdminLayout>
  )

  const current = TABS.find((t) => t.key === tab)
  const isFaq = tab === 'faqs'

  const value = edits[tab] ?? (isFaq ? effective.faqs : effective.pages[tab].content)
  const defaultValue = isFaq ? defaults.faqs : defaults.pages[tab].content
  const savedValue = isFaq ? effective.faqs : effective.pages[tab].content
  const isCustom = isFaq ? effective.faqsCustom : effective.pages[tab].custom
  const dirty = edits[tab] !== undefined && (isFaq ? !sameFaqs(edits[tab], savedValue) : edits[tab].trim() !== savedValue.trim())
  const usesDefault = isFaq ? sameFaqs(value, defaultValue) : value.trim() === defaultValue.trim()

  const setValue = (v) => setEdits((p) => ({ ...p, [tab]: v }))
  const setFaq = (i, key, v) => setValue(value.map((f, idx) => (idx === i ? { ...f, [key]: v } : f)))

  const save = () => {
    // Default jaisa text save karne par '' bhejte hain: tab pages Settings ke saath khud update hote rehte hain.
    const payload = { [current.field]: usesDefault ? (isFaq ? [] : '') : value }
    mutation.mutate(payload)
  }

  return (
    <AdminLayout title="Store Pages">
      <div className="max-w-3xl space-y-4">
        <div className="flex gap-3 bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm text-amber-800">
          <Info size={18} className="flex-shrink-0 mt-0.5" />
          <p>
            These pages start as ready-made templates filled from your store Settings (name, contact, delivery fee, return days).
            They are not legal advice: have a lawyer or CA review them before you launch. Contact details come from Settings.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${tab === t.key ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
              {t.label}{edits[t.key] !== undefined ? ' •' : ''}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-gray-600">
              {isCustom ? 'Showing your custom text.' : 'Showing the default text. It updates automatically when you change your Settings.'}
            </p>
            <a href={current.path} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline">
              View page <ExternalLink size={14} />
            </a>
          </div>

          {isFaq ? (
            <div className="space-y-3">
              {value.map((f, i) => (
                <div key={i} className="border border-gray-100 rounded-xl p-3 space-y-2">
                  <div className="flex gap-2">
                    <input value={f.question} onChange={(e) => setFaq(i, 'question', e.target.value)} placeholder="Question" maxLength={200}
                      className="flex-1 px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm" />
                    <button onClick={() => setValue(value.filter((_, idx) => idx !== i))} aria-label="Remove question"
                      className="p-2 rounded-xl text-red-500 hover:bg-red-50"><Trash2 size={16} /></button>
                  </div>
                  <textarea value={f.answer} onChange={(e) => setFaq(i, 'answer', e.target.value)} placeholder="Answer" rows={3} maxLength={2000}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm" />
                </div>
              ))}
              {value.length < 30 && (
                <button onClick={() => setValue([...value, { question: '', answer: '' }])}
                  className="inline-flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:underline"><Plus size={15} /> Add question</button>
              )}
            </div>
          ) : (
            <>
              <textarea value={value} onChange={(e) => setValue(e.target.value)} rows={22}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm font-mono leading-relaxed" />
              <p className="text-xs text-gray-500">Start a line with "## " to make a heading. Leave a blank line between paragraphs.</p>
            </>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button onClick={save} disabled={mutation.isPending || (!dirty && !(isCustom && usesDefault))}
              className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {mutation.isPending ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
              {mutation.isPending ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setValue(defaultValue)} disabled={usesDefault && !isCustom}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
              <RotateCcw size={15} /> Reset to default
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
