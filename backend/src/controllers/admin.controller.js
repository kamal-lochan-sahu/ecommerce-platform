import { Order, Product, User, Review, Settings } from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

// ─── Helper ───────────────────────────────────────────────────────────────────

const startOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

// ─── GET /api/admin/dashboard ─────────────────────────────────────────────────

export const getDashboard = asyncHandler(async (req, res) => {
  const today = new Date();

  // Parallel queries — fast!
  const [
    totalRevenueAgg,
    totalOrders,
    totalCustomers,
    totalProducts,
    revenueTodayAgg,
    ordersTodayCount,
    recentOrders,
    lowStockProducts,
    topProducts,
    ordersByStatusAgg,
    revenueByMonthAgg,
  ] = await Promise.all([
    // 1. Total revenue (paid orders only)
    Order.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$pricing.total" } } },
    ]),

    // 2. Total orders
    Order.countDocuments(),

    // 3. Total customers (non-admin)
    User.countDocuments({ role: "customer", isActive: true }),

    // 4. Total products
    Product.countDocuments({ isActive: true }),

    // 5. Revenue today
    Order.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          createdAt: { $gte: startOfDay(today), $lte: endOfDay(today) },
        },
      },
      { $group: { _id: null, total: { $sum: "$pricing.total" } } },
    ]),

    // 6. Orders today
    Order.countDocuments({
      createdAt: { $gte: startOfDay(today), $lte: endOfDay(today) },
    }),

    // 7. Recent 5 orders
    Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("userId", "name email")
      .select("orderNumber orderStatus paymentStatus createdAt pricing"),

    // 8. Low stock products (stock <= threshold, default 10)
    Product.find({ stock: { $lte: 10 }, isActive: true })
      .select("name stock sku images")
      .sort({ stock: 1 })
      .limit(10),

    // 9. Top 5 products by totalSold
    Product.find({ isActive: true })
      .sort({ totalSold: -1 })
      .limit(5)
      .select("name totalSold price images"),

    // 10. Orders by status
    Order.aggregate([
      { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
    ]),

    // 11. Revenue by month (last 6 months)
    Order.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          createdAt: {
            $gte: new Date(new Date().setMonth(today.getMonth() - 5, 1)),
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          revenue: { $sum: "$pricing.total" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
  ]);

  // Format ordersByStatus into a plain object
  const ordersByStatus = {
    pending: 0,
    placed: 0,
    confirmed: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    returned: 0,
  };
  ordersByStatusAgg.forEach(({ _id, count }) => {
    if (_id in ordersByStatus) ordersByStatus[_id] = count;
  });

  // Format revenueByMonth for Recharts
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const revenueByMonth = revenueByMonthAgg.map(({ _id, revenue, orders }) => ({
    month: `${monthNames[_id.month - 1]} ${_id.year}`,
    revenue: parseFloat(revenue.toFixed(2)),
    orders,
  }));

  return res.status(200).json(
    new ApiResponse(200, {
      totalRevenue: totalRevenueAgg[0]?.total ?? 0,
      totalOrders,
      totalCustomers,
      totalProducts,
      revenueToday: revenueTodayAgg[0]?.total ?? 0,
      ordersToday: ordersTodayCount,
      recentOrders,
      lowStockProducts,
      topProducts,
      ordersByStatus,
      revenueByMonth,
    }, "Dashboard data fetched")
  );
});

// ─── GET /api/admin/analytics/sales ──────────────────────────────────────────
// Query: ?period=monthly|weekly|daily  &from=YYYY-MM-DD  &to=YYYY-MM-DD

