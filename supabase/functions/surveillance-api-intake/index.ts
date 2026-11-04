// Legacy endpoint name kept so integrations issued before the rename keep working.
// Behaviour is identical to identity-verification-intake.
import { handleIdentityVerificationIntake } from "../_shared/identity-verification.ts";

Deno.serve((req) => handleIdentityVerificationIntake(req, "legacy-intake-alias"));
