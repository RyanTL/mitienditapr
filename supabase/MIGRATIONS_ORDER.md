# SQL migration order

Apply **`supabase/schema.sql` first**, then every file below **in this order** (lexicographic by filename). Do not skip files.

1. `migrations/20260218_vendor_mvp.sql`
2. `migrations/20260226_product_reviews.sql`
3. `migrations/20260227_shop_share_codes.sql`
4. `migrations/20260228_account_profile_fields.sql`
5. `migrations/20260301_shop_follows_guard.sql`
6. `migrations/20260307_vendor_policy_system.sql`
7. `migrations/20260308_vendor_access_codes.sql`
8. `migrations/20260309_optional_stock_qty.sql`
9. `migrations/20260310_ath_movil_payment.sql`
10. `migrations/20260326_fix_orders_rls_recursion.sql`
11. `migrations/20260328_profile_zip_code.sql`
12. `migrations/20260406_fast_sell_default_shop_policies.sql`
13. `migrations/20260406_marketplace_payment_workflow.sql`
14. `migrations/20260411_marketplace_payment_workflow_patch.sql`
15. `migrations/20260411_shop_contact_fields.sql`

After all migrations, run `supabase/verify_live_readiness.sql` and confirm the result includes `LIVE_READINESS_OK`.

Repeat this sequence for **each** Supabase project (production and develop/staging).
