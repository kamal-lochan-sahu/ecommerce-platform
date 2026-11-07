import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, X, Plus } from 'lucide-react'
import api from '../../services/api'

// Coupon ko kin products / categories par lagana hai. Dono khaali = poore cart par.
// products / categories = [{ _id, name }] ; onChange(next) un lists ke saath bulaya jaata hai.
export default function CouponScopePicker({ products, categories, onChange }) {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['coupon-scope-products', debounced],
    queryFn: () =>
      api.get('/products/admin/list', { params: { limit: 8, search: debounced } })
        .then(r => r.data?.data?.products || []),
    enabled: debounced.length >= 2,
  })

  const { data: allCategories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data?.data?.categories || []),
  })

  const parentId = (c) => c.parent?._id || c.parent || null
  const parents = allCategories.filter(c => !parentId(c))
  const childrenOf = (id) => allCategories.filter(c => parentId(c) === id)

  const pickedProductIds = new Set(products.map(p => p._id))
  const pickedCategoryIds = new Set(categories.map(c => c._id))

  const addProduct = (p) => {
    if (pickedProductIds.has(p._id)) return
    onChange({ products: [...products, { _id: p._id, name: p.name }], categories })
  }
  const removeProduct = (id) => onChange({ products: products.filter(p => p._id !== id), categories })

  const toggleCategory = (c) => {
    onChange({
      products,
      categories: pickedCategoryIds.has(c._id)
        ? categories.filter(x => x._id !== c._id)
        : [...categories, { _id: c._id, name: c.name }],
    })
  }

  const row = (c, indent) => (
    <label key={c._id} className={`flex items-center gap-2 py-1 text-sm text-gray-700 cursor-pointer ${indent ? 'pl-5' : ''}`}>
      <input type="checkbox" checked={pickedCategoryIds.has(c._id)} onChange={() => toggleCategory(c)} className="rounded border-gray-300" />
      {c.name}
    </label>
  )

  return (
    <div className="space-y-3 border border-gray-100 rounded-xl p-3 bg-gray-50/60">
      <div>
        <p className="text-xs font-medium text-gray-700">Applies to</p>
        <p className="text-xs text-gray-400">
          {products.length + categories.length === 0
            ? 'Whole cart (no restriction). Pick products or categories to limit the discount to them.'
            : 'Discount is calculated only on the matching items in the cart.'}
        </p>
      </div>

      {/* Products */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Specific products</label>
        {products.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {products.map(p => (
              <span key={p._id} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded-full">
                {p.name}
                <button type="button" onClick={() => removeProduct(p._id)} aria-label={`Remove ${p.name}`} className="hover:text-indigo-900"><X size={12} /></button>
              </span>
            ))}
          </div>
        )}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name or SKU..."
            className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none text-sm bg-white"
          />
        </div>
        {debounced.length >= 2 && (
          <div className="mt-1.5 bg-white border border-gray-100 rounded-xl max-h-40 overflow-y-auto divide-y divide-gray-50">
            {isFetching && results.length === 0 && <p className="text-xs text-gray-400 p-2">Searching...</p>}
            {!isFetching && results.length === 0 && <p className="text-xs text-gray-400 p-2">No products found</p>}
            {results.map(p => (
              <button
                key={p._id}
                type="button"
                disabled={pickedProductIds.has(p._id)}
                onClick={() => addProduct(p)}
                className="w-full flex items-center justify-between gap-2 text-left text-sm px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40"
              >
                <span className="truncate">{p.name}</span>
                {pickedProductIds.has(p._id) ? <span className="text-xs text-gray-400">Added</span> : <Plus size={14} className="text-gray-400 flex-shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Categories */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Categories <span className="font-normal text-gray-400">(subcategories are included automatically)</span></label>
        {parents.length === 0 ? (
          <p className="text-xs text-gray-400">No categories yet</p>
        ) : (
          <div className="bg-white border border-gray-100 rounded-xl px-3 py-1.5 max-h-40 overflow-y-auto">
            {parents.map(p => (
              <div key={p._id}>
                {row(p, false)}
                {childrenOf(p._id).map(c => row(c, true))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
