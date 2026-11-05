// Variant options ke helpers (storefront VariantSelector aur ProductDetail dono use karte hain)

// Variants ke options se groups: [{ name: "Color", values: ["Red", "Blue"] }, { name: "Size", ... }]
export function getOptionGroups(variants = []) {
  const groups = [];
  for (const v of variants) {
    for (const o of v.options || []) {
      let g = groups.find((x) => x.name.toLowerCase() === o.name.toLowerCase());
      if (!g) {
        g = { name: o.name, values: [] };
        groups.push(g);
      }
      if (!g.values.some((val) => val.toLowerCase() === o.value.toLowerCase())) g.values.push(o.value);
    }
  }
  return groups;
}

export const valueOf = (variant, name) =>
  variant?.options?.find((o) => o.name.toLowerCase() === name.toLowerCase())?.value;

export const sameValue = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

// Customer ne `name` option ki `value` chuni: sabse milta-julta variant dhoondo.
// Pehle wo jo stock mein ho, phir jisme baaki chuni hui options (size, color...) bachi rahein.
export function pickVariant(variants, current, name, value) {
  const matches = variants.filter((v) => sameValue(valueOf(v, name), value));
  if (matches.length === 0) return current;
  const kept = (v) =>
    (current?.options || []).filter(
      (o) => o.name.toLowerCase() !== name.toLowerCase() && sameValue(valueOf(v, o.name), o.value)
    ).length;
  return [...matches].sort(
    (a, b) => Number(b.stock > 0) - Number(a.stock > 0) || kept(b) - kept(a)
  )[0];
}
