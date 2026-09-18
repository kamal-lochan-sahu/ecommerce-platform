import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Heart, ShoppingCart, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import wishlistService from '../../services/wishlist.service'
import useCartStore from '../../store/cartStore'
import Skeleton from '../../components/ui/Skeleton'

export default function Wishlist() {
  const qc = useQueryClient()
  const addToCart = useCartStore(s => s.addItem)

  const { data, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => wishlistService.getAll().then(r => r.data?.data?.items || r.data?.data || r.data?.items || []),
  })

  const removeMutation = useMutation({
    mutationFn: (pid) => wishlistService.remove(pid),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['wishlist'] }); toast.success('Removed from wishlist') },
  })

  const handleMoveToCart = (item) => {
    addToCart({ product: item.product, quantity: 1 })
    removeMutation.mutate(item.product._id)
    toast.success('Moved to cart!')
  }

  const items = data || []

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <Heart className="text-red-500" size={20} fill="currentColor"/>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Wishlist</h1>
            <p className="text-sm text-gray-500">{items.length} saved items</p>
          </div>
        </div>

        {isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_,i)=><Skeleton key={i} className="h-64 rounded-2xl"/>)}
          </div>
        )}

        {!isLoading && items.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <Heart className="mx-auto text-gray-200 mb-4" size={72}/>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Wishlist is empty</h3>
            <p className="text-sm text-gray-400 mb-6">Save products you love here</p>
            <Link to="/products" className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-indigo-700">Browse Products</Link>
          </div>
        )}

        {!isLoading && items.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item) => {
              const p = item.product || item
              const img = p.images?.[0] || 'https://placehold.co/400x400?text=Product'
              const price = p.salePrice || p.price
              const original = p.price
              const discount = original > price ? Math.round((1 - price/original)*100) : 0
              return (
                <div key={p._id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all group">
                  <Link to={`/products/${p.slug}`} className="block relative overflow-hidden">
                    <img src={img} alt={p.name} className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy"/>
                    {discount > 0 && (
                      <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">{discount}% off</span>
                    )}
                  </Link>
                  <div className="p-3">
                    <Link to={`/products/${p.slug}`}>
                      <h3 className="text-sm font-medium text-gray-900 line-clamp-2 hover:text-indigo-600 transition-colors">{p.name}</h3>
                    </Link>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="font-bold text-gray-900">₹{price?.toLocaleString('en-IN')}</span>
                      {discount > 0 && <span className="text-xs text-gray-400 line-through">₹{original?.toLocaleString('en-IN')}</span>}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => handleMoveToCart(item)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 text-white py-2 rounded-xl text-xs font-medium hover:bg-indigo-700 transition-colors">
                        <ShoppingCart size={13}/> Add to Cart
                      </button>
                      <button onClick={() => removeMutation.mutate(p._id)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
