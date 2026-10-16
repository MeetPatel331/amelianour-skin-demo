/**
 * matchingEngine.js — client access to shade matching. [Phase 6/8]
 *
 * The client runs the SAME pure matching engine the Node API uses, against the
 * bundled catalogue, so the front-end works standalone (no server) and deploys
 * as a static site. `shadeMatching.js` here is GENERATED from the canonical
 * server copy by `data/build-products.mjs` — edit the server one, not this.
 * `getRecommendations` is async and API-shaped, so it can be swapped for the
 * Node API (productApi.getRecommendations) or Shopify later without UI changes.
 */
import { validateRequest, recommend } from './shadeMatching.js';
import catalogue from '../data/products.json';

export async function getRecommendations({ skin, preferences } = {}) {
  const v = validateRequest({ skin, preferences });
  if (!v.ok) return { status: 'invalid_request', message: 'Invalid skin analysis or preferences.', errors: v.errors };
  return recommend(v.value, catalogue.products);
}

export default { getRecommendations };
