export type AuthMode = "dev" | "cognito";

export interface ApiConfig {
  port: number;
  host: string;
  region: string;
  authMode: AuthMode;
  cognito?: {
    userPoolId: string;
    clientId: string;
  };
  /** data_region -> S3 bucket name (resolved server-side, never from client). */
  mediaBuckets: Record<string, string>;
  defaultDataRegion: string;
  partSizeBytes: number;
  uploadUrlTtlSeconds: number;
  pipelineVersion: string;
}

function required(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const authMode = (env.AUTH_MODE as AuthMode) ?? "dev";

  return {
    port: Number(env.PORT ?? 8080),
    host: env.HOST ?? "0.0.0.0",
    region: env.AWS_REGION ?? "us-east-1",
    authMode,
    cognito:
      authMode === "cognito"
        ? { userPoolId: required(env, "COGNITO_USER_POOL_ID"), clientId: required(env, "COGNITO_CLIENT_ID") }
        : undefined,
    mediaBuckets: {
      us: env.MEDIA_BUCKET_US ?? required(env, "MEDIA_BUCKET_US"),
    },
    defaultDataRegion: env.DEFAULT_DATA_REGION ?? "us",
    // 64 MiB parts: within S3's 5 MiB..5 GiB range; ~10k parts covers >600 GB.
    partSizeBytes: Number(env.UPLOAD_PART_SIZE_BYTES ?? 64 * 1024 * 1024),
    uploadUrlTtlSeconds: Number(env.UPLOAD_URL_TTL_SECONDS ?? 3600),
    pipelineVersion: env.PIPELINE_VERSION ?? "v1",
  };
}
