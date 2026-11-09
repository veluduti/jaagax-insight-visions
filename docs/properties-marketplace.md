# Properties marketplace

- `/search` and `/search?tab=properties` use the reference-led property marketplace; legacy project/agent/transaction tabs retain their existing page.
- Reads existing live properties through a narrow listing projection and normalizes approved `final_data` before filtering. Drafts, non-live lifecycle states and expired records are excluded even for privileged viewers.
- Search, category/type, transaction, bedrooms, budgets, possession status, amenities and listed-by filters derive results and counts from live rows; URL state supports reload and navigation. Pagination uses 12 results; sorting applies before pagination.
- Uses existing authenticated favorites services with optimistic rollback. Anonymous saves lead to sign-in with the search destination preserved.
- Details and contact links open the existing property page in a new tab. Contact is anchored at its existing sign-in gate. Agent labels use public codes, not private names/contact fields.
- Maps share filtered results and use saved coordinates only. Missing coordinates never receive approximate markers.
- Owner/agent posting, edits, verification and admin approval stay in existing workflows; no tables, permissions or approval states were changed.

## Verification and limitations

Verified public Hyderabad search (one live row), all-city search (four live rows), combined Medchal/2-bed/budget/Parking match, empty search, grid/list and expanded map controls, authenticated save/reload/remove, new-tab details, sign-in return, desktop and 695px/390px layouts without overflow. Property regression tests passed.

All four live rows currently lack coordinates, so actual rendered map markers cannot be verified with current inventory. Owners/agents must save real coordinates through the existing location/verification workflow; this implementation does not alter their data. New posting and multi-role approval transitions were reviewed in source, not re-executed with test accounts. No property records, payments or reservations were created.

The existing public non-draft SELECT policy is broader than the marketplace's approved-only display predicate. Discovery narrows its own query but does not claim to remediate unrelated direct-API column exposure or change existing sneak-peek permissions.