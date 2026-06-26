-- Fix: profiles.phone was UNIQUE NOT NULL with '' default for email users,
-- meaning the second email-auth user would violate the unique constraint.
-- Solution: make phone nullable, keep unique only for non-null values.

ALTER TABLE friendspot.profiles
  ALTER COLUMN phone DROP NOT NULL;

-- Drop the plain unique constraint and replace with a partial unique index
-- so that NULL phones are allowed but duplicate non-null phones are still blocked.
ALTER TABLE friendspot.profiles
  DROP CONSTRAINT IF EXISTS profiles_phone_key;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique
  ON friendspot.profiles (phone)
  WHERE phone IS NOT NULL AND phone <> '';

-- Update the trigger to insert NULL for email-only users instead of ''
CREATE OR REPLACE FUNCTION friendspot.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO friendspot.profiles (id, phone, display_name)
  VALUES (
    NEW.id,
    NULLIF(COALESCE(NEW.phone, ''), ''),  -- NULL if no phone
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Friend')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Re-attach trigger (in case it was attached to the wrong schema function)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE friendspot.handle_new_user();
