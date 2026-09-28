import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ThumbsUp } from "lucide-react";
import toast from "react-hot-toast";
import Rating from "../ui/Rating";
import Pagination from "../ui/Pagination";
import reviewService from "../../services/review.service";
import useAuthStore from "../../store/authStore";

function RatingBar({ label, value, total }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-4 text-gray-600 font-medium">{label}</span>
      <span className="text-amber-400 text-xs">★</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 text-xs text-gray-500">{value}</span>
    </div>
  );
}

export default function ProductReviews({ productId, ratings = 0, totalReviews = 0 }) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ rating: 0, title: "", comment: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["product-reviews", productId, page],
    queryFn: () => reviewService.getProductReviews(productId, { page }).then(r => r.data?.data),
    enabled: !!productId,
  });

  const reviews    = data?.reviews || [];
  const totalPages = data?.pagination?.totalPages || 1;
  const myReview   = user ? reviews.find(r => r.user?._id === user._id) : null;

  // Backend doesn't return a full star-breakdown, so this reflects the
  // currently-loaded page of reviews rather than every review ever written.
  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => { if (breakdown[r.rating] !== undefined) breakdown[r.rating]++; });

  const createMutation = useMutation({
    mutationFn: () => reviewService.create(productId, form),
    onSuccess: () => {
      toast.success("Review submitted! It'll show up once approved.");
      setForm({ rating: 0, title: "", comment: "" });
      qc.invalidateQueries({ queryKey: ["product-reviews", productId] });
    },
    onError: (e) => toast.error(e?.response?.data?.message || "Couldn't submit review"),
  });

  const helpfulMutation = useMutation({ mutationFn: (id) => reviewService.markHelpful(id) });

  const handleHelpful = (id) => {
    helpfulMutation.mutate(id);
    qc.setQueryData(["product-reviews", productId, page], (old) => {
      if (!old) return old;
      return {
        ...old,
        reviews: old.reviews.map(r => r._id === id ? { ...r, helpfulCount: (r.helpfulCount || 0) + 1 } : r),
      };
    });
  };

  const submitReview = (e) => {
    e.preventDefault();
    if (!form.rating) { toast.error("Please select a star rating"); return; }
    createMutation.mutate();
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">
        Customer Reviews
        <span className="text-sm font-normal text-gray-500 ml-2">({totalReviews})</span>
      </h2>

      {/* Rating Summary */}
      <div className="card p-6 mb-6 flex flex-col sm:flex-row gap-6">
        <div className="flex flex-col items-center justify-center min-w-[120px]">
          <span className="text-5xl font-bold text-gray-900">{Number(ratings).toFixed(1)}</span>
          <Rating value={Math.round(ratings)} size={18} className="mt-1" />
          <p className="text-xs text-gray-500 mt-1">{totalReviews} reviews</p>
        </div>
        <div className="flex-1 space-y-2">
          {[5, 4, 3, 2, 1].map(star => (
            <RatingBar key={star} label={star} value={breakdown[star]} total={reviews.length} />
          ))}
        </div>
      </div>

      {/* Write a review */}
      {user ? (
        myReview ? (
          <div className="card p-5 mb-6 bg-primary-50 border border-primary-100">
            <p className="text-sm font-medium text-gray-700 mb-1">Your review</p>
            <Rating value={myReview.rating} size={14} />
            {myReview.title && <p className="text-sm font-semibold text-gray-900 mt-2">{myReview.title}</p>}
            {myReview.comment && <p className="text-sm text-gray-600 mt-1">{myReview.comment}</p>}
          </div>
        ) : (
          <form onSubmit={submitReview} className="card p-5 mb-6 space-y-3">
            <p className="text-sm font-semibold text-gray-900">Write a review</p>
            <Rating value={form.rating} interactive size={22} onChange={(v) => setForm(f => ({ ...f, rating: v }))} />
            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Title (optional)" maxLength={100}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-primary-400 outline-none text-sm" />
            <textarea value={form.comment} onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
              placeholder="Share your experience (optional)" maxLength={500} rows={3}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-primary-400 outline-none text-sm resize-none" />
            <button type="submit" disabled={createMutation.isPending}
              className="btn-primary px-5 py-2 text-sm disabled:opacity-60">
              {createMutation.isPending ? "Submitting..." : "Submit Review"}
            </button>
          </form>
        )
      ) : (
        <div className="card p-4 mb-6 text-sm text-gray-500 text-center">
          <a href="/login" className="text-primary font-medium hover:underline">Login</a> to write a review
        </div>
      )}

      {/* Review List */}
      {isLoading ? (
        <p className="text-sm text-gray-400 text-center py-8">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No reviews yet. Be the first to review!</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review._id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary text-sm font-bold">
                      {review.user?.name?.[0] || "?"}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{review.user?.name || "Anonymous"}</p>
                    <div className="flex items-center gap-2">
                      <Rating value={review.rating} size={12} />
                      {review.isVerifiedPurchase && (
                        <span className="text-xs text-green-600 font-medium">✓ Verified</span>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {new Date(review.createdAt).toLocaleDateString("en-IN")}
                </span>
              </div>

              {review.title && <h4 className="text-sm font-semibold text-gray-800 mt-3">{review.title}</h4>}
              {review.comment && <p className="text-sm text-gray-600 mt-1 leading-relaxed">{review.comment}</p>}

              <button onClick={() => handleHelpful(review._id)}
                className="flex items-center gap-1.5 mt-3 text-xs text-gray-400
                           hover:text-gray-600 transition-colors">
                <ThumbsUp size={13} />
                Helpful ({review.helpfulCount || 0})
              </button>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
