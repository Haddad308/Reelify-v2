// End-to-end client for the local dry-run: creates an upload session, uploads
// the file to S3 via presigned multipart URLs, completes, then polls the job.
// Pure Node (global fetch + fs), no deps.
//
// Env: API_BASE, WORKSPACE_ID, DEV_USER, FILE
import { open, stat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

const API_BASE = process.env.API_BASE ?? "http://localhost:8090";
const WORKSPACE_ID = process.env.WORKSPACE_ID ?? "ws_e2e";
const DEV_USER = process.env.DEV_USER ?? "e2e-user";
const FILE = process.env.FILE ?? "raw-videos-samples/1.83-giga.mp4";
const UPLOAD_CONCURRENCY = Number(process.env.UPLOAD_CONCURRENCY ?? 4);

const authHeaders = { "x-reelify-user": DEV_USER, "content-type": "application/json" };

async function api(method, pathname, body, extraHeaders = {}) {
  const res = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers: { ...authHeaders, ...extraHeaders },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${pathname} -> ${res.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}

async function uploadPart(url, fh, position, length) {
  const buffer = Buffer.alloc(length);
  await fh.read(buffer, 0, length, position);
  const res = await fetch(url, { method: "PUT", body: buffer });
  if (!res.ok) throw new Error(`part PUT -> ${res.status}: ${await res.text()}`);
  const etag = res.headers.get("etag");
  if (!etag) throw new Error("S3 did not return an ETag");
  return etag;
}

async function main() {
  const size = (await stat(FILE)).size;
  const filename = path.basename(FILE);
  console.log(`file=${filename} size=${(size / 1e9).toFixed(2)}GB`);

  const session = await api("POST", `/v1/workspaces/${WORKSPACE_ID}/upload-sessions`, {
    filename,
    contentType: "video/mp4",
    sizeBytes: size,
  }, { "idempotency-key": randomUUID() });
  console.log(`upload session=${session.uploadSessionId} video=${session.videoId} partSize=${session.partSizeBytes}`);

  const partSize = session.partSizeBytes;
  const partCount = Math.ceil(size / partSize);
  const partNumbers = Array.from({ length: partCount }, (_, i) => i + 1);

  const { parts: signed } = await api("POST", `/v1/upload-sessions/${session.uploadSessionId}/parts`, {
    partNumbers,
  });
  const urlByPart = new Map(signed.map((p) => [p.partNumber, p.url]));
  console.log(`uploading ${partCount} parts (concurrency ${UPLOAD_CONCURRENCY})...`);

  const fh = await open(FILE, "r");
  const completed = new Array(partCount);
  try {
    let next = 0;
    const startedAt = Date.now();
    async function worker() {
      while (next < partCount) {
        const idx = next++;
        const partNumber = idx + 1;
        const position = idx * partSize;
        const length = Math.min(partSize, size - position);
        const etag = await uploadPart(urlByPart.get(partNumber), fh, position, length);
        completed[idx] = { partNumber, etag };
        process.stdout.write(`\r  uploaded ${completed.filter(Boolean).length}/${partCount}`);
      }
    }
    await Promise.all(Array.from({ length: UPLOAD_CONCURRENCY }, worker));
    console.log(`\n  upload done in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
  } finally {
    await fh.close();
  }

  const done = await api("POST", `/v1/upload-sessions/${session.uploadSessionId}/complete`, {
    parts: completed,
  }, { "idempotency-key": randomUUID() });
  console.log(`complete -> job=${done.processingJobId} status=${done.processingStatus}`);

  const jobId = done.processingJobId;
  let last = "";
  const deadline = Date.now() + 15 * 60 * 1000;
  while (Date.now() < deadline) {
    const job = await api("GET", `/v1/processing-jobs/${jobId}`);
    if (job.status !== last) {
      console.log(`  job status: ${job.status}${job.lastError ? ` (${job.lastError})` : ""}`);
      last = job.status;
    }
    if (["COMPLETED", "FAILED", "CANCELLED"].includes(job.status)) {
      console.log(`FINAL: ${job.status}`);
      process.exit(job.status === "COMPLETED" ? 0 : 1);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  console.log("TIMED OUT waiting for job");
  process.exit(1);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
