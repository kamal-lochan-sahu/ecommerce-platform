import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, Trash2, Package, Tag, Star, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import notificationService from '../../services/notification.service'
import Skeleton from '../../components/ui/Skeleton'

const TYPE_ICON = {
  order:   { Icon: Package, bg: 'bg-indigo-100', color: 'text-indigo-600' },
  offer:   { Icon: Tag,     bg: 'bg-amber-100',  color: 'text-amber-600' },
  review:  { Icon: Star,    bg: 'bg-yellow-100', color: 'text-yellow-600' },
  default: { Icon: Info,    bg: 'bg-gray-100',   color: 'text-gray-500' },
}

export default function Notifications() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getAll().then(r => r.data?.data?.notifications || r.data?.notifications || []),
    staleTime: 1000 * 30,      // 30s — notifications should feel close to live
    refetchInterval: 1000 * 30, // poll while the page is open
  })

  const readMutation = useMutation({
    mutationFn: (id) => notificationService.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey:['notifications'] }),
  })
  const readAllMutation = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['notifications'] }); toast.success('All marked as read') },
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => notificationService.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['notifications'] }); toast.success('Deleted') },
  })

  const notifications = data || []
  const unreadCount = notifications.filter(n => !n.isRead).length
  const filtered = filter === 'unread' ? notifications.filter(n=>!n.isRead) : notifications

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center relative">
              <Bell className="text-indigo-600" size={20}/>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{unreadCount}</span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
              <p className="text-sm text-gray-500">{unreadCount} unread</p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button onClick={() => readAllMutation.mutate()} disabled={readAllMutation.isPending}
              className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              <CheckCheck size={16}/> Mark all read
            </button>
          )}
        </div>

        <div className="flex gap-2 mb-5">
          {['all','unread'].map(f=>(
            <button key={f} onClick={()=>setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-all ${filter===f?'bg-indigo-600 text-white':'bg-white text-gray-600 border border-gray-200 hover:border-indigo-400'}`}>
              {f} {f==='unread' && unreadCount > 0 ? `(${unreadCount})` : ''}
            </button>
          ))}
        </div>

        {isLoading && <div className="space-y-3">{[...Array(6)].map((_,i)=><Skeleton key={i} className="h-20 rounded-2xl"/>)}</div>}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <Bell className="mx-auto text-gray-200 mb-4" size={64}/>
            <h3 className="text-lg font-semibold text-gray-700">No notifications</h3>
            <p className="text-sm text-gray-400 mt-1">{filter==='unread'?'All caught up!':'Nothing here yet'}</p>
          </div>
        )}

        <div className="space-y-2">
          {filtered.map((n) => {
            const cfg = TYPE_ICON[n.type] || TYPE_ICON.default
            const { Icon } = cfg
            return (
              <div key={n._id} onClick={() => !n.isRead && readMutation.mutate(n._id)}
                className={`flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${n.isRead?'bg-white border-gray-100':'bg-indigo-50 border-indigo-100'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                  <Icon size={18} className={cfg.color}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${n.isRead?'text-gray-700':'text-gray-900'}`}>{n.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(n.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!n.isRead && <div className="w-2 h-2 bg-indigo-600 rounded-full"/>}
                  <button onClick={(e)=>{ e.stopPropagation(); deleteMutation.mutate(n._id) }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
