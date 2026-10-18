"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { recordAudit } from "@/lib/audit";
import { getDb, isDbUnavailable } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { fromJerusalemInput, textValue } from "@/lib/format";
import { go, rethrow } from "@/lib/go";
import { optionalId } from "@/lib/options";
import { requireUser } from "@/lib/session";
import {
  MAX_RECORDING_BYTES,
  S3NotConfiguredError,
  assertRecordingStored,
  deleteRecordingObject,
  isMissingObject,
  newRecordingKey,
  presignRecordingPut,
  recordingContentType,
  recordingKeyForMeeting,
} from "@/lib/s3";

const TRANSCRIPT_EXTENSIONS = /\.(txt|md|vtt|srt)$/i;
const MAX_TRANSCRIPT_FILE_BYTES = 900_000;

function bail(path: string, error: unknown): never {
  rethrow(error);
  if (isDbUnavailable(error)) go(path, { error: "unavailable" });
  go(path, { error: "generic" });
}

export async function saveMeeting(formData: FormData) {
  const user = await requireUser();
  const id = optionalId(textValue(formData, "id"));
  const path = id ? `/admin/meetings/${id}` : "/admin/meetings";
  const title = textValue(formData, "title");
  if (!title) go(path, { error: "invalid" });
  const startsRaw = textValue(formData, "startsAt");
  const values = {
    title,
    startsAt: startsRaw ? fromJerusalemInput(startsRaw) : null,
    documentId: optionalId(textValue(formData, "documentId")),
    agenda: textValue(formData, "agenda"),
    prepQuestions: textValue(formData, "prepQuestions"),
    discussion: textValue(formData, "discussion"),
    clarifications: textValue(formData, "clarifications"),
    gaps: textValue(formData, "gaps"),
    summary: textValue(formData, "summary"),
    transcript: textValue(formData, "transcript"),
    updatedAt: new Date(),
  };
  if (startsRaw && !values.startsAt) go(path, { error: "invalid" });

  try {
    const db = getDb();
    if (id) {
      await db.update(meetings).set(values).where(eq(meetings.id, id));
      await recordAudit({
        actorEmail: user.email,
        action: "meeting.update",
        entityType: "meeting",
        entityId: id,
        summary: title,
      });
    } else {
      const [row] = await db.insert(meetings).values(values).returning({ id: meetings.id });
      await recordAudit({
        actorEmail: user.email,
        action: "meeting.create",
        entityType: "meeting",
        entityId: row?.id,
        summary: title,
      });
      revalidatePath("/admin/meetings");
      if (row?.id) go(`/admin/meetings/${row.id}`, { notice: "created" });
      go("/admin/meetings", { notice: "created" });
    }
  } catch (error) {
    bail(path, error);
  }
  revalidatePath(path);
  go(path, { notice: "saved" });
}

function wholeBytes(value: string) {
  if (!/^\d+$/.test(value)) return null;
  const bytes = Number(value);
  if (!Number.isSafeInteger(bytes) || bytes < 1 || bytes > MAX_RECORDING_BYTES) return null;
  return bytes;
}

type PrepareUpload =
  | { error: string }
  | { url: string; key: string; contentType: string };

export async function prepareRecordingUpload(formData: FormData): Promise<PrepareUpload> {
  await requireUser();
  const meetingId = optionalId(textValue(formData, "meetingId"));
  const fileName = textValue(formData, "fileName");
  const bytes = wholeBytes(textValue(formData, "bytes"));
  const contentType = recordingContentType(fileName, textValue(formData, "contentType"));
  if (!meetingId) return { error: "invalid" };
  if (!fileName || !contentType) return { error: "file_type" };
  if (!bytes) return { error: "file_size" };
  try {
    const db = getDb();
    const [meeting] = await db.select({ id: meetings.id }).from(meetings).where(eq(meetings.id, meetingId)).limit(1);
    if (!meeting) return { error: "not_found" };
    const key = newRecordingKey(meetingId, fileName);
    const url = await presignRecordingPut(key, contentType, bytes);
    return { url, key, contentType };
  } catch (error) {
    rethrow(error);
    if (error instanceof S3NotConfiguredError) return { error: "s3_unconfigured" };
    if (isDbUnavailable(error)) return { error: "unavailable" };
    return { error: "upload_failed" };
  }
}

