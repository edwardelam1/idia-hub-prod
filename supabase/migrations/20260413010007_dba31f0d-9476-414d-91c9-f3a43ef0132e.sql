-- Drop the old constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_account_type_check;

-- Normalize any non-standard values to 'individual'
UPDATE public.profiles
SET account_type = 'individual'
WHERE account_type NOT IN ('individual', 'business') OR account_type IS NULL;

-- Re-apply with correct allowed values
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_account_type_check
CHECK (account_type IN ('individual', 'business'));