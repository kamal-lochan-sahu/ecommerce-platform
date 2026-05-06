import { TrendingUp, TrendingDown } from 'lucide-react'

export default function StatsCard({ title, value, icon: Icon, color='indigo', change, prefix='', suffix='' }) {
  const up = change >= 0
  const colors = {
    indigo: 'bg-indigo-100 text-indigo-600',
    green:  'bg-green-100 text-green-600',
    amber:  'bg-amber-100 text-amber-600',
    purple: 'bg-purple-100 text-purple-600',
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon size={20}/>
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${up?'bg-green-100 text-green-700':'bg-red-100 text-red-600'}`}>
            {up?<TrendingUp size={12}/>:<TrendingDown size={12}/>}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-black text-gray-900">{prefix}{typeof value==='number'?value.toLocaleString('en-IN'):value}{suffix}</p>
      <p className="text-sm text-gray-500 mt-1">{title}</p>
    </div>
  )
}
