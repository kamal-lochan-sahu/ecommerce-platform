import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, X, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import productService from '../../services/product.service'

const inputCls = 'w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm'
const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

const blankForm = (optionNames) => ({
  options: (optionNames.length ? optionNames : ['Color', 'Size']).map((name) => ({ name, value: '' })),
  price: '', comparePrice: '', stock: '', sku: '', images: [], isActive: true,
})

const formFromVariant = (v) => ({
  options: (v.options || []).map((o) => ({ name: o.name, value: o.value })),
  price: String(v.price ?? ''),
  comparePrice: v.comparePrice ? String(v.comparePrice) : '',
  stock: String(v.stock ?? 0),
  sku: v.sku || '',
  images: v.images || [],
  isActive: v.isActive !== false,
})

// Admin ke liye variants ka CRUD. Har action seedha server par save hota hai
// (product ke "Save Changes" button se alag), aur Product ka price/stock variants se derive hota hai.
export default function ProductVariantsManager({ productId, productImages = [], onChanged }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(null) // null = band, 'new' = naya, variant._id = edit
  const [form, setForm] = useState(null)

  const { data: variants = [], isLoading } = useQuery({
    queryKey: ['product-variants', productId],
    queryFn: () => productService.adminListVariants(productId).then((r) => r.data?.data?.variants || []),
    gcTime: 0,
    refetchOnWindowFocus: false,
  })

  const refresh = async () => {
    qc.invalidateQueries({ queryKey: ['product-variants', productId] })
    qc.invalidateQueries({ queryKey: ['admin-products'] })
    // Product ke derived price/stock ka taaza refetch hone tak ruko, phir parent form ko batao
    await qc.invalidateQueries({ queryKey: ['product-admin', productId] })
    onChanged?.(qc.getQueryData(['product-admin', productId]))
  }
  const onError = (e) => toast.error(e?.response?.data?.message || 'Something went wrong')

  const saveMutation = useMutation({
    mutationFn: ({ id, body }) => (id ? productService.adminUpdateVariant(productId, id, body) : productService.adminCreateVariant(productId, body)),
    onSuccess: (res) => { toast.success(res.data?.message || 'Saved'); refresh(); setEditing(null); setForm(null) },
    onError,
  })
  const toggleMutation = useMutation({
    mutationFn: (v) => productService.adminUpdateVariant(productId, v._id, { isActive: !v.isActive }),
    onSuccess: () => refresh(),
    onError,
  })
  const deleteMutation = useMutation({
    mutationFn: (v) => productService.adminDeleteVariant(productId, v._id),
    onSuccess: (res) => { toast.success(res.data?.message || 'Deleted'); refresh() },
    onError,
  })

  // Ek product ke saare ACTIVE variants same option names use karte hain (backend bhi yahi rule lagata hai)
  const others = (variants || []).filter((v) => v._id !== editing && v.isActive)
  const lockedNames = others.length > 0 ? (others[0].options || []).map((o) => o.name) : null

  const openNew = () => {
    setEditing('new')
    const firstActive = variants.find((v) => v.isActive)
    setForm(blankForm(firstActive ? firstActive.options.map((o) => o.name) : []))
  }
  const openEdit = (v) => { setEditing(v._id); setForm(formFromVariant(v)) }
  const close = () => { setEditing(null); setForm(null) }

  const setOption = (i, key, val) =>
    setForm((p) => ({ ...p, options: p.options.map((o, j) => (j === i ? { ...o, [key]: val } : o)) }))
  const toggleImage = (src) =>
    setForm((p) => ({ ...p, images: p.images.includes(src) ? p.images.filter((x) => x !== src) : [...p.images, src] }))

  const submit = () => {
    if (form.options.some((o) => !o.name.trim() || !o.value.trim())) { toast.error('Fill every option name and value (or remove the row)'); return }
    if (form.price === '' || Number(form.price) < 0) { toast.error('Enter a valid selling price'); return }
    const stock = form.stock === '' ? 0 : Number(form.stock)
    if (!Number.isInteger(stock) || stock < 0) { toast.error('Stock must be a whole number, 0 or more'); return }
    const body = {
      options: form.options.map((o) => ({ name: o.name.trim(), value: o.value.trim() })),
      price: Number(form.price),
      comparePrice: form.comparePrice === '' ? 0 : Number(form.comparePrice),
      stock,
      sku: form.sku.trim(),
      images: form.images,
      isActive: form.isActive,
    }
    saveMutation.mutate({ id: editing === 'new' ? null : editing, body })
  }

  const handleDelete = (v) => {
    if (!window.confirm(`Delete variant "${v.name}"? If it already has orders it will be deactivated instead.`)) return
    deleteMutation.mutate(v)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mt-4" id="variants">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-gray-900">Variants (size, color...)</h3>
        {editing === null && (
          <button type="button" onClick={openNew}
            className="flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:text-indigo-700">
            <Plus size={15} /> Add variant
          </button>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Variants save immediately, no need to press Save Changes. With variants, the product's price (lowest active variant), MRP and stock (total of active variants) are calculated automatically.
      </p>

      {isLoading ? (
        <p className="text-sm text-gray-400">Loading variants...</p>
      ) : variants.length === 0 && editing === null ? (
        <p className="text-sm text-gray-500 border border-dashed border-gray-200 rounded-xl p-4 text-center">
          No variants yet. Add one for each size or color if this product comes in more than one.
        </p>
      ) : (
        variants.length > 0 && (
          <div className="overflow-x-auto border border-gray-100 rounded-xl mb-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="text-left px-3 py-2">Variant</th>
                  <th className="text-left px-3 py-2">Price</th>
                  <th className="text-left px-3 py-2">Stock</th>
                  <th className="text-left px-3 py-2">Active</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {variants.map((v) => (
                  <tr key={v._id} className={v.isActive ? '' : 'bg-gray-50 text-gray-400'}>
                    <td className="px-3 py-2">
                      <p className="font-medium">{v.name}</p>
                      {v.sku && <p className="text-xs text-gray-400">{v.sku}</p>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {money(v.price)}
                      {v.comparePrice > v.price && <span className="ml-1 text-xs text-gray-400 line-through">{money(v.comparePrice)}</span>}
                    </td>
                    <td className={`px-3 py-2 ${v.stock === 0 ? 'text-red-500 font-medium' : ''}`}>{v.stock}</td>
                    <td className="px-3 py-2">
                      <button type="button" disabled={toggleMutation.isPending} onClick={() => toggleMutation.mutate(v)}
                        title={v.isActive ? 'Click to hide from the store' : 'Click to show in the store'}
                        className={`relative w-9 h-5 rounded-full transition-colors ${v.isActive ? 'bg-green-500' : 'bg-gray-300'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${v.isActive ? 'left-[18px]' : 'left-0.5'}`} />
                      </button>
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button type="button" onClick={() => openEdit(v)} className="p-1.5 text-gray-400 hover:text-indigo-600" title="Edit"><Pencil size={15} /></button>
                      <button type="button" onClick={() => handleDelete(v)} className="p-1.5 text-gray-400 hover:text-red-500" title="Delete"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {editing !== null && form && (
        <div className="border border-indigo-100 bg-indigo-50/30 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">{editing === 'new' ? 'New variant' : 'Edit variant'}</p>
            <button type="button" onClick={close} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-600">Options {lockedNames ? '(same option names as this product\'s other variants)' : '(e.g. Color = Red, Size = XL)'}</p>
            {form.options.map((o, i) => (
              <div key={i} className="flex gap-2">
                <input value={o.name} readOnly={!!lockedNames} onChange={(e) => setOption(i, 'name', e.target.value)}
                  placeholder="Option (Color)" className={`${inputCls} ${lockedNames ? 'bg-gray-100 text-gray-500' : ''}`} />
                <input value={o.value} onChange={(e) => setOption(i, 'value', e.target.value)}
                  placeholder="Value (Red)" className={inputCls} />
                {!lockedNames && form.options.length > 1 && (
                  <button type="button" onClick={() => setForm((p) => ({ ...p, options: p.options.filter((_, j) => j !== i) }))}
                    className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500"><X size={15} /></button>
                )}
              </div>
            ))}
            {!lockedNames && form.options.length < 3 && (
              <button type="button" onClick={() => setForm((p) => ({ ...p, options: [...p.options, { name: '', value: '' }] }))}
                className="text-xs text-indigo-600 font-medium">+ Add another option</button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[['price', 'Selling price *'], ['comparePrice', 'MRP (optional)'], ['stock', 'Stock'], ['sku', 'SKU (optional)']].map(([k, l]) => (
              <div key={k}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{l}</label>
                <input type={k === 'sku' ? 'text' : 'number'} min={k === 'sku' ? undefined : '0'} value={form[k]}
                  onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))} className={inputCls} />
              </div>
            ))}
          </div>

          {productImages.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1.5">Show these product images when this variant is selected (optional)</p>
              <div className="flex flex-wrap gap-2">
                {productImages.map((src) => {
                  const on = form.images.includes(src)
                  return (
                    <button key={src} type="button" onClick={() => toggleImage(src)}
                      className={`w-14 h-14 rounded-xl overflow-hidden border-2 ${on ? 'border-indigo-500' : 'border-gray-200 opacity-60'}`}>
                      <img src={src} alt="" className="w-full h-full object-cover" />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} />
            Active (customers can buy it)
          </label>

          <div className="flex gap-2">
            <button type="button" onClick={close} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200">Cancel</button>
            <button type="button" onClick={submit} disabled={saveMutation.isPending}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
              {saveMutation.isPending ? 'Saving...' : editing === 'new' ? 'Add variant' : 'Save variant'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
