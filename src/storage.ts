import { writeFile, unlink, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

// SVG is intentionally NOT supported.
// Only JPG, PNG and WEBP are accepted.
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB

// Documents (CV / Cover Letter) accepted on the public Internship form.
export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024; // 5MB

export function validateUploadedDocument(file: UploadedFile): string | null {
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.mimeType)) {
    return "That file type isn't supported. Please upload a PDF or Word document.";
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return "That file is too large. Please upload a file under 5MB.";
  }
  return null;
}

// Magic-byte signatures for the image types we accept.
const MAGIC_BYTES: { mime: string; check: (buf: Buffer) => boolean }[] = [
  {
    mime: "image/jpeg",
    check: (b) =>
      b.length > 3 &&
      b[0] === 0xff &&
      b[1] === 0xd8 &&
      b[2] === 0xff,
  },
  {
    mime: "image/png",
    check: (b) =>
      b.length > 8 &&
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47 &&
      b[4] === 0x0d &&
      b[5] === 0x0a &&
      b[6] === 0x1a &&
      b[7] === 0x0a,
  },
  {
    mime: "image/webp",
    check: (b) =>
      b.length > 12 &&
      b[0] === 0x52 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x46 &&
      b[8] === 0x57 &&
      b[9] === 0x45 &&
      b[10] === 0x42 &&
      b[11] === 0x50,
  },
];

/**
 * Confirms the file's actual bytes match one of our accepted image formats.
 */
export function hasValidImageSignature(buffer: Buffer): boolean {
  return MAGIC_BYTES.some(({ check }) => check(buffer));
}

export interface UploadedFile {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface StoredFile {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface StorageDriver {
  save(file: UploadedFile, folder: string): Promise<StoredFile>;
  /**
   * Saves a non-image document (CV/Cover Letter) as-is, skipping the
   * image magic-byte check that `save()` performs.
   */
  saveDocument(file: UploadedFile, folder: string): Promise<StoredFile>;
  delete(url: string): Promise<void>;
}

/**
 * Local storage driver.
 *
 * Used when STORAGE_DRIVER="local".
 */
class LocalStorageDriver implements StorageDriver {
  private uploadsRoot = path.join(process.cwd(), "public", "uploads");

  async save(file: UploadedFile, folder: string): Promise<StoredFile> {
    const buffer = file.buffer;

    if (!hasValidImageSignature(buffer)) {
      throw new InvalidImageError(
        "That file doesn't look like a valid JPG, PNG, or WEBP image."
      );
    }

    const ext = sanitizeExtension(file.originalName);
    const filename = `${randomUUID()}${ext}`;
    const dir = path.join(this.uploadsRoot, folder);

    await mkdir(dir, { recursive: true });

    await writeFile(path.join(dir, filename), buffer);

    return {
      url: `/uploads/${folder}/${filename}`,
      filename,
      mimeType: file.mimeType,
      size: file.size,
    };
  }

  async delete(url: string): Promise<void> {
    if (!url.startsWith("/uploads/")) return;

    const filePath = path.join(process.cwd(), "public", url);

    try {
      await unlink(filePath);
    } catch {
      // File already gone — nothing to do.
    }
  }

  async saveDocument(file: UploadedFile, folder: string): Promise<StoredFile> {
    const ext = sanitizeDocumentExtension(file.originalName);
    const filename = `${randomUUID()}${ext}`;
    const dir = path.join(this.uploadsRoot, folder);

    await mkdir(dir, { recursive: true });

    await writeFile(path.join(dir, filename), file.buffer);

    return {
      url: `/uploads/${folder}/${filename}`,
      filename,
      mimeType: file.mimeType,
      size: file.size,
    };
  }
}

/**
 * Cloudflare R2 storage driver.
 *
 * R2 is S3-compatible, so we use the AWS S3 SDK.
 */
class S3StorageDriver implements StorageDriver {
  private client: S3Client;
  private bucket: string;
  private publicUrl: string;

  constructor() {
    const endpoint = process.env.S3_ENDPOINT;
    const bucket = process.env.S3_BUCKET;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    const publicUrl = process.env.S3_PUBLIC_URL;

    if (!endpoint) {
      throw new Error("S3_ENDPOINT is not configured.");
    }

    if (!bucket) {
      throw new Error("S3_BUCKET is not configured.");
    }

    if (!accessKeyId) {
      throw new Error("S3_ACCESS_KEY_ID is not configured.");
    }

    if (!secretAccessKey) {
      throw new Error("S3_SECRET_ACCESS_KEY is not configured.");
    }

    if (!publicUrl) {
      throw new Error("S3_PUBLIC_URL is not configured.");
    }

    this.bucket = bucket;
    this.publicUrl = publicUrl.replace(/\/$/, "");

    this.client = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint,
      forcePathStyle: true,
      // Some S3-compatible providers (including Neon) reject the checksum
      // trailer the AWS SDK adds by default on plain uploads.
      requestChecksumCalculation: "WHEN_REQUIRED",
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async save(file: UploadedFile, folder: string): Promise<StoredFile> {
    const buffer = file.buffer;

    // Validate actual image contents.
    if (!hasValidImageSignature(buffer)) {
      throw new InvalidImageError(
        "That file doesn't look like a valid JPG, PNG, or WEBP image."
      );
    }

    const ext = sanitizeExtension(file.originalName);
    const filename = `${randomUUID()}${ext}`;

    // Store files in folders inside the R2 bucket.
    const key = `${folder}/${filename}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: file.mimeType,
        ContentLength: buffer.length,
      })
    );

    return {
      url: `${this.publicUrl}/${key}`,
      filename,
      mimeType: file.mimeType,
      size: buffer.length,
    };
  }

  async delete(url: string): Promise<void> {
    if (!url) return;

    const publicUrl = this.publicUrl.replace(/\/$/, "");

    // Only delete files belonging to our configured public URL.
    if (!url.startsWith(`${publicUrl}/`)) {
      return;
    }

    // Convert:
    // https://images.example.com/lawyers/abc.jpg
    //
    // into:
    // lawyers/abc.jpg
    const key = url.slice(`${publicUrl}/`.length);

    if (!key) return;

    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );
  }

  async saveDocument(file: UploadedFile, folder: string): Promise<StoredFile> {
    const buffer = file.buffer;
    const ext = sanitizeDocumentExtension(file.originalName);
    const filename = `${randomUUID()}${ext}`;
    const key = `${folder}/${filename}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: file.mimeType,
        ContentLength: buffer.length,
      })
    );

    return {
      url: `${this.publicUrl}/${key}`,
      filename,
      mimeType: file.mimeType,
      size: buffer.length,
    };
  }
}

function sanitizeExtension(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();

  const allowed = [".jpg", ".jpeg", ".png", ".webp"];

  return allowed.includes(ext) ? ext : "";
}

function sanitizeDocumentExtension(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();

  const allowed = [".pdf", ".doc", ".docx"];

  return allowed.includes(ext) ? ext : "";
}

export class InvalidImageError extends Error { }

export function validateUploadedImage(file: UploadedFile): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.mimeType)) {
    return "That file type isn't supported. Please upload a JPG, PNG, or WEBP image.";
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return "That image is too large. Please upload a file under 8MB.";
  }

  return null;
}

/**
 * Choose storage driver based on STORAGE_DRIVER.
 *
 * STORAGE_DRIVER="s3"   -> Cloudflare R2
 * STORAGE_DRIVER="local" -> local /public/uploads
 */
export const storage: StorageDriver =
  process.env.STORAGE_DRIVER === "s3"
    ? new S3StorageDriver()
    : new LocalStorageDriver();