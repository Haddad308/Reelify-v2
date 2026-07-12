function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const authEnv = {
  region: requireEnv("NEXT_PUBLIC_COGNITO_REGION"),
  userPoolId: requireEnv("NEXT_PUBLIC_COGNITO_USER_POOL_ID"),
  clientId: requireEnv("NEXT_PUBLIC_COGNITO_CLIENT_ID"),
  hostedUiDomain: requireEnv("NEXT_PUBLIC_COGNITO_HOSTED_UI_DOMAIN"),
  siteUrl: requireEnv("NEXT_PUBLIC_SITE_URL"),
};

export const apiEnv = {
  apiBase: requireEnv("NEXT_PUBLIC_API_BASE"),
  pilotWorkspaceId: requireEnv("NEXT_PUBLIC_PILOT_WORKSPACE_ID"),
};
