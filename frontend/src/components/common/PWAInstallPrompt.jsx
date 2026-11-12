import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Download, X, Smartphone } from 'lucide-react'
import useStoreSettings from '../../hooks/useStoreSettings'

// Install banner ye kaam kharab na kare: checkout/cart jaise pages par nahi dikhta (wahan ye
// "Place Order" jaise buttons ke upar aa kar clicks rok deta tha), 12 second baad khud hat jaata hai,
// aur "Not now" / cross dabane par 7 din tak dubara nahi aata (sabhi devices par).
const HIDE_ON = ['/checkout', '/cart', '/order-success', '/track-order', '/login', '/register', '/admin']
const DISMISS_KEY = 'pwa-dismissed-at'
const REMIND_AFTER_MS = 7 * 24 * 60 * 60 * 1000
const AUTO_HIDE_MS = 12 * 1000

const store = {
  get: (k) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k, v) => { try { localStorage.setItem(k, v) } catch { /* private mode */ } },
  remove: (k) => { try { localStorage.removeItem(k) } catch { /* private mode */ } },
}

const recentlyDismissed = () => {
  // Purani chabi ('pwa-dismissed') wale users ko bhi ab 7 din ke liye dismissed maano
  if (store.get('pwa-dismissed')) {
    store.remove('pwa-dismissed')
    store.set(DISMISS_KEY, String(Date.now()))
  }
  const at = Number(store.get(DISMISS_KEY))
  return Number.isFinite(at) && at > 0 && Date.now() - at < REMIND_AFTER_MS
}

export default function PWAInstallPrompt() {
  const { brandName } = useStoreSettings()
  const { pathname } = useLocation()
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS] = useState(() => /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase()))
  const [isInstalled, setIsInstalled] = useState(
    () => window.matchMedia('(display-mode: standalone)').matches
  )

  useEffect(() => {
    if (isInstalled || recentlyDismissed()) return undefined

    const timers = []
    // Android/Desktop install prompt
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      timers.push(setTimeout(() => setShowPrompt(true), 3000))
    }
    window.addEventListener('beforeinstallprompt', handler)

    // iOS: koi install event nahi hota, isliye 5 second baad
    if (isIOS) timers.push(setTimeout(() => setShowPrompt(true), 5000))

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      timers.forEach(clearTimeout)
    }
  }, [isIOS, isInstalled])

  const hiddenHere = HIDE_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  const visible = showPrompt && !isInstalled && !hiddenHere

  // Dikhne ke 12 second baad khud hat jaaye (dismiss nahi maana jaata, bas is baar ke liye)
  useEffect(() => {
    if (!visible) return undefined
    const t = setTimeout(() => setShowPrompt(false), AUTO_HIDE_MS)
    return () => clearTimeout(t)
  }, [visible])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setIsInstalled(true)
      }
      setDeferredPrompt(null)
    }
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    store.set(DISMISS_KEY, String(Date.now()))
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-6 left-4 right-4 z-[60] md:bottom-6 md:left-auto md:right-6 md:w-80">
      <div className="bg-white rounded-2xl shadow-2xl border border-indigo-100 p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Smartphone size={22} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm">Install {brandName} App</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {isIOS
                ? 'Tap the share button and select "Add to Home Screen"'
                : 'Install for faster access and offline browsing'}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>
        {!isIOS && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleDismiss}
              className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
            >
              Not now
            </button>
            <button
              onClick={handleInstall}
              className="flex-1 py-2 text-sm text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-1.5"
            >
              <Download size={14} />
              Install
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
