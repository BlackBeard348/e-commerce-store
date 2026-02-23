# MVP Requirement Checklist

## Implemented in this branch

- [x] REQ-AUTH-001 signup (`POST /api/auth/signup`)
- [x] REQ-AUTH-002 login/logout (`POST /api/auth/login`, `POST /api/auth/logout`)
- [x] REQ-AUTH-003 password reset flow (`POST /api/auth/password/forgot`, `POST /api/auth/password/reset`)
- [x] REQ-AUTH-005 auth rate limiting with `429` and trace-aware logs
- [x] REQ-CAT-001 paginated listing (`GET /api/products`)
- [x] REQ-CAT-002 product detail (`GET /api/products/:id`)
- [x] REQ-CAT-003 category filtering (`category`, `minPrice`, `maxPrice`, `sort`, `page`, `limit`)
- [x] REQ-SRCH-001 keyword search (`query` via Mongo text index)
- [x] REQ-SRCH-002 URL-query-state for search/filter/sort/page in SPA
- [x] REQ-CART-001 add to cart (guest + authenticated)
- [x] REQ-CART-002 update/remove cart items
- [x] REQ-CART-003 stock validation before checkout
- [x] REQ-CHK-001 checkout requires authentication
- [x] REQ-CHK-002 shipping address validation (required + basic country/postcode)
- [x] REQ-CHK-003 hosted-checkout compatible response (`checkoutUrl`)
- [x] REQ-CHK-004 idempotent checkout using `Idempotency-Key`
- [x] REQ-CHK-005 webhook signature + idempotent event handling (`providerEventId`)
- [x] REQ-ORD-001 order snapshots + totals + statuses persisted
- [x] REQ-ORD-002 customer order history/detail (scoped to own orders)
- [x] REQ-DATA-001 unique `users.email` index
- [x] REQ-DATA-002 `orders.userId + createdAt` index
- [x] REQ-DATA-003 unique `orders.orderNumber` index
- [x] REQ-DATA-004 product text index (`name`, `description`)
- [x] REQ-DATA-005 product filter index (`active`, `category`, `priceCents`)
- [x] REQ-API-010 idempotent replay of checkout request
- [x] REQ-API-011 webhook replay-safe processing
- [x] REQ-DEV-001 docker compose starts web + api + mongodb
- [x] REQ-DEV-002 deterministic seed script for ~1,000 products

## Partially implemented

- [~] REQ-CHK-006 confirmation email: deferred (dev reset token and webhook flow in place; provider integration pending)
- [~] REQ-UX-001 loading/empty/error states implemented for catalog; not yet across all future screens

## Not yet implemented

- [ ] Wishlist requirements (REQ-WL-001/002/003)
- [ ] Cart merge on login (REQ-CART-004)
- [ ] Admin product/order APIs (REQ-ADM-001/002/003)
- [ ] Full accessibility pass across all required screens (REQ-A11Y-001..005)
- [ ] Confirmation page + end-to-end payment provider + email provider integrations
