import { WifiOff, RefreshCw, ShoppingBag } from 'lucide-react'

export default function Offline() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <WifiOff size={40} className="text-indigo-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">You're Offline</h1>
        <p className="text-gray-500 mb-8">
          No internet connection. Please check your network and try again.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 px-6 rounded-2xl font-medium hover:bg-indigo-700 transition-colors"
          >
            <RefreshCw size={18} />
            Try Again
          </button>
          <button
            onClick={() => window.history.back()}
            className="w-full flex items-center justify-center gap-2 bg-white text-gray-700 py-3 px-6 rounded-2xl font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ShoppingBag size={18} />
            Go Back
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-8">Luxora — Premium Shopping</p>
      </div>
    </div>
  )
}
