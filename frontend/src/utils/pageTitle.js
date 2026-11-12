// Browser tab ka title: "<Page> | <Store>" ya sirf "<Store> — <tagline>".
// Page title alag se set hota hai (usePageTitle), store ka naam Admin -> Settings se aata hai; dono ek jagah milte hain.
let brand = { name: '', tagline: '' };
let current = null;

const render = () => {
  if (typeof document === 'undefined' || !brand.name) return;
  const base = brand.tagline ? `${brand.name} — ${brand.tagline}` : brand.name;
  document.title = current ? `${current} | ${brand.name}` : base;
};

export const setBrandTitle = (name, tagline = '') => {
  brand = { name: name || '', tagline: tagline || '' };
  render();
};

export const setPageTitle = (title) => {
  current = title ? String(title) : null;
  render();
};
