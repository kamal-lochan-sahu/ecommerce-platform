#!/usr/bin/env python3
"""
Phase 4(d) — backend /api/admin/settings endpoint

Run this from the root of your ecommerce-platform repo:
    python3 phase4d_admin_settings.py

What it does:
  1. Creates backend/src/models/settings.model.js — a singleton
     Settings document (storeName, storeEmail, storePhone,
     storeAddress, currency, deliveryFee, freeDeliveryAbove, taxRate,
     maintenanceMode).
  2. Exports it from backend/src/models/index.js.
  3. Adds getSettings / updateSettings to
     backend/src/controllers/admin.controller.js
     (GET returns { settings }, PUT whitelists allowed fields only).
  4. Registers GET/PUT /settings in backend/src/routes/admin.routes.js
     (already behind the existing protect + adminOnly middleware).
  5. Cleans up frontend/src/pages/admin/Settings.jsx — removes the
     "Settings persistence coming soon" banner and the 404
     special-case error handling, since the endpoint now exists.

Verified locally: `node --check` on every touched backend file, and a
full `npm run build` on the frontend — both pass. DB round-trip
(GET/PUT actually hitting MongoDB Atlas) couldn't be tested in the
sandbox this was written in — no network path to Atlas from there —
so please smoke-test once against your real DB (see bottom of this
script's output).

Safe to re-run: skips a step if the target text isn't found (already
patched) instead of crashing.
"""
import os
import sys

ROOT = os.getcwd()
BACKEND_SRC = os.path.join(ROOT, "backend", "src")
FRONTEND_SRC = os.path.join(ROOT, "frontend", "src")

SETTINGS_MODEL_PATH = os.path.join(BACKEND_SRC, "models", "settings.model.js")
MODELS_INDEX_PATH = os.path.join(BACKEND_SRC, "models", "index.js")
ADMIN_CONTROLLER_PATH = os.path.join(BACKEND_SRC, "controllers", "admin.controller.js")
ADMIN_ROUTES_PATH = os.path.join(BACKEND_SRC, "routes", "admin.routes.js")
SETTINGS_JSX_PATH = os.path.join(FRONTEND_SRC, "pages", "admin", "Settings.jsx")

SETTINGS_MODEL_CONTENT = """import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  storeName: {
    type: String,
    default: 'Luxora',
  },
  storeEmail: {
    type: String,
    default: '',
  },
  storePhone: {
    type: String,
    default: '',
  },
  storeAddress: {
    type: String,
    default: '',
  },
  currency: {
    type: String,
    default: 'INR',
  },
  deliveryFee: {
    type: Number,
    default: 49,
  },
  freeDeliveryAbove: {
    type: Number,
    default: 499,
  },
  taxRate: {
    type: Number,
    default: 18,
  },
  maintenanceMode: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

// Store ka ek hi settings document hota hai — singleton pattern.
// Pehli baar fetch hone par, agar doc exist nahi karta, to defaults se bana dete hain.
settingsSchema.statics.getSingleton = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

const Settings = mongoose.model('Settings', settingsSchema);
export default Settings;
"""


def write_settings_model():
    if os.path.isfile(SETTINGS_MODEL_PATH):
        print("[skip] settings.model.js already exists")
        return
    os.makedirs(os.path.dirname(SETTINGS_MODEL_PATH), exist_ok=True)
    with open(SETTINGS_MODEL_PATH, "w") as f:
        f.write(SETTINGS_MODEL_CONTENT)
    print(f"[OK] wrote {SETTINGS_MODEL_PATH}")


def patch_models_index():
    with open(MODELS_INDEX_PATH, "r") as f:
        content = f.read()
    old = "export { default as LoyaltyPoints } from './loyaltyPoints.model.js';"
    new = old + "\nexport { default as Settings } from './settings.model.js';"
    if "settings.model.js" in content:
        print("[skip] models/index.js already exports Settings")
        return
    if old not in content:
        print("[WARN] models/index.js — LoyaltyPoints export line not found, patch manually")
        return
    content = content.replace(old, new, 1)
    with open(MODELS_INDEX_PATH, "w") as f:
        f.write(content)
    print(f"[OK] patched {MODELS_INDEX_PATH}")


def patch_admin_controller():
    with open(ADMIN_CONTROLLER_PATH, "r") as f:
        content = f.read()

    changed = False

    old_import = 'import { Order, Product, User, Review } from "../models/index.js";'
    new_import = 'import { Order, Product, User, Review, Settings } from "../models/index.js";'
    if old_import in content:
        content = content.replace(old_import, new_import, 1)
        changed = True
    elif "Settings } from" not in content:
        print("[WARN] admin.controller.js — import line not found, patch manually")

    old_tail = '''  return res.status(200).json(
    new ApiResponse(200, {
      products,
      outOfStock,
      threshold,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }, "Low stock products fetched")
  );
});'''
    new_tail = old_tail + '''

// \u2500\u2500\u2500 GET /api/admin/settings \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

export const getSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.getSingleton();
  return res.status(200).json(new ApiResponse(200, { settings }, "Settings fetched"));
});

// \u2500\u2500\u2500 PUT /api/admin/settings \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

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
});'''

    if "export const getSettings" in content:
        print("[skip] admin.controller.js already has getSettings/updateSettings")
    elif old_tail not in content:
        print("[WARN] admin.controller.js — getLowStockProducts tail not found, patch manually")
    else:
        content = content.replace(old_tail, new_tail, 1)
        changed = True

    if changed:
        with open(ADMIN_CONTROLLER_PATH, "w") as f:
            f.write(content)
        print(f"[OK] patched {ADMIN_CONTROLLER_PATH}")


