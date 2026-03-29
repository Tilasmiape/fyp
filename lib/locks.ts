import ReservationLock from '@/models/ReservationLock';

const DEFAULT_TTL_MS = 30_000;

function expiresAt(ttlMs: number) {
  return new Date(Date.now() + ttlMs);
}

export async function acquireSLock(key: string, ttlMs: number = DEFAULT_TTL_MS) {
  const lock = await ReservationLock.findOneAndUpdate(
    { key, xLock: { $ne: true } },
    { $inc: { sCount: 1 }, $set: { expiresAt: expiresAt(ttlMs) } },
    { upsert: true, new: true }
  );
  return Boolean(lock);
}

export async function releaseSLock(key: string) {
  const updated = await ReservationLock.findOneAndUpdate(
    { key, sCount: { $gt: 0 } },
    { $inc: { sCount: -1 } },
    { new: true }
  );
  if (updated && updated.sCount <= 0 && !updated.xLock) {
    await ReservationLock.deleteOne({ key });
  }
}

export async function acquireXLock(key: string, owner: string, ttlMs: number = DEFAULT_TTL_MS) {
  const lock = await ReservationLock.findOneAndUpdate(
    { key, xLock: { $ne: true }, $or: [{ sCount: { $exists: false } }, { sCount: 0 }] },
    { $set: { xLock: true, xOwner: owner, expiresAt: expiresAt(ttlMs) }, $setOnInsert: { sCount: 0 } },
    { upsert: true, new: true }
  );
  return Boolean(lock);
}

export async function releaseXLock(key: string, owner: string) {
  const updated = await ReservationLock.findOneAndUpdate(
    { key, xLock: true, xOwner: owner },
    { $set: { xLock: false, xOwner: null } },
    { new: true }
  );
  if (updated && updated.sCount <= 0) {
    await ReservationLock.deleteOne({ key });
  }
}
