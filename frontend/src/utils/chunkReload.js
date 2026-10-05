// After a new deploy, a tab that is already open still points at the OLD hashed
// JS files (Home-AbC123.js, ...). Vercel no longer serves them, so lazy routes
// fail with "Failed to fetch dynamically imported module" and the app shows
// "Something went wrong". One reload fetches the new index.html + chunks.
const CHUNK_ERROR_RE =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;

export const isChunkLoadError = (error) => CHUNK_ERROR_RE.test(String(error?.message ?? error ?? ""));

// Reloads at most once per 10 seconds so a genuinely broken deploy cannot cause
// an endless reload loop. Returns true if a reload was triggered.
export const reloadOnceForStaleChunk = () => {
  try {
    const last = Number(sessionStorage.getItem("chunk-reload-at") || 0);
    if (Date.now() - last < 10000) return false;
    sessionStorage.setItem("chunk-reload-at", String(Date.now()));
  } catch {
    // sessionStorage blocked (private mode etc.) - still reload once
  }
  window.location.reload();
  return true;
};