export const getSalesAnalytics = asyncHandler(async (req, res) => {
  const { period = "monthly", from, to } = req.query;

  const fromDate = from ? new Date(from) : new Date(new Date().setMonth(new Date().getMonth() - 11, 1));
  const toDate = to ? endOfDay(new Date(to)) : endOfDay(new Date());

  let groupBy;
  if (period === "daily") {
    groupBy = {
      year: { $year: "$createdAt" },
      month: { $month: "$createdAt" },
      day: { $dayOfMonth: "$createdAt" },
    };
  } else if (period === "weekly") {
    groupBy = {
      year: { $year: "$createdAt" },
      week: { $isoWeek: "$createdAt" },
    };
  } else {
    // monthly (default)
    groupBy = {
      year: { $year: "$createdAt" },
      month: { $month: "$createdAt" },
    };
  }

  const data = await Order.aggregate([
    {
      $match: {
        paymentStatus: "paid",
        createdAt: { $gte: fromDate, $lte: toDate },
      },
    },
    {
      $group: {
        _id: groupBy,
        revenue: { $sum: "$pricing.total" },
        orders: { $sum: 1 },
        avgOrderValue: { $avg: "$pricing.total" },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.week": 1 } },
  ]);

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const formatted = data.map((d) => {
    let label;
    if (period === "daily") {
      label = `${d._id.day} ${monthNames[d._id.month - 1]}`;
    } else if (period === "weekly") {
      label = `Week ${d._id.week}, ${d._id.year}`;
    } else {
      label = `${monthNames[d._id.month - 1]} ${d._id.year}`;
    }
    return {
      label,
      revenue: parseFloat(d.revenue.toFixed(2)),
      orders: d.orders,
      avgOrderValue: parseFloat(d.avgOrderValue.toFixed(2)),
    };
  });

  return res.status(200).json(
    new ApiResponse(200, { period, from: fromDate, to: toDate, data: formatted }, "Sales analytics fetched")
  );
});

// ─── GET /api/admin/analytics/products ───────────────────────────────────────
// Query: ?limit=10&sortBy=totalSold|revenue

export const getProductAnalytics = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const sortBy = req.query.sortBy === "revenue" ? "revenue" : "totalSold";

  // Top selling products from Order items
  const topProducts = await Order.aggregate([
    { $match: { paymentStatus: "paid" } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.product",
        totalSold: { $sum: "$items.quantity" },
        revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
      },
    },
    { $sort: { [sortBy]: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $project: {
        name: "$product.name",
        sku: "$product.sku",
        image: { $arrayElemAt: ["$product.images", 0] },
        totalSold: 1,
        revenue: { $round: ["$revenue", 2] },
        stock: "$product.stock",
      },
    },
  ]);

  // Category-wise revenue
  const categoryRevenue = await Order.aggregate([
    { $match: { paymentStatus: "paid" } },
    { $unwind: "$items" },
    {
      $lookup: {
        from: "products",
        localField: "items.product",
        foreignField: "_id",
        as: "prod",
      },
    },
    { $unwind: "$prod" },
    {
      $lookup: {
        from: "categories",
        localField: "prod.category",
        foreignField: "_id",
        as: "cat",
      },
    },
    { $unwind: { path: "$cat", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: "$cat._id",
        category: { $first: "$cat.name" },
        revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
        unitsSold: { $sum: "$items.quantity" },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: 8 },
    {
      $project: {
        category: { $ifNull: ["$category", "Uncategorized"] },
        revenue: { $round: ["$revenue", 2] },
        unitsSold: 1,
      },
    },
  ]);

  return res.status(200).json(
    new ApiResponse(200, { topProducts, categoryRevenue }, "Product analytics fetched")
  );
});

// ─── GET /api/admin/customers ─────────────────────────────────────────────────
// Query: ?page=1&limit=20&search=&status=active|inactive&sort=createdAt

export const getAllCustomers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const { search, status, sort = "createdAt" } = req.query;

  const filter = { role: "customer" };
  if (status === "active") filter.isActive = true;
  if (status === "inactive") filter.isActive = false;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const sortMap = {
    createdAt: { createdAt: -1 },
    name: { name: 1 },
    orders: { totalOrders: -1 },
  };

  const [customers, total] = await Promise.all([
    User.find(filter)
      .select("-password -refreshToken -__v")
      .sort(sortMap[sort] || { createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ApiResponse(200, {
      customers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }, "Customers fetched")
  );
});

// ─── GET /api/admin/customers/:id ─────────────────────────────────────────────

export const getCustomerById = asyncHandler(async (req, res) => {
  const customer = await User.findOne({ _id: req.params.id, role: "customer" })
    .select("-password -refreshToken -__v");

  if (!customer) throw new ApiError(404, "Customer not found");

  // Customer's order summary
  const orderStats = await Order.aggregate([
    { $match: { userId: customer._id } },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalSpent: {
          $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$pricing.total", 0] },
        },
        lastOrderAt: { $max: "$createdAt" },
      },
    },
  ]);

  const recentOrders = await Order.find({ userId: customer._id })
    .sort({ createdAt: -1 })
    .limit(5)
    .select("orderNumber orderStatus paymentStatus createdAt pricing");

  return res.status(200).json(
    new ApiResponse(200, {
      customer,
      stats: orderStats[0] || { totalOrders: 0, totalSpent: 0, lastOrderAt: null },
      recentOrders,
    }, "Customer details fetched")
  );
});

