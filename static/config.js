/* Supabase project for optional sign-in + sync (see docs/NEXT_STEPS.md).
   The publishable key is meant to be public: row-level security on the `progress` table limits each
   signed-in user to their own row. Never put the secret / service_role key here.
   Leave both values empty to turn sync off. */
window.PG_CONFIG = {
  supabaseUrl: 'https://qrmtkzktkpjsjebeiqqu.supabase.co',
  supabaseKey: 'sb_publishable_ic8PMNjvu1bJXpAcjqT5zw_tg-ncVBw',
};
