// Customer/admin ka likha text (naam, courier, cancel reason) email HTML mein jaata hai.
// Bina escape ke "<script>" ya "<a href=...>" email mein asli HTML ban jaata hai (injection).
const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => MAP[c]);
