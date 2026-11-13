// Product image load na ho (link toot gaya, host down) to toota hua icon ki jagah neutral placeholder dikhao.
// Data URI hai, isliye kisi bahar ki service par depend nahi.
export const PLACEHOLDER_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">' +
    '<rect width="400" height="400" fill="#f3f4f6"/>' +
    '<g fill="none" stroke="#9ca3af" stroke-width="12" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="120" y="140" width="160" height="120" rx="14"/><circle cx="170" cy="185" r="14"/>' +
    '<path d="M130 250l50-50 35 35 25-25 30 30"/></g></svg>'
  );

export const onImageError = (e) => {
  const img = e.currentTarget;
  img.onerror = null; // loop se bachao
  img.removeAttribute('srcset');
  img.src = PLACEHOLDER_IMAGE;
};
