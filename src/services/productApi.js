/**
 * productApi.js — the client's product-catalogue interface.
 *
 * This is the SINGLE seam between the UI and where product data comes from.
 * For the static MVP it reads the bundled `products.json` directly (simple
 * prototype). Later it can be swapped to call the Node API (`/api/...`) or a
 * Shopify Storefront integration WITHOUT changing any component or the
 * matching engine — see README "Future Shopify migration".
 *
 * Everything here is DEMO data. Prices/availability are not live store data.
 */
import catalogue from '../data/products.json';

/** Catalogue-level metadata incl. the demo/price/lab disclaimers. */
export function getCatalogueMeta() {
  return catalogue.meta;
}

/** All products, optionally filtered by category (e.g. 'foundation'). */
export function getProducts({ category } = {}) {
  const list = catalogue.products;
  return category ? list.filter((p) => p.category === category) : list;
}

export function getProductById(id) {
  return catalogue.products.find((p) => p.id === id) || null;
}

/** Shades of a product that are marked available in the static dataset. */
export function getAvailableShades(product) {
  if (!product) return [];
  return product.shades.filter((s) => s.available);
}

/** Distinct categories present in the catalogue. */
export function getCategories() {
  return [...new Set(catalogue.products.map((p) => p.category))];
}

/**
 * Request ranked recommendations from the Node matching API.
 *
 * The real matching engine lands in Phase 6/7; this seam is defined now so
 * components can be wired against it. Until then the server returns a clearly
 * marked "not yet implemented" response.
 *
 * @param {object} payload { skin: {depth, undertone, reliable}, preferences }
 */
export async function getRecommendations(payload) {
  const res = await fetch('/api/recommendations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Recommendation request failed (${res.status})`);
  }
  return res.json();
}

export default {
  getCatalogueMeta,
  getProducts,
  getProductById,
  getAvailableShades,
  getCategories,
  getRecommendations,
};
