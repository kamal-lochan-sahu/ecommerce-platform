import { useState } from "react";
import { ThumbsUp, Star } from "lucide-react";
import { clsx } from "clsx";
import Rating from "../ui/Rating";
import Pagination from "../ui/Pagination";

const MOCK_REVIEWS = Array(6).fill(null).map((_, i) => ({
  _id:      `r-${i}`,
  user:     { name: ["Rahul K", "Priya S", "Amit V", "Sneha R", "Raj M", "Kavya T"][i] },
  rating:   [5, 4, 5, 3, 4, 5][i],
  title:    ["Excellent product!", "Good value", "Highly recommend", "Decent quality", "Fast delivery", "Worth buying"][i],
  comment:  "Very good product. Quality is top notch and delivery was fast. Definitely recommend!",
  helpful:  [12, 8, 25, 3, 15, 6][i],
  date:     new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN"),
  verified: true,
}));

function RatingBar({ label, value, total }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-4 text-gray-600 font-medium">{label}</span>
      <Star size={12} className="text-amber-400 fill-amber-400" />
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 text-xs text-gray-500">{value}</span>
    </div>
  );
}

export default function ProductReviews({ productId, ratings = 4.2, totalReviews = 128 }) {
  const [page, setPage] = useState(1);

  const breakdown = { 5: 68, 4: 32, 3: 15, 2: 8, 1: 5 };

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">
        Customer Reviews
        <span className="text-sm font-normal text-gray-500 ml-2">({totalReviews})</span>
      </h2>

      {/* Rating Summary */}
      <div className="card p-6 mb-6 flex flex-col sm:flex-row gap-6">
        {/* Average */}
        <div className="flex flex-col items-center justify-center min-w-[120px]">
          <span className="text-5xl font-bold text-gray-900">{ratings}</span>
          <Rating value={Math.round(ratings)} size={18} className="mt-1" />
          <p className="text-xs text-gray-500 mt-1">{totalReviews} reviews</p>
        </div>

        {/* Breakdown */}
        <div className="flex-1 space-y-2">
          {[5, 4, 3, 2, 1].map(star => (
            <RatingBar
              key={star}
              label={star}
              value={breakdown[star]}
              total={totalReviews}
            />
          ))}
        </div>
      </div>

      {/* Review List */}
      <div className="space-y-4">
        {MOCK_REVIEWS.map((review) => (
          <div key={review._id} className="card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary text-sm font-bold">
                    {review.user.name[0]}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{review.user.name}</p>
                  <div className="flex items-center gap-2">
                    <Rating value={review.rating} size={12} />
                    {review.verified && (
                      <span className="text-xs text-green-600 font-medium">✓ Verified</span>
                    )}
                  </div>
                </div>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">{review.date}</span>
            </div>

            <h4 className="text-sm font-semibold text-gray-800 mt-3">{review.title}</h4>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed">{review.comment}</p>

            <button className="flex items-center gap-1.5 mt-3 text-xs text-gray-400
                               hover:text-gray-600 transition-colors">
              <ThumbsUp size={13} />
              Helpful ({review.helpful})
            </button>
          </div>
        ))}
      </div>

      <Pagination page={page} totalPages={3} onPageChange={setPage} />
    </div>
  );
}
