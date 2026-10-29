"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { recordAudit } from "@/lib/audit";
import { getDb, isDbUnavailable } from "@/lib/db";
import { meetingFiles, meetings } from "@/lib/db/schema";
import { textValue } from "@/lib/format";
import { go, rethrow } from "@/lib/go";
import { optionalId } from "@/lib/options";
import { requireUser } from "@/lib/session";
import {
  MAX_MEETING_FILE_BYTES,
  assertRecordingStored,
  deleteRecordingObject,
  isS3NotConfigured,
  meetingFileContentType,
  meetingFileKeyForMeeting,
  newMeetingFileKey,
  presignRecordingPut,
} from "@/lib/s3";

const MAX_DESCRIPTION = 2000;

function bail(path: string, error: unknown): never {
  rethrow(error);
  if (isDbUnavailable(error)) go(path, { error: "unavailable" });
  go(path, { error: "generic" });
}

function wholeBytes(value: string) {
  if (!/^\d+$/.test(value)) return null;
  const bytes = Number(value);
  if (!Number.isSafeInteger(bytes) || bytes < 1 || bytes > MAX_MEETING_FILE_BYTES) return null;
  return bytes;
}

function fileDescription(raw: string) {
  const value = raw.replace(/\u0000/g, "").trim();
  if (value.length > MAX_DESCRIPTION) return null;
  return value;
}

function displayFileName(name: string) {
  return name.split(/[/\\]/).pop()?.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 255) || "";
}

type PrepareUpload = { error: string } | { url: string; key: string; contentType: string };
type ConfirmUpload = { error: string } | { ok: true };

export async function prepareMeetingFileUpload(formData: FormData): Promise<PrepareUpload> {
  await requireUser();
  const meetingId = optionalId(textValue(formData, "meetingId"));
  const fileName = displayFileName(textValue(formData, "fileName"));
  const bytes = wholeBytes(textValue(formData, "bytes"));
  const contentType = meetingFileContentType(fileName, textValue(formData, "contentType"));
  const description = fileDescription(textValue(formData, "description"));
  if (!meetingId) return { error: "invalid" };
  if (description === null) return { error: "invalid" };
  if (!fileName || !contentType) return { error: "file_type" };
  if (!bytes) return { error: "file_size" };
  try {
    const db = getDb();
    const [meeting] = await db.select({ id: meetings.id }).from(meetings).where(eq(meetings.id, meetingId)).limit(1);
    if (!meeting) return { error: "not_found" };
    const key = newMeetingFileKey(meetingId, fileName);
    const url = await presignRecordingPut(key, contentType);
    return { url, key, contentType };
  } catch (error) {
    rethrow(error);
    if (isS3NotConfigured(error)) return { error: "s3_unconfigured" };
    if (isDbUnavailable(error)) return { error: "unavailable" };
    console.error("meeting file prepare failed", error instanceof Error ? `${error.name}: ${error.message}` : "unknown");
    return { error: "upload_failed" };
  }
}

export async function confirmMeetingFileUpload(formData: FormData): Promise<ConfirmUpload> {
  const user = await requireUser();
  const meetingId = optionalId(textValue(formData, "meetingId"));
  const key = textValue(formData, "key");
  const fileName = displayFileName(textValue(formData, "fileName"));
  const bytes = wholeBytes(textValue(formData, "bytes"));
  const contentType = meetingFileContentType(fileName, textValue(formData, "contentType"));
  const description = fileDescription(textValue(formData, "description"));
  if (!meetingId || description === null) return { error: "invalid" };
  if (!fileName || !bytes || !contentType || !meetingFileKeyForMeeting(meetingId, key)) {
    return { error: "invalid" };
  }
  try {
    const db = getDb();
    const [meeting] = await db.select({ id: meetings.id }).from(meetings).where(eq(meetings.id, meetingId)).limit(1);
    if (!meeting) return { error: "not_found" };
    const stored = await assertRecordingStored(key, contentType, bytes);
    if (!stored) {
      console.error("meeting file confirm failed: object missing or does not match");
      return { error: "upload_failed" };
    }
    const [existing] = await db
      .select({ id: meetingFiles.id })
      .from(meetingFiles)
      .where(eq(meetingFiles.objectKey, key))
      .limit(1);
    if (existing) return { error: "upload_failed" };
    const [row] = await db
      .insert(meetingFiles)
      .values({
        meetingId,
        description,
        objectKey: key,
        fileName,
        contentType,
        byteSize: bytes,
      })
      .returning({ id: meetingFiles.id });
    if (!row) return { error: "upload_failed" };
    await recordAudit({
      actorEmail: user.email,
      action: "meeting.file",
      entityType: "meeting",
      entityId: meetingId,
      summary: fileName,
    });
    revalidatePath(`/admin/meetings/${meetingId}`);
    revalidatePath("/admin/files");
    return { ok: true };
  } catch (error) {
    rethrow(error);
    if (isS3NotConfigured(error)) return { error: "s3_unconfigured" };
    if (isDbUnavailable(error)) return { error: "unavailable" };
    console.error("meeting file confirm failed", error instanceof Error ? `${error.name}: ${error.message}` : "unknown");
    return { error: "upload_failed" };
  }
}

export async function updateMeetingFileDescription(formData: FormData) {
  const user = await requireUser();
  const id = optionalId(textValue(formData, "id"));
  const description = fileDescription(textValue(formData, "description"));
  if (!id || description === null) go("/admin/meetings", { error: "invalid" });
  let path = "/admin/meetings";
  try {
    const db = getDb();
    const [row] = await db
      .select({ id: meetingFiles.id, meetingId: meetingFiles.meetingId, fileName: meetingFiles.fileName })
      .from(meetingFiles)
      .where(eq(meetingFiles.id, id))
      .limit(1);
    if (!row) go("/admin/meetings", { error: "not_found" });
    path = `/admin/meetings/${row.meetingId}`;
    await db.update(meetingFiles).set({ description }).where(eq(meetingFiles.id, id));
    await recordAudit({
      actorEmail: user.email,
      action: "meeting.file.update",
      entityType: "meeting",
      entityId: row.meetingId,
      summary: row.fileName,
    });
  } catch (error) {
    bail(path, error);
  }
  revalidatePath(path);
  revalidatePath("/admin/files");
  go(path, { notice: "saved" });
}

export async function removeMeetingFile(formData: FormData) {
  const user = await requireUser();
  const id = optionalId(textValue(formData, "id"));
  if (!id) go("/admin/meetings", { error: "invalid" });
  let path = "/admin/meetings";
  try {
    const db = getDb();
    const [row] = await db
      .select({
        meetingId: meetingFiles.meetingId,
        objectKey: meetingFiles.objectKey,
        fileName: meetingFiles.fileName,
      })
      .from(meetingFiles)
      .where(eq(meetingFiles.id, id))
      .limit(1);
    if (!row) go("/admin/meetings", { error: "not_found" });
    path = `/admin/meetings/${row.meetingId}`;
    await deleteRecordingObject(row.objectKey);
    await db.delete(meetingFiles).where(eq(meetingFiles.id, id));
    await recordAudit({
      actorEmail: user.email,
      action: "meeting.file.remove",
      entityType: "meeting",
      entityId: row.meetingId,
      summary: row.fileName,
    });
  } catch (error) {
    rethrow(error);
    if (isS3NotConfigured(error)) go(path, { error: "s3_unconfigured" });
    bail(path, error);
  }
  revalidatePath(path);
  revalidatePath("/admin/files");
  go(path, { notice: "saved" });
}
