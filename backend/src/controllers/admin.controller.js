import { Order, Product, User, Review, Settings } from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { REVENUE_MATCH, REFUND_DUE_FILTER, FINAL_STATUSES } from "../utils/orderRules.js";
import {
  STORE_TIMEZONE,
  startOfDayInTz,
  endOfDayInTz,
  startOfMonthInTz,
} from "../utils/timezone.js";

// "Aaj"/"is mahine" store ke timezone (STORE_TIMEZONE, default Asia/Kolkata) mein.
// Server UTC par chalta hai, to bina is ke raat 12 se subah 5:30 tak ke orders pichle din mein jaate.
const startOfDay = (date = new Date()) => startOfDayInTz(date);
const endOfDay = (date = new Date()) => endOfDayInTz(date);

// $year/$month/... ko bhi store ke timezone mein chalane ke liye
const inTz = (field) => ({ date: field, timezone: STORE_TIMEZONE });

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
    pendingReviews,
    refundsDue,
    outOfStock,
  ] = await Promise.all([
    // 1. Total revenue (paid, cancel/return nahi hue orders - cancelled order refund ke liye hai, kamai nahi)
    Order.aggregate([
      { $match: REVENUE_MATCH },
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
          ...REVENUE_MATCH,
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

    // 8. Low stock products (stock <= product ka apna lowStockThreshold, default 10)
    Product.find({
      isActive: true,
      $expr: { $lte: ["$stock", { $ifNull: ["$lowStockThreshold", 10] }] },
    })
      .select("name stock sku images lowStockThreshold")
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
          ...REVENUE_MATCH,
          createdAt: { $gte: startOfMonthInTz(today, 5) },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: inTz("$createdAt") },
            month: { $month: inTz("$createdAt") },
          },
          revenue: { $sum: "$pricing.total" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),

    // 12. Kaam baaki: approve hone wale reviews, refund baaki orders, out-of-stock products
    Review.countDocuments({ isApproved: { $ne: true }, isRejected: { $ne: true } }),
    Order.countDocuments(REFUND_DUE_FILTER),
    Product.countDocuments({ isActive: true, deletedAt: null, stock: { $lte: 0 } }),
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
      pendingReviews,
      refundsDue,
      outOfStock,
    }, "Dashboard data fetched")
  );
});

// ─── GET /api/admin/analytics/sales ──────────────────────────────────────────
// Query: ?period=monthly|weekly|daily  &from=YYYY-MM-DD  &to=YYYY-MM-DD