def patch_admin_routes():
    with open(ADMIN_ROUTES_PATH, "r") as f:
        content = f.read()

    changed = False

    old_import = "  getLowStockProducts,\n} from \"../controllers/admin.controller.js\";"
    new_import = "  getLowStockProducts,\n  getSettings,\n  updateSettings,\n} from \"../controllers/admin.controller.js\";"
    if old_import in content:
        content = content.replace(old_import, new_import, 1)
        changed = True
    elif "getSettings" not in content:
        print("[WARN] admin.routes.js — import block not found, patch manually")

    old_route = 'router.get("/low-stock", getLowStockProducts);'
    new_route = old_route + '\n\n// Settings\nrouter.get("/settings", getSettings);\nrouter.put("/settings", updateSettings);'
    if "/settings\"" in content and 'router.get("/settings"' in content:
        print("[skip] admin.routes.js already has /settings routes")
    elif old_route not in content:
        print("[WARN] admin.routes.js — low-stock route line not found, patch manually")
    else:
        content = content.replace(old_route, new_route, 1)
        changed = True

    if changed:
        with open(ADMIN_ROUTES_PATH, "w") as f:
            f.write(content)
        print(f"[OK] patched {ADMIN_ROUTES_PATH}")


def patch_settings_jsx():
    with open(SETTINGS_JSX_PATH, "r") as f:
        content = f.read()

    changed = False

    old = "import { Save, Store, Globe, AlertCircle, Loader } from 'lucide-react'"
    new = "import { Save, Store, Globe, Loader } from 'lucide-react'"
    if old in content:
        content = content.replace(old, new, 1)
        changed = True

    old_query = """  const { isLoading: loadingSettings } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => api.get('/admin/settings').then(r => r.data?.data?.settings),
    onSuccess: (data) => { if (data) setForm(prev => ({ ...prev, ...data })); },
    retry: false,
    // Backend settings API not yet implemented — graceful fail
    onError: () => {},
  })

  const mutation = useMutation({
    mutationFn: (d) => api.put('/admin/settings', d),
    onSuccess: () => toast.success('Settings saved!'),
    onError: (err) => {
      const msg = err?.response?.data?.message || 'Failed to save settings'
      // 404 means backend route not yet implemented
      if (err?.response?.status === 404) {
        toast.error('Settings API not yet configured on backend')
      } else {
        toast.error(msg)
      }
    },
  })"""
    new_query = """  const { isLoading: loadingSettings } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => api.get('/admin/settings').then(r => r.data?.data?.settings),
    onSuccess: (data) => { if (data) setForm(prev => ({ ...prev, ...data })); },
  })

  const mutation = useMutation({
    mutationFn: (d) => api.put('/admin/settings', d),
    onSuccess: () => toast.success('Settings saved!'),
    onError: (err) => {
      const msg = err?.response?.data?.message || 'Failed to save settings'
      toast.error(msg)
    },
  })"""
    if old_query in content:
        content = content.replace(old_query, new_query, 1)
        changed = True

    old_banner = """        {/* API status notice */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Settings persistence coming soon</p>
            <p className="text-amber-700 text-xs mt-0.5">
              Changes are not yet saved to the database. Backend /api/admin/settings endpoint needs to be implemented.
            </p>
          </div>
        </div>

        {SECTIONS.map(({ icon: Icon, title, fields }) => ("""
    new_banner = "        {SECTIONS.map(({ icon: Icon, title, fields }) => ("
    if old_banner in content:
        content = content.replace(old_banner, new_banner, 1)
        changed = True

    if not changed:
        print("[skip] Settings.jsx already patched or target text not found")
        return

    with open(SETTINGS_JSX_PATH, "w") as f:
        f.write(content)
    print(f"[OK] patched {SETTINGS_JSX_PATH}")


def main():
    if not os.path.isdir(BACKEND_SRC) or not os.path.isdir(FRONTEND_SRC):
        print("[ERROR] Run this script from the repo root (the folder that contains "
              "'frontend/' and 'backend/').")
        sys.exit(1)

    write_settings_model()
    patch_models_index()
    patch_admin_controller()
    patch_admin_routes()
    patch_settings_jsx()

    print("\nDone. Now verify with:")
    print("  node --check backend/src/models/settings.model.js")
    print("  node --check backend/src/models/index.js")
    print("  node --check backend/src/controllers/admin.controller.js")
    print("  node --check backend/src/routes/admin.routes.js")
    print("  cd frontend && npm run build")
    print()
    print("Then SMOKE-TEST against your real DB (I couldn't reach MongoDB Atlas")
    print("from my sandbox to test this round-trip):")
    print("  1. Start backend locally (or hit Render once deployed)")
    print("  2. Login as admin, open Settings page in the UI")
    print("  3. Change a field, click 'Save All Settings' — should toast success,")
    print("     no more 404")
    print("  4. Refresh the page — the saved value should still be there")


if __name__ == "__main__":
    main()
