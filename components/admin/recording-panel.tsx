"use client";

import { useState } from "react";
import { confirmRecordingUpload, prepareRecordingUpload, removeRecording } from "@/lib/actions/meetings";
import { FileButton } from "@/components/admin/file-button";
import { t } from "@/lib/i18n";
import { buttonClass, quietClass } from "@/components/admin/ui";

type Recording = {
  name: string;
  type: string;
  bytes: number | null;
  url: string | null;
  playbackError?: string | null;
};

function errorText(code: string) {
  return code in t.errors ? t.errors[code as keyof typeof t.errors] : t.errors.generic;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function putFile(url: string, file: File, contentType: string, onProgress: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`status ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(file);
  });
}

export function RecordingPanel({ meetingId, recording }: { meetingId: string; recording: Recording | null }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem("file");
    const file = input instanceof HTMLInputElement ? input.files?.[0] : undefined;
    if (!file) {
      setError("file_type");
      return;
    }
    setError(null);
    setPending(true);
    setProgress(0);
    const prepared = new FormData();
    prepared.set("meetingId", meetingId);
    prepared.set("fileName", file.name);
    prepared.set("contentType", file.type);
    prepared.set("bytes", String(file.size));
    let confirmed: FormData | null = null;
    try {
      const result = await prepareRecordingUpload(prepared);
      if ("error" in result) {
        setError(result.error);
        setPending(false);
        setProgress(null);
        return;
      }
      await putFile(result.url, file, result.contentType, setProgress);
      confirmed = new FormData();
      confirmed.set("meetingId", meetingId);
      confirmed.set("key", result.key);
      confirmed.set("fileName", file.name);
      confirmed.set("contentType", result.contentType);
      confirmed.set("bytes", String(file.size));
    } catch (uploadError) {
      console.error("recording upload failed", uploadError);
      setError(uploadError instanceof Error && uploadError.message === "network" ? "upload_blocked" : "upload_failed");
      setPending(false);
      setProgress(null);
      return;
    }
    if (!confirmed) {
      setPending(false);
      setProgress(null);
      return;
    }
    await confirmRecordingUpload(confirmed);
  }

  return (
    <section className="mt-10 rounded-xl border border-line bg-card p-5">
      <h2 className="font-serif text-2xl">{t.admin.recording}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{t.admin.recordingHelp}</p>
      {recording ? (
        <div className="mt-4">
          <p className="text-sm">
            {recording.name}
            {recording.bytes ? ` · ${formatBytes(recording.bytes)}` : ""}
          </p>
          {recording.url && recording.type.startsWith("video/") ? (
            <video controls src={recording.url} className="mt-3 w-full rounded-md" />
          ) : null}
          {recording.url && !recording.type.startsWith("video/") ? (
            <audio controls src={recording.url} className="mt-3 w-full" />
          ) : null}
          {recording.playbackError ? <p className="mt-3 text-sm text-clay">{errorText(recording.playbackError)}</p> : null}
          <form action={removeRecording} className="mt-3">
            <input type="hidden" name="id" value={meetingId} />
            <button className={quietClass}>{t.admin.removeRecording}</button>
          </form>
        </div>
      ) : null}
      <form onSubmit={onSubmit} className="mt-4 flex flex-wrap items-center gap-3">
        <FileButton
          name="file"
          accept="audio/*,video/mp4,video/webm,.mp3,.m4a,.wav,.ogg,.mp4,.webm"
          required
          disabled={pending}
        />
        <button type="submit" className={buttonClass} disabled={pending}>
          {pending
            ? `${t.admin.uploading}${progress === null ? "" : ` ${progress}%`}`
            : recording
              ? t.admin.replaceRecording
              : t.admin.uploadRecording}
        </button>
        {error ? <p className="basis-full text-sm text-clay">{errorText(error)}</p> : null}
      </form>
    </section>
  );
}