export const getSalesAnalytics = asyncHandler(async (req, res) => {
  const { period = "monthly", from, to } = req.query;

  const fromDate = from ? startOfDay(new Date(from)) : startOfMonthInTz(new Date(), 11);
  const toDate = to ? endOfDay(new Date(to)) : endOfDay(new Date());

  let groupBy;
  if (period === "daily") {
    groupBy = {
      year: { $year: inTz("$createdAt") },
      month: { $month: inTz("$createdAt") },
      day: { $dayOfMonth: inTz("$createdAt") },
    };
  } else if (period === "weekly") {
    groupBy = {
      year: { $isoWeekYear: inTz("$createdAt") },
      week: { $isoWeek: inTz("$createdAt") },
    };
  } else {
    // monthly (default)
    groupBy = {
      year: { $year: inTz("$createdAt") },
      month: { $month: inTz("$createdAt") },
    };
  }

  const data = await Order.aggregate([
    {
      $match: {
        ...REVENUE_MATCH,
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
    { $match: REVENUE_MATCH },
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
    const rx = new RegExp(escapeRegex(String(search).trim().slice(0, 60)), "i");
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }

  const sortMap = {
    createdAt: { createdAt: -1 },
    name: { name: 1 },
    orders: { ordersCount: -1, createdAt: -1 },
  };

  // Aggregation, kyunki har customer ke saath ordersCount/totalSpent chahiye
  // (list ka "Orders" column aur sort-by-orders isi par chalta hai).
  // NOTE: aggregate() Mongoose ke `select: false` aur toJSON ko bypass karta hai,
  // isliye sensitive fields neeche $project mein khud hataye hain.
  const [customers, total] = await Promise.all([
    User.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: "orders",
          let: { uid: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$userId", "$$uid"] } } },
            {
              $group: {
                _id: null,
                ordersCount: { $sum: 1 },
                // Sirf paid aur cancel/return na hue orders (refund hua paisa "spent" nahi)
                totalSpent: {
                  $sum: {
                    $cond: [
                      { $and: [
                        { $eq: ["$paymentStatus", "paid"] },
                        { $not: [{ $in: ["$orderStatus", FINAL_STATUSES] }] },
                      ] },
                      "$pricing.total",
                      0,
                    ],
                  },
                },
              },
            },
          ],
          as: "orderStats",
        },
      },
      {
        $addFields: {
          ordersCount: { $ifNull: [{ $arrayElemAt: ["$orderStats.ordersCount", 0] }, 0] },
          totalSpent: { $ifNull: [{ $arrayElemAt: ["$orderStats.totalSpent", 0] }, 0] },
        },
      },
      { $sort: sortMap[sort] || sortMap.createdAt },
      { $skip: skip },
      { $limit: limit },
      { $project: { password: 0, refreshToken: 0, otp: 0, googleId: 0, orderStats: 0, __v: 0 } },
    ]),
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
          $sum: {
            $cond: [
              { $and: [
                { $eq: ["$paymentStatus", "paid"] },
                { $not: [{ $in: ["$orderStatus", FINAL_STATUSES] }] },
              ] },
              "$pricing.total",
              0,
            ],
          },
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

  // Block karte waqt login session bhi khatam (protect already isActive dekhta hai,
  // ye refresh token se naya access token milne ka raasta band karta hai)
  const customer = await User.findOneAndUpdate(
    { _id: req.params.id, role: "customer" },
    isActive ? { isActive } : { isActive, refreshToken: null },
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

  // pending = abhi kisi ne dekha nahi; rejected = admin ne reject kiya (isRejected)
  const filter = {};
  if (statusParam === "approved") filter.isApproved = true;
  else if (statusParam === "pending") Object.assign(filter, { isApproved: { $ne: true }, isRejected: { $ne: true } });
  else if (statusParam === "rejected") filter.isRejected = true;

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
    { isApproved: true, isRejected: false, rejectionReason: "" },
    { new: true }
  );

  if (!review) throw new ApiError(404, "Review not found");

  // Recalculate product average rating
  await Review.updateProductRating(review.product);

  return res.status(200).json(new ApiResponse(200, review, "Review approved"));
});

// ─── PUT /api/admin/reviews/:id/reject ────────────────────────────────────────

export const rejectReview = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { isApproved: false, isRejected: true, rejectionReason: String(reason || "").slice(0, 200) },
    { new: true }
  );

  if (!review) throw new ApiError(404, "Review not found");

  // Pehle approved review ko hatane par product ki rating bhi wapas theek honi chahiye
  await Review.updateProductRating(review.product);

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

// ─── GET /api/settings/public ────────────────────────────────────────────────
// Public — checkout page needs the real tax/delivery numbers so what the
// customer sees before paying always matches what the order actually charges.
export const getPublicSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.getSingleton();
  return res.status(200).json(new ApiResponse(200, {
    taxRate: settings.taxRate,
    deliveryFee: settings.deliveryFee,
    freeDeliveryAbove: settings.freeDeliveryAbove,
    currency: settings.currency,
    storeName: settings.storeName,
    // Storefront ye dekhkar "store maintenance mein hai" banner dikhata hai
    maintenanceMode: !!settings.maintenanceMode,
  }, "Public settings fetched"));
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

  // Validation: galat value (tax -5%, khaali delivery fee) seedha order pricing bigaad deti hai
  const numberRules = {
    deliveryFee: [0, 100000],
    freeDeliveryAbove: [0, 10000000],
    taxRate: [0, 100],
  };
  for (const [key, [min, max]] of Object.entries(numberRules)) {
    if (updates[key] === undefined) continue;
    const n = Number(updates[key]);
    if (String(updates[key]).trim() === "" || !Number.isFinite(n) || n < min || n > max) {
      throw new ApiError(400, `${key} must be a number between ${min} and ${max}`);
    }
    updates[key] = n;
  }
  if (updates.storeName !== undefined) {
    updates.storeName = String(updates.storeName).trim().slice(0, 80);
    if (!updates.storeName) throw new ApiError(400, "Store name cannot be empty");
  }
  if (updates.storeEmail !== undefined) {
    updates.storeEmail = String(updates.storeEmail).trim();
    if (updates.storeEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.storeEmail)) {
      throw new ApiError(400, "Store email is not a valid email address");
    }
  }
  if (updates.storePhone !== undefined) updates.storePhone = String(updates.storePhone).trim().slice(0, 20);
  if (updates.storeAddress !== undefined) updates.storeAddress = String(updates.storeAddress).trim().slice(0, 200);
  if (updates.currency !== undefined) {
    updates.currency = String(updates.currency).trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(updates.currency)) throw new ApiError(400, "Currency must be a 3-letter code like INR");
  }
  if (updates.maintenanceMode !== undefined) updates.maintenanceMode = updates.maintenanceMode === true || updates.maintenanceMode === "true";

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

