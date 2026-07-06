import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

/** Never buffers the whole object in memory (plan §9) — streams to/from disk. */

export async function headObjectSize(s3: S3Client, bucket: string, key: string): Promise<number> {
  const out = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  return out.ContentLength ?? 0;
}

export async function downloadToFile(
  s3: S3Client,
  bucket: string,
  key: string,
  destPath: string,
): Promise<void> {
  const out = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!out.Body) throw new Error("S3 GetObject returned an empty body");
  await pipeline(out.Body as Readable, createWriteStream(destPath));
}

export async function uploadFile(
  s3: S3Client,
  bucket: string,
  key: string,
  srcPath: string,
  contentType: string,
): Promise<{ versionId?: string }> {
  const size = (await stat(srcPath)).size;
  const out = await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: createReadStream(srcPath),
      ContentLength: size,
      ContentType: contentType,
    }),
  );
  return { versionId: out.VersionId };
}

export function sha256File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}
