import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { User, Camera, Lock, Trash2, Save, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import userService from '../../services/user.service'
import Skeleton from '../../components/ui/Skeleton'
import Modal from '../../components/ui/Modal'
import AddEmailForm from '../../components/profile/AddEmailForm'
import PhoneSection from '../../components/profile/PhoneSection'
import { displayEmail, isPlaceholderEmail } from '../../utils/identity'

export default function Profile() {
  const { user, updateUser, logout } = useAuthStore()
  const qc = useQueryClient()
  const fileRef = useRef()
  const [showOldPw, setShowOldPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  // Only what the user has typed; everything else shows the server value
  const [profileEdits, setProfileEdits] = useState({})
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => userService.getProfile().then(r => r.data?.data?.user),
  })

  // react-query v5 removed useQuery's onSuccess, so derive the form instead:
  // typed value wins, otherwise the loaded profile, otherwise the auth store.
  const profileForm = {
    name: profileEdits.name ?? profile?.name ?? user?.name ?? '',
  }

  // hasPassword comes from the backend; false for phone-OTP-only accounts
  const hasPassword = profile?.hasPassword !== false

  const updateMutation = useMutation({
    mutationFn: (data) => {
      // updateProfile sends multipart/form-data (avatar lives on this same endpoint)
      const form = new FormData()
      if (data.name) form.append('name', data.name)
      return userService.updateProfile(form)
    },
    onSuccess: (r) => {
      const updated = r.data?.data?.user
      if (updated) updateUser(updated)
      setProfileEdits({})
      qc.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Profile updated!')
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Update failed'),
  })

  const pwMutation = useMutation({
    mutationFn: (data) => userService.changePassword(data),
    onSuccess: () => {
      toast.success(hasPassword ? 'Password changed!' : 'Password set!')
      setPwForm({ oldPassword:'', newPassword:'', confirmPassword:'' })
      qc.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed'),
  })

  const avatarMutation = useMutation({
    // No separate avatar endpoint — avatar is part of PUT /users/profile
    mutationFn: (form) => userService.updateProfile(form),
    onSuccess: (r) => {
      const updated = r.data?.data?.user
      if (updated) updateUser(updated)
      qc.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Avatar updated!')
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Upload failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => userService.deleteAccount({ password: deletePassword }),
    onSuccess: () => { logout(); toast.success('Account deleted') },
    onError: (e) => toast.error(e?.response?.data?.message || 'Could not delete account'),
  })

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const form = new FormData()
    form.append('avatar', file)
    avatarMutation.mutate(form)
  }

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    if (pwForm.newPassword !== pwForm.confirmPassword) return toast.error("Passwords don't match")
    if (pwForm.newPassword.length < 6) return toast.error("Min 6 characters")
    pwMutation.mutate({
      ...(hasPassword ? { oldPassword: pwForm.oldPassword } : {}),
      newPassword: pwForm.newPassword,
      confirmPassword: pwForm.confirmPassword,
    })
  }

  const avatar = user?.avatar || profile?.avatar
  const initials = (user?.name || 'U').charAt(0).toUpperCase()

  if (isLoading) return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      <Skeleton className="h-32 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /><Skeleton className="h-48 rounded-2xl" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <User className="text-indigo-600" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
            <p className="text-sm text-gray-500">Manage your account details</p>
          </div>
        </div>

        {/* Avatar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-5">
            <div className="relative">
              {avatar ? (
                <img src={avatar} alt="avatar" className="w-20 h-20 rounded-full object-cover border-4 border-indigo-100" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                  {initials}
                </div>
              )}
              <button
                onClick={() => fileRef.current.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center shadow-md hover:bg-indigo-700 transition-colors"
              >
                <Camera size={13} className="text-white" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-lg">{user?.name}</p>
              <p className="text-sm text-gray-500">{displayEmail(user) || (user?.phone ? `+91 ${user.phone}` : '')}</p>
              {user?.role === 'admin' && (
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full mt-1 inline-block font-medium">Admin</span>
              )}
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Personal Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input
                value={profileForm.name}
                onChange={(e) => setProfileEdits(p => ({ ...p, name: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition"
                placeholder="Your name"
              />
            </div>
            {isPlaceholderEmail(user?.email) ? (
              <AddEmailForm />
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-gray-400 text-sm cursor-not-allowed"
                />
              </div>
            )}
            <PhoneSection
              phone={profile?.phone ?? user?.phone}
              verified={profile?.isPhoneVerified ?? user?.isPhoneVerified}
            />
            <button
              onClick={() => updateMutation.mutate(profileForm)}
              disabled={updateMutation.isPending}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              <Save size={15} />
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Lock size={17} className="text-indigo-500" /> {hasPassword ? 'Change Password' : 'Set a Password'}
          </h2>
          {!hasPassword && (
            <p className="text-sm text-gray-500 mb-4">You signed in with your phone, so no password is set yet. Create one to also log in with your mobile number and password.</p>
          )}
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {[
              ...(hasPassword ? [{ key:'oldPassword', label:'Current Password', show: showOldPw, toggle: () => setShowOldPw(p=>!p) }] : []),
              { key:'newPassword', label:'New Password',     show: showNewPw, toggle: () => setShowNewPw(p=>!p) },
              { key:'confirmPassword', label:'Confirm New Password', show: showNewPw, toggle: () => setShowNewPw(p=>!p) },
            ].map(({ key, label, show, toggle }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                <div className="relative">
                  <input
                    type={show ? 'text' : 'password'}
                    value={pwForm[key]}
                    onChange={(e) => setPwForm(p => ({ ...p, [key]: e.target.value }))}
                    className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            ))}
            <button
              type="submit"
              disabled={pwMutation.isPending}
              className="flex items-center gap-2 bg-gray-900 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-60"
            >
              {pwMutation.isPending ? 'Updating...' : (hasPassword ? 'Update Password' : 'Set Password')}
            </button>
          </form>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-2xl border border-red-100 p-6 shadow-sm">
          <h2 className="font-semibold text-red-600 mb-2 flex items-center gap-2">
            <AlertTriangle size={17} /> Danger Zone
          </h2>
          <p className="text-sm text-gray-500 mb-4">Once deleted, your account cannot be recovered.</p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 bg-red-50 text-red-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors"
          >
            <Trash2 size={15} /> Delete My Account
          </button>
        </div>

      </div>

      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Account?">
        <div className="p-4">
          <p className="text-sm text-gray-600 mb-4">This action is <strong>permanent</strong>. All your data will be erased.</p>
          {hasPassword && (
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Enter your password to confirm"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-red-300 focus:ring-2 focus:ring-red-100 outline-none text-sm mb-4"
            />
          )}
          <div className="flex gap-3">
            <button onClick={() => { setShowDeleteModal(false); setDeletePassword('') }} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm font-medium">Cancel</button>
            <button onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending} className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-60">
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Forever'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
