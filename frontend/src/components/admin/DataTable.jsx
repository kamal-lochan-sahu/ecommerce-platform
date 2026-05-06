import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import Skeleton from '../ui/Skeleton'

export default function DataTable({ columns, data=[], isLoading, searchable=true, actions, emptyText='No data found' }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PER_PAGE = 10

  const filtered = searchable && search
    ? data.filter(row => Object.values(row).some(v => String(v).toLowerCase().includes(search.toLowerCase())))
    : data

  const total = Math.ceil(filtered.length / PER_PAGE)
  const paged = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {searchable && (
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 max-w-xs">
            <Search size={15} className="text-gray-400 flex-shrink-0"/>
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}
              placeholder="Search..." className="bg-transparent text-sm outline-none flex-1 text-gray-700"/>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {columns.map(c=>(
                <th key={c.key} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{c.label}</th>
              ))}
              {actions && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && [...Array(5)].map((_,i)=>(
              <tr key={i}>{columns.map(c=><td key={c.key} className="px-4 py-3"><Skeleton className="h-4 rounded"/></td>)}</tr>
            ))}
            {!isLoading && paged.length === 0 && (
              <tr><td colSpan={columns.length+(actions?1:0)} className="text-center py-12 text-gray-400 text-sm">{emptyText}</td></tr>
            )}
            {!isLoading && paged.map((row,i)=>(
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                {columns.map(c=>(
                  <td key={c.key} className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                    {c.render ? c.render(row[c.key], row) : row[c.key] ?? '—'}
                  </td>
                ))}
                {actions && <td className="px-4 py-3">{actions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">{filtered.length} results</p>
          <div className="flex items-center gap-2">
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
              <ChevronLeft size={15}/>
            </button>
            <span className="text-xs text-gray-600 font-medium">{page}/{total}</span>
            <button onClick={()=>setPage(p=>Math.min(total,p+1))} disabled={page===total} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
              <ChevronRight size={15}/>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