export async function confirmRecordingUpload(formData: FormData) {
  const user = await requireUser();
  const meetingId = optionalId(textValue(formData, "meetingId"));
  const path = meetingId ? `/admin/meetings/${meetingId}` : "/admin/meetings";
  const key = textValue(formData, "key");
  const fileName = textValue(formData, "fileName");
  const bytes = wholeBytes(textValue(formData, "bytes"));
  const contentType = recordingContentType(fileName, textValue(formData, "contentType"));
  if (!meetingId || !fileName || !bytes || !contentType || !recordingKeyForMeeting(meetingId, key)) {
    go(path, { error: "invalid" });
  }
  try {
    const db = getDb();
    const [meeting] = await db
      .select({ id: meetings.id, recordingKey: meetings.recordingKey })
      .from(meetings)
      .where(eq(meetings.id, meetingId))
      .limit(1);
    if (!meeting) go(path, { error: "not_found" });
    const stored = await assertRecordingStored(key, contentType, bytes);
    if (!stored) go(path, { error: "upload_failed" });
    await db
      .update(meetings)
      .set({
        recordingKey: key,
        recordingName: fileName,
        recordingType: contentType,
        recordingBytes: bytes,
        updatedAt: new Date(),
      })
      .where(eq(meetings.id, meetingId));
    const previous = meeting.recordingKey;
    if (previous && previous !== key) {
      try {
        await deleteRecordingObject(previous);
      } catch (error) {
        console.error("previous recording delete failed");
        if (!(error instanceof S3NotConfiguredError) && !isMissingObject(error)) {
          console.error(error);
        }
      }
    }
    await recordAudit({
      actorEmail: user.email,
      action: "meeting.recording",
      entityType: "meeting",
      entityId: meetingId,
      summary: fileName,
    });
  } catch (error) {
    rethrow(error);
    if (error instanceof S3NotConfiguredError) go(path, { error: "s3_unconfigured" });
    bail(path, error);
  }
  revalidatePath(path);
  go(path, { notice: "saved" });
}

export async function removeRecording(formData: FormData) {
  const user = await requireUser();
  const meetingId = optionalId(textValue(formData, "id"));
  const path = meetingId ? `/admin/meetings/${meetingId}` : "/admin/meetings";
  if (!meetingId) go(path, { error: "invalid" });
  try {
    const db = getDb();
    const [meeting] = await db
      .select({ recordingKey: meetings.recordingKey, recordingName: meetings.recordingName })
      .from(meetings)
      .where(eq(meetings.id, meetingId))
      .limit(1);
    if (!meeting) go(path, { error: "not_found" });
    if (meeting.recordingKey) await deleteRecordingObject(meeting.recordingKey);
    await db
      .update(meetings)
      .set({
        recordingKey: null,
        recordingName: null,
        recordingType: null,
        recordingBytes: null,
        updatedAt: new Date(),
      })
      .where(eq(meetings.id, meetingId));
    await recordAudit({
      actorEmail: user.email,
      action: "meeting.recording.remove",
      entityType: "meeting",
      entityId: meetingId,
      summary: meeting.recordingName || meetingId,
    });
  } catch (error) {
    rethrow(error);
    if (error instanceof S3NotConfiguredError) go(path, { error: "s3_unconfigured" });
    bail(path, error);
  }
  revalidatePath(path);
  go(path, { notice: "saved" });
}

export async function importTranscript(formData: FormData) {
  const user = await requireUser();
  const meetingId = optionalId(textValue(formData, "id"));
  const path = meetingId ? `/admin/meetings/${meetingId}` : "/admin/meetings";
  const file = formData.get("file");
  if (!meetingId || !file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
    go(path, { error: "invalid" });
  }
  const name = "name" in file ? String(file.name) : "";
  if (!TRANSCRIPT_EXTENSIONS.test(name)) go(path, { error: "file_type" });
  if (file.size < 1 || file.size > MAX_TRANSCRIPT_FILE_BYTES) go(path, { error: "file_size" });
  const transcript = (await file.text()).replace(/^\uFEFF/, "").trim();
  if (!transcript) go(path, { error: "invalid" });
  try {
    const db = getDb();
    const [meeting] = await db.select({ id: meetings.id, title: meetings.title }).from(meetings).where(eq(meetings.id, meetingId)).limit(1);
    if (!meeting) go(path, { error: "not_found" });
    await db.update(meetings).set({ transcript, updatedAt: new Date() }).where(eq(meetings.id, meetingId));
    await recordAudit({
      actorEmail: user.email,
      action: "meeting.transcript",
      entityType: "meeting",
      entityId: meetingId,
      summary: meeting.title,
    });
  } catch (error) {
    bail(path, error);
  }
  revalidatePath(path);
  go(path, { notice: "saved" });
}
