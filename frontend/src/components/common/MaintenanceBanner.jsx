import { useQuery } from '@tanstack/react-query'
import { Wrench } from 'lucide-react'
import api from '../../services/api'

// Admin ne Settings mein Maintenance Mode on kiya ho to har storefront page par ye bar dikhta hai.
// Backend bhi naye orders rok deta hai (createOrder 503), banner sirf customer ko pehle se bata deta hai.
export default function MaintenanceBanner() {
  const { data } = useQuery({
    queryKey: ['public-settings-maintenance'],
    queryFn: () => api.get('/settings/public').then(r => r.data?.data || {}),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  })

  if (!data?.maintenanceMode) return null

  return (
    <div className="bg-amber-500 text-white text-sm px-4 py-2 flex items-center justify-center gap-2 text-center">
      <Wrench size={15} className="flex-shrink-0" />
      <span>{data.storeName || 'The store'} is under maintenance. You can browse, but new orders are paused for now.</span>
    </div>
  )
}
