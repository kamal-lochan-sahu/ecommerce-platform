import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, Grid3X3, ShoppingBag, Users,
  Star, Tag, Image, BarChart2, Settings, LogOut, X, Store
} from 'lucide-react'
import useAuthStore from '../../store/authStore'
import authService from '../../services/auth.service'
import toast from 'react-hot-toast'

const NAV = [
  { to:'/admin',              Icon:LayoutDashboard, label:'Dashboard',  end:true },
  { to:'/admin/products',     Icon:Package,         label:'Products' },
  { to:'/admin/categories',   Icon:Grid3X3,         label:'Categories' },
  { to:'/admin/orders',       Icon:ShoppingBag,     label:'Orders' },
  { to:'/admin/customers',    Icon:Users,           label:'Customers' },
  { to:'/admin/reviews',      Icon:Star,            label:'Reviews' },
  { to:'/admin/coupons',      Icon:Tag,             label:'Coupons' },
  { to:'/admin/banners',      Icon:Image,           label:'Banners' },
  { to:'/admin/analytics',    Icon:BarChart2,       label:'Analytics' },
  { to:'/admin/settings',     Icon:Settings,        label:'Settings' },
]

export default function AdminSidebar({ isOpen, onClose }) {
  const { logout, user } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try { await authService.logout() } catch {}
    logout()
    navigate('/login')
    toast.success('Logged out')
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={onClose}/>}

      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-gray-900 flex flex-col transition-transform duration-300 ${isOpen?'translate-x-0':'-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Store size={16} className="text-white"/>
            </div>
            <span className="font-bold text-white text-lg">Admin</span>
          </div>
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-white"><X size={20}/></button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {NAV.map(({ to, Icon, label, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }>
              <Icon size={18}/>{label}
            </NavLink>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="p-3 border-t border-gray-800">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <p className="text-gray-500 text-xs truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-all">
            <LogOut size={18}/> Logout
          </button>
        </div>
      </aside>
    </>
  )
}
