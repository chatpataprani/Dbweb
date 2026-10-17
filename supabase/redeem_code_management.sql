-- Dbweb redeem-code management migration. Run in Supabase SQL Editor.
-- Stores newly created code text so admins can view/copy it later.
alter table public.redeem_codes add column if not exists code_value text;
-- Existing codes cannot be reconstructed from their SHA-256 hashes; they remain preview-only.
