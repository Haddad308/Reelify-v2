import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface CompletedPart {
  partNumber: number;
  etag: string;
}

/**
 * Direct browser->S3 multipart uploads (plan §3, §11). The bucket/region are
 * resolved server-side from the agency's data_region before this is called;
 * short-lived signed URLs are only issued after RBAC checks. The bucket's
 * default SSE-KMS encrypts objects, so no encryption headers are signed here.
 */
export class MediaStorage {
  constructor(
    private readonly s3: S3Client,
    private readonly urlTtlSeconds: number,
  ) {}

  async createMultipartUpload(bucket: string, key: string, contentType?: string): Promise<string> {
    const out = await this.s3.send(
      new CreateMultipartUploadCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
    );
    if (!out.UploadId) throw new Error("S3 did not return an UploadId");
    return out.UploadId;
  }

  presignUploadPart(bucket: string, key: string, uploadId: string, partNumber: number): Promise<string> {
    return getSignedUrl(
      this.s3,
      new UploadPartCommand({ Bucket: bucket, Key: key, UploadId: uploadId, PartNumber: partNumber }),
      { expiresIn: this.urlTtlSeconds },
    );
  }

  async completeMultipartUpload(
    bucket: string,
    key: string,
    uploadId: string,
    parts: CompletedPart[],
  ): Promise<{ versionId?: string; etag?: string }> {
    const ordered = [...parts].sort((a, b) => a.partNumber - b.partNumber);
    const out = await this.s3.send(
      new CompleteMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: ordered.map((p) => ({ PartNumber: p.partNumber, ETag: p.etag })),
        },
      }),
    );
    return { versionId: out.VersionId, etag: out.ETag };
  }

  async abortMultipartUpload(bucket: string, key: string, uploadId: string): Promise<void> {
    await this.s3.send(
      new AbortMultipartUploadCommand({ Bucket: bucket, Key: key, UploadId: uploadId }),
    );
  }
}
