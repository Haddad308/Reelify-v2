import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ALLOWED_CONTENT_TYPES = new Set([
  "audio/wav",
  "audio/mpeg",
  "audio/ogg",
  "audio/opus",
  "audio/webm",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "image/jpeg",
]);

const MAX_SIZE_BYTES = 1024 * 1024 * 1024; // 1 GB

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "File too large (max 1 GB)" }, { status: 413 });
    }

    const contentType = file.type || "application/octet-stream";
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      return NextResponse.json(
        { error: `Content type not allowed: ${contentType}` },
        { status: 415 }
      );
    }

    const blob = await put(file.name, file, {
      access: "private",
      addRandomSuffix: true,
      contentType,
    });

    console.log("[upload] Uploaded to blob:", blob.url);
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("[upload] Upload failed:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