// ─── PUT /api/admin/customers/:id/status ──────────────────────────────────────

export const updateCustomerStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;

  if (typeof isActive !== "boolean") {
    throw new ApiError(400, "isActive (boolean) required");
  }

  const customer = await User.findOneAndUpdate(
    { _id: req.params.id, role: "customer" },
    { isActive },
    { new: true }
  ).select("-password -refreshToken");

  if (!customer) throw new ApiError(404, "Customer not found");

  return res.status(200).json(
    new ApiResponse(200, customer, `Customer ${isActive ? "activated" : "deactivated"}`)
  );
});

// ─── GET /api/admin/reviews ───────────────────────────────────────────────────
// Query: ?status=pending|approved|rejected&page=1&limit=20

export const getAllReviews = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const statusParam = req.query.status || "pending";

  // Map status param to isApproved field
  const filter = {};
  if (statusParam === "approved") filter.isApproved = true;
  else if (statusParam === "pending") filter.isApproved = { $ne: true };
  else if (statusParam === "rejected") filter.isApproved = false;

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate("user", "name email avatar")
      .populate("product", "name images sku")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Review.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ApiResponse(200, {
      reviews,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }, `${statusParam} reviews fetched`)
  );
});

// ─── PUT /api/admin/reviews/:id/approve ───────────────────────────────────────

export const approveReview = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { isApproved: true },
    { new: true }
  );

  if (!review) throw new ApiError(404, "Review not found");

  // Recalculate product average rating
  await recalcProductRating(review.product);

  return res.status(200).json(new ApiResponse(200, review, "Review approved"));
});

// ─── PUT /api/admin/reviews/:id/reject ────────────────────────────────────────

export const rejectReview = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { isApproved: false, rejectionReason: reason || "" },
    { new: true }
  );

  if (!review) throw new ApiError(404, "Review not found");

  return res.status(200).json(new ApiResponse(200, review, "Review rejected"));
});

// ─── GET /api/admin/low-stock ─────────────────────────────────────────────────
// Query: ?threshold=10&page=1&limit=20

export const getLowStockProducts = asyncHandler(async (req, res) => {
  const threshold = parseInt(req.query.threshold) || 10;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = { stock: { $lte: threshold }, isActive: true };

  const [products, total] = await Promise.all([
    Product.find(filter)
      .select("name sku stock price images category")
      .populate("category", "name")
      .sort({ stock: 1 })
      .skip(skip)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  // Out-of-stock count
  const outOfStock = await Product.countDocuments({ stock: 0, isActive: true });

  return res.status(200).json(
    new ApiResponse(200, {
      products,
      outOfStock,
      threshold,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }, "Low stock products fetched")
  );
});

// ─── GET /api/admin/settings ─────────────────────────────────────────────────────────────────

export const getSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.getSingleton();
  return res.status(200).json(new ApiResponse(200, { settings }, "Settings fetched"));
});

// ─── PUT /api/admin/settings ─────────────────────────────────────────────────────────────────

const ALLOWED_SETTINGS_FIELDS = [
  "storeName", "storeEmail", "storePhone", "storeAddress",
  "currency", "deliveryFee", "freeDeliveryAbove", "taxRate", "maintenanceMode",
];

export const updateSettings = asyncHandler(async (req, res) => {
  const updates = {};
  for (const key of ALLOWED_SETTINGS_FIELDS) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "No valid settings fields provided");
  }

  const existing = await Settings.findOne();
  const settings = existing
    ? await Settings.findByIdAndUpdate(existing._id, updates, { new: true, runValidators: true })
    : await Settings.create(updates);

  return res.status(200).json(new ApiResponse(200, { settings }, "Settings updated"));
});

// ─── Internal helper ──────────────────────────────────────────────────────────

async function recalcProductRating(productId) {
  const result = await Review.aggregate([
    { $match: { product: productId, isApproved: true } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  if (result.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      "ratings.average": parseFloat(result[0].avgRating.toFixed(1)),
      "ratings.count": result[0].totalReviews,
    });
  }
}
