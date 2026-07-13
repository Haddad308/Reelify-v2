// NEXT_PUBLIC_* vars must be referenced as static `process.env.NEXT_PUBLIC_X`
// literals — Next.js inlines them into the client bundle via static analysis
// at build time, so a dynamic `process.env[name]` helper (bracket access)
// silently resolves to undefined on the client even though the var exists.
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const authEnv = {
  region: required("NEXT_PUBLIC_COGNITO_REGION", process.env.NEXT_PUBLIC_COGNITO_REGION),
  userPoolId: required(
    "NEXT_PUBLIC_COGNITO_USER_POOL_ID",
    process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
  ),
  clientId: required(
    "NEXT_PUBLIC_COGNITO_CLIENT_ID",
    process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
  ),
  hostedUiDomain: required(
    "NEXT_PUBLIC_COGNITO_HOSTED_UI_DOMAIN",
    process.env.NEXT_PUBLIC_COGNITO_HOSTED_UI_DOMAIN,
  ),
  siteUrl: required("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL),
};

// In dev, route through the same-origin Next.js proxy (see next.config.ts
// rewrites) since api.reelify.cc doesn't send CORS headers for browser calls.
export const apiEnv = {
  apiBase:
    process.env.NODE_ENV === "development"
      ? "/api/reelify"
      : required("NEXT_PUBLIC_API_BASE", process.env.NEXT_PUBLIC_API_BASE),
  pilotWorkspaceId: required(
    "NEXT_PUBLIC_PILOT_WORKSPACE_ID",
    process.env.NEXT_PUBLIC_PILOT_WORKSPACE_ID,
  ),
};
