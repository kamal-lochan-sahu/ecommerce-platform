import { Wrench } from 'lucide-react'
import useStoreSettings from '../../hooks/useStoreSettings'

// Admin ne Settings mein Maintenance Mode on kiya ho to har storefront page par ye bar dikhta hai.
// Backend bhi naye orders rok deta hai (createOrder 503), banner sirf customer ko pehle se bata deta hai.
export default function MaintenanceBanner() {
  const { settings: data } = useStoreSettings()

  if (!data?.maintenanceMode) return null

  return (
    <div className="bg-amber-500 text-white text-sm px-4 py-2 flex items-center justify-center gap-2 text-center">
      <Wrench size={15} className="flex-shrink-0" />
      <span>{data.storeName || 'The store'} is under maintenance. You can browse, but new orders are paused for now.</span>
    </div>
  )
}
