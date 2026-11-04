// Edge function: identity-verification-intake
// Identity Verification Utility intake (see ../_shared/identity-verification.ts).
import { handleIdentityVerificationIntake } from "../_shared/identity-verification.ts";

Deno.serve((req) => handleIdentityVerificationIntake(req, "identity-verification-intake"));
