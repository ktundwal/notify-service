# Cross-Model Review — Sample Output

> This is a real review produced during a tutorial run. The lead agent ran `/crossmodel-review` on the three feature files after they were built and wired. Google and OpenAI models reviewed independently, then the lead synthesized the findings below.

## src/middleware/auth.ts

**Agreement (both models flagged):**
- **Hardcoded credentials** — API keys (`notify-dev-key`, `notify-prod-key`) are hardcoded in source. Should be loaded from environment variables (e.g., `process.env.API_KEYS`).

**OpenAI only:**
- **Timing attack** — `includes` check is susceptible to timing attacks. Low risk for short strings, but `crypto.timingSafeEqual` would be more secure.

**Lead's assessment:** Hardcoded keys are intentional for the tutorial (known test keys in the acceptance tests). In production, yes — env vars. Timing attack is valid but out of scope for this exercise.

## src/services/rate-limiter.ts

**Agreement (both models flagged):**
- **Memory leak (DoS)** — The `sources` Map grows indefinitely. An attacker sending random `sourceId` values could exhaust server memory.

**Google only:**
- **Concurrency** — In-memory rate limiting doesn't work across multiple server instances/processes.

**OpenAI only:**
- **Shared bucket** — If `sourceId` is missing, all requests share the `'unknown'` bucket. One client can block others.

**Lead's assessment:** Memory leak is a real issue worth noting. Concurrency is out of scope (single-process tutorial). Shared bucket is a good catch — the fallback to `'unknown'` masks a missing field.

## src/routes/stats.ts

**Agreement (both models flagged):**
- **Missing authentication** — `/stats` is mounted publicly without `authMiddleware`. Anyone can access notification statistics.

**Google only:**
- **Blocking I/O** — `better-sqlite3` is synchronous. A slow stats query blocks the Node.js event loop.

**OpenAI only:**
- **Hardcoded window** — The 60-minute lookback is hardcoded with no way to configure it.

**Lead's assessment:** Missing auth on `/stats` is a real gap — the acceptance tests don't require it, but production would. Blocking I/O is inherent to better-sqlite3 and acceptable for this use case. Hardcoded window is fine per the spec.

---

## Summary

| Finding | Source | Severity | Action |
|---------|--------|----------|--------|
| Hardcoded API keys | Both | High (production) | Intentional for tutorial — noted |
| Memory leak in rate limiter | Both | Medium | Real issue — would fix in production |
| Missing auth on /stats | Both | Medium | Not in spec, but worth noting |
| Timing attack on key comparison | OpenAI | Low | Out of scope |
| No cross-process rate limiting | Google | Low | Out of scope (single process) |
| Shared 'unknown' bucket | OpenAI | Low | Good catch — minor |
| Blocking synchronous I/O | Google | Low | Inherent to better-sqlite3 |
| Hardcoded 60-min window | OpenAI | Info | Per spec |

**High-confidence findings** (both models agree): 3
**Disagreements requiring human judgment:** 5
**Action taken:** 0 code changes (all findings are out of scope for the tutorial, but documented for production awareness)
