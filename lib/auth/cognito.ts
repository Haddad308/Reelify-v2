import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  CognitoUserSession,
} from "amazon-cognito-identity-js";
import { authEnv } from "./env";

let pool: CognitoUserPool | null = null;

function getPool(): CognitoUserPool {
  if (!pool) {
    pool = new CognitoUserPool({
      UserPoolId: authEnv.userPoolId,
      ClientId: authEnv.clientId,
    });
  }
  return pool;
}

export interface AuthSession {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  /** epoch ms */
  expiresAt: number;
  email: string;
  name: string;
}

function sessionFromCognito(
  session: CognitoUserSession,
  fallbackEmail?: string,
): AuthSession {
  const idPayload = session.getIdToken().payload as Record<string, unknown>;
  return {
    accessToken: session.getAccessToken().getJwtToken(),
    idToken: session.getIdToken().getJwtToken(),
    refreshToken: session.getRefreshToken().getToken(),
    expiresAt: session.getAccessToken().getExpiration() * 1000,
    email: (idPayload.email as string) ?? fallbackEmail ?? "",
    name: (idPayload.name as string) ?? (idPayload.email as string) ?? "",
  };
}

export function signUp(
  email: string,
  password: string,
  fullName: string,
): Promise<{ userConfirmed: boolean }> {
  return new Promise((resolve, reject) => {
    const attributes = [
      new CognitoUserAttribute({ Name: "email", Value: email }),
      new CognitoUserAttribute({ Name: "name", Value: fullName }),
    ];
    getPool().signUp(email, password, attributes, [], (err, result) => {
      if (err || !result) return reject(err);
      resolve({ userConfirmed: result.userConfirmed });
    });
  });
}

export function confirmSignUp(email: string, code: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: getPool() });
    user.confirmRegistration(code, true, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

export function resendConfirmationCode(email: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: getPool() });
    user.resendConfirmationCode((err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

export function signIn(email: string, password: string): Promise<AuthSession> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: getPool() });
    const details = new AuthenticationDetails({
      Username: email,
      Password: password,
    });
    user.authenticateUser(details, {
      onSuccess: (session) => resolve(sessionFromCognito(session, email)),
      onFailure: (err) => reject(err),
    });
  });
}

export function signOut(): void {
  const user = getPool().getCurrentUser();
  user?.signOut();
  clearHostedUiHydratedUser();
}

export function forgotPassword(email: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: getPool() });
    user.forgotPassword({
      onSuccess: () => resolve(),
      onFailure: (err) => reject(err),
    });
  });
}

export function confirmPassword(
  email: string,
  code: string,
  newPassword: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: getPool() });
    user.confirmPassword(code, newPassword, {
      onSuccess: () => resolve(),
      onFailure: (err) => reject(err),
    });
  });
}

/**
 * Resolves the current session, silently refreshing via the stored refresh
 * token if the access token has expired. Returns null if there's no signed-in
 * user (nothing in storage) — that's a normal "logged out" state, not an error.
 */
export function getCurrentSession(): Promise<AuthSession | null> {
  return new Promise((resolve, reject) => {
    const user = getPool().getCurrentUser();
    if (!user) return resolve(null);
    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err) return reject(err);
      if (!session || !session.isValid()) return resolve(null);
      resolve(sessionFromCognito(session));
    });
  });
}

export function buildHostedUiGoogleUrl(): string {
  const redirectUri = `${authEnv.siteUrl}/auth/callback`;
  const params = new URLSearchParams({
    identity_provider: "Google",
    response_type: "code",
    client_id: authEnv.clientId,
    redirect_uri: redirectUri,
    scope: "openid email profile",
  });
  return `https://${authEnv.hostedUiDomain}/oauth2/authorize?${params.toString()}`;
}

interface HostedUiTokenResponse {
  access_token: string;
  id_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const [, payload] = token.split(".");
  const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
  return JSON.parse(json);
}

/**
 * Writes hosted-UI-issued tokens into the same localStorage shape
 * amazon-cognito-identity-js uses internally, keyed by username, so that
 * `getCurrentSession()` (and its automatic refresh) keeps working for
 * sessions that started via the Google federated redirect rather than
 * `signIn()`.
 */
function hydrateSdkStorageFromHostedUiTokens(
  tokens: HostedUiTokenResponse,
  username: string,
): void {
  const keyPrefix = `CognitoIdentityServiceProvider.${authEnv.clientId}`;
  window.localStorage.setItem(`${keyPrefix}.LastAuthUser`, username);
  window.localStorage.setItem(
    `${keyPrefix}.${username}.idToken`,
    tokens.id_token,
  );
  window.localStorage.setItem(
    `${keyPrefix}.${username}.accessToken`,
    tokens.access_token,
  );
  window.localStorage.setItem(
    `${keyPrefix}.${username}.refreshToken`,
    tokens.refresh_token,
  );
  window.localStorage.setItem(`${keyPrefix}.${username}.clockDrift`, "0");
}

function clearHostedUiHydratedUser(): void {
  const keyPrefix = `CognitoIdentityServiceProvider.${authEnv.clientId}`;
  window.localStorage.removeItem(`${keyPrefix}.LastAuthUser`);
}

export async function exchangeAuthCodeForTokens(
  code: string,
): Promise<AuthSession> {
  const redirectUri = `${authEnv.siteUrl}/auth/callback`;
  const res = await fetch(`https://${authEnv.hostedUiDomain}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: authEnv.clientId,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Hosted UI token exchange failed (${res.status}): ${body}`);
  }

  const tokens: HostedUiTokenResponse = await res.json();
  const idPayload = decodeJwtPayload(tokens.id_token);
  const username = (idPayload["cognito:username"] as string) ?? (idPayload.sub as string);

  hydrateSdkStorageFromHostedUiTokens(tokens, username);

  return {
    accessToken: tokens.access_token,
    idToken: tokens.id_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
    email: (idPayload.email as string) ?? "",
    name: (idPayload.name as string) ?? (idPayload.email as string) ?? "",
  };
}
