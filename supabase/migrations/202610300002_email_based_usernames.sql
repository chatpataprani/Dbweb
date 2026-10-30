-- Replace manually chosen/alias usernames with email-derived usernames.
-- A short user-ID suffix keeps usernames unique without exposing the full email.
update public.profiles as p
set username =
  left(
    coalesce(
      nullif(
        trim(both '_' from regexp_replace(split_part(coalesce(u.email, p.email, ''), '@', 1), '[^a-zA-Z0-9_]', '', 'g')),
        ''
      ),
      'user'
    ),
    15
  ) || '_' || lower(substr(replace(p.id::text, '-', ''), 1, 6))
from auth.users as u
where u.id = p.id
  and u.email is not null;

-- Keep the existing username format constraint compatible with generated values:
-- <email-local-part>_<six-character-user-id-suffix>
