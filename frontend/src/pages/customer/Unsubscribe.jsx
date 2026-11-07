import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MailX, CheckCircle2, AlertCircle } from 'lucide-react'
import userService from '../../services/user.service'

// Email ke "unsubscribe" link ka landing page: /unsubscribe?token=...
// Button dabane par hi unsubscribe hota hai (email scanners link ko khol dete hain, GET par kuch nahi badalna chahiye).
export default function Unsubscribe() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [message, setMessage] = useState('')

  const confirm = async () => {
    setStatus('loading')
    try {
      const res = await userService.unsubscribe(token)
      setMessage(res.data?.message || 'You have been unsubscribed from marketing emails')
      setStatus('done')
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        {status === 'done' ? (
          <>
            <CheckCircle2 className="mx-auto text-green-600 mb-3" size={40} />
            <h1 className="text-xl font-bold text-gray-900 mb-2">You&apos;re unsubscribed</h1>
            <p className="text-sm text-gray-500 mb-6">
              {message}. You will still receive order updates and account emails. You can turn marketing emails back on anytime from your Profile.
            </p>
            <Link to="/" className="btn-primary inline-block px-6 py-2.5">Back to store</Link>
          </>
        ) : !token ? (
          <>
            <AlertCircle className="mx-auto text-amber-500 mb-3" size={40} />
            <h1 className="text-xl font-bold text-gray-900 mb-2">This link is incomplete</h1>
            <p className="text-sm text-gray-500 mb-6">Open the unsubscribe link from your email again, or manage marketing emails in your Profile.</p>
            <Link to="/profile" className="btn-primary inline-block px-6 py-2.5">Go to Profile</Link>
          </>
        ) : (
          <>
            <MailX className="mx-auto text-indigo-600 mb-3" size={40} />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Unsubscribe from marketing emails?</h1>
            <p className="text-sm text-gray-500 mb-6">
              You will stop getting cart reminders and offers. Order updates and account emails are not affected.
            </p>
            {status === 'error' && <p className="text-sm text-red-600 mb-4">{message}</p>}
            <button onClick={confirm} disabled={status === 'loading'} className="btn-primary w-full py-2.5 disabled:opacity-60">
              {status === 'loading' ? 'Unsubscribing...' : 'Yes, unsubscribe me'}
            </button>
            <Link to="/" className="block mt-4 text-sm text-gray-500 hover:text-gray-700">Keep my emails</Link>
          </>
        )}
      </div>
    </div>
  )
}
