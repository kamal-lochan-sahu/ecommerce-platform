// One-time migration for phone verification. Run it BEFORE deploying the new backend:
//
//   cd backend
//   node scripts/migrate-phone-verification.js --dry-run     (shows what it WOULD do)
//   node scripts/migrate-phone-verification.js               (does it)
//   node scripts/migrate-phone-verification.js --verify-phones=9000000020,9000000021
//
// What it does:
//  1. Accounts created by phone-OTP signup (placeholder email phone_XXX@luxora.local)
//     already proved their number -> mark isPhoneVerified = true.
//     (--verify-phones lets you also mark specific numbers, e.g. your own test accounts.)
//  2. Everyone else gets isPhoneVerified = false (their number is unverified until they
//     verify it from Profile).
//  3. Drops the old "phone must be unique across ALL users" index and creates
//     "phone must be unique across VERIFIED users" (phone_verified_unique).
import 'dotenv/config';
import mongoose from 'mongoose';

const DRY = process.argv.includes('--dry-run');
const extraArg = process.argv.find((a) => a.startsWith('--verify-phones='));
const extraPhones = extraArg ? extraArg.split('=')[1].split(',').map((p) => p.trim()).filter(Boolean) : [];

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set (backend/.env). Aborting.');
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI);
const users = mongoose.connection.collection('users');
console.log(`${DRY ? '[DRY RUN] ' : ''}Connected to ${mongoose.connection.name}`);

// 1. phone-OTP signups
const placeholderFilter = {
  email: { $regex: /@luxora\.local$/i },
  phone: { $type: 'string' },
  isPhoneVerified: { $ne: true },
};
const n1 = await users.countDocuments(placeholderFilter);
console.log(`1. Phone-signup accounts to mark verified: ${n1}`);
if (!DRY && n1) await users.updateMany(placeholderFilter, { $set: { isPhoneVerified: true, phoneVerifiedAt: new Date() } });

if (extraPhones.length) {
  const f = { phone: { $in: extraPhones }, isPhoneVerified: { $ne: true } };
  const n = await users.countDocuments(f);
  console.log(`   Extra phones to mark verified (${extraPhones.join(', ')}): ${n}`);
  if (!DRY && n) await users.updateMany(f, { $set: { isPhoneVerified: true, phoneVerifiedAt: new Date() } });
}

// 2. default for everyone else
const n2 = await users.countDocuments({ isPhoneVerified: { $exists: false } });
console.log(`2. Accounts to default to isPhoneVerified=false: ${n2}`);
if (!DRY && n2) await users.updateMany({ isPhoneVerified: { $exists: false } }, { $set: { isPhoneVerified: false } });

// 3. indexes
const indexes = await users.indexes();
const old = indexes.find((i) => i.name === 'phone_1');
console.log(`3. Old index phone_1: ${old ? 'found -> will drop' : 'not present'}`);
if (!DRY && old) await users.dropIndex('phone_1');
const has = indexes.find((i) => i.name === 'phone_verified_unique');
console.log(`   New index phone_verified_unique: ${has ? 'already exists' : 'will create'}`);
if (!DRY && !has) {
  await users.createIndex(
    { phone: 1 },
    { name: 'phone_verified_unique', unique: true, partialFilterExpression: { isPhoneVerified: true } }
  );
}

const total = await users.countDocuments({});
const verified = await users.countDocuments({ isPhoneVerified: true });
console.log(`Done. Users: ${total}, phone-verified: ${verified}${DRY ? '  (dry run - nothing was changed)' : ''}`);
await mongoose.disconnect();
