import { randomUUID } from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const MAX_RECORDING_BYTES = 2 * 1024 * 1024 * 1024;
const PUT_EXPIRES_SECONDS = 60 * 60;
const GET_EXPIRES_SECONDS = 15 * 60;

const EXTENSION_TYPES: Record<string, string> = {
  aac: "audio/aac",
  flac: "audio/flac",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  mpeg: "audio/mpeg",
  mpga: "audio/mpeg",
  ogg: "audio/ogg",
  wav: "audio/wav",
  webm: "video/webm",
};

export class S3NotConfiguredError extends Error {
  constructor() {
    super("S3_NOT_CONFIGURED");
    this.name = "S3NotConfiguredError";
  }
}

function settings() {
  const region = process.env.AWS_REGION;
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!region || !bucket || !accessKeyId || !secretAccessKey) throw new S3NotConfiguredError();
  return { region, bucket, accessKeyId, secretAccessKey };
}

function client() {
  const cfg = settings();
  return {
    bucket: cfg.bucket,
    client: new S3Client({
      region: cfg.region,
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    }),
  };
}

export function isAllowedRecordingType(type: string) {
  return /^audio\/[a-z0-9][a-z0-9.+-]{0,60}$/.test(type) || type === "video/mp4" || type === "video/webm";
}

export function recordingContentType(fileName: string, declared: string) {
  const raw = declared.split(";")[0]?.trim().toLowerCase() ?? "";
  if (isAllowedRecordingType(raw)) return raw;
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const guessed = EXTENSION_TYPES[ext];
  return guessed && isAllowedRecordingType(guessed) ? guessed : null;
}

function safeFileName(name: string) {
  const base = name.split(/[/\\]/).pop()?.replace(/[\u0000-\u001f?#]/g, "").trim().slice(0, 160) || "recording";
  if (base === "." || base === ".." || base.includes("..")) return "recording";
  return base;
}

export function recordingKeyForMeeting(meetingId: string, key: string) {
  const prefix = `meetings/${meetingId}/`;
  return key.startsWith(prefix) && !key.includes("..") && key.length <= 500;
}

export function newRecordingKey(meetingId: string, fileName: string) {
  return `meetings/${meetingId}/${randomUUID()}/${safeFileName(fileName)}`;
}

export function isS3NotConfigured(error: unknown) {
  return (
    error instanceof S3NotConfiguredError ||
    (error instanceof Error && error.name === "S3NotConfiguredError")
  );
}

export async function presignRecordingPut(key: string, contentType: string) {
  const { bucket, client: s3 } = client();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  // Do not sign content-length. The browser sets that header itself, and a signed
  // value that does not match produces a signature error with no server log.
  const url = await getSignedUrl(s3, command, {
    expiresIn: PUT_EXPIRES_SECONDS,
    unsignableHeaders: new Set(["content-length"]),
  });
  return url;
}

export async function presignRecordingGet(key: string) {
  const { bucket, client: s3 } = client();
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3, command, { expiresIn: GET_EXPIRES_SECONDS });
}

export async function assertRecordingStored(key: string, contentType: string, bytes: number) {
  const { bucket, client: s3 } = client();
  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    const storedType = (head.ContentType ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
    if (head.ContentLength !== bytes) return false;
    if (storedType && storedType !== contentType) return false;
    return true;
  } catch (error) {
    if (isMissingObject(error)) return false;
    throw error;
  }
}

export function isMissingObject(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? String(error.name) : "";
  if (name === "NotFound" || name === "NoSuchKey") return true;
  const metadata = "$metadata" in error ? error.$metadata : null;
  return Boolean(
    metadata &&
      typeof metadata === "object" &&
      "httpStatusCode" in metadata &&
      metadata.httpStatusCode === 404,
  );
}

export async function deleteRecordingObject(key: string) {
  const { bucket, client: s3 } = client();
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (error) {
    if (isMissingObject(error)) return;
    throw error;
  }
}
