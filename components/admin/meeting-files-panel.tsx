"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmMeetingFileUpload, prepareMeetingFileUpload, removeMeetingFile, updateMeetingFileDescription } from "@/lib/actions/meeting-files";
import { FileButton } from "@/components/admin/file-button";
import { buttonClass, inputClass, quietClass } from "@/components/admin/ui";
import { formatBytes } from "@/lib/format";
import { t } from "@/lib/i18n";

type SavedFile = {
  id: string;
  name: string;
  description: string;
  bytes: number;
  url: string | null;
  downloadError?: string | null;
};

type PendingFile = {
  key: string;
  file: File;
  description: string;
};

const ACCEPT = ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function errorText(code: string) {
  return code in t.errors ? t.errors[code as keyof typeof t.errors] : t.errors.generic;
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

export function MeetingFilesPanel({ meetingId, files }: { meetingId: string; files: SavedFile[] }) {
  const router = useRouter();
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; percent: number } | null>(null);

  function onFiles(selected: File[]) {
    if (selected.length === 0) return;
    setPendingFiles((current) => [
      ...current,
      ...selected.map((file) => ({ key: crypto.randomUUID(), file, description: "" })),
    ]);
    setError(null);
  }

  function stop(code: string, remaining: PendingFile[]) {
    setPendingFiles(remaining);
    setError(code);
    setPending(false);
    setProgress(null);
    router.refresh();
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingFiles.length === 0) {
      setError("file_type");
      return;
    }
    if (pendingFiles.some((item) => item.description.trim().length > 2000)) {
      setError("invalid");
      return;
    }
    setError(null);
    setPending(true);
    const queue = pendingFiles;
    for (let index = 0; index < queue.length; index++) {
      const item = queue[index];
      setProgress({ current: index + 1, total: queue.length, percent: 0 });
      const prepared = new FormData();
      prepared.set("meetingId", meetingId);
      prepared.set("fileName", item.file.name);
      prepared.set("contentType", item.file.type);
      prepared.set("bytes", String(item.file.size));
      prepared.set("description", item.description);
      const result = await prepareMeetingFileUpload(prepared);
      if ("error" in result) {
        stop(result.error, queue.slice(index));
        return;
      }
      try {
        await putFile(result.url, item.file, result.contentType, (percent) => {
          setProgress({ current: index + 1, total: queue.length, percent });
        });
      } catch (uploadError) {
        console.error("meeting file upload failed", uploadError);
        stop(uploadError instanceof Error && uploadError.message === "network" ? "upload_blocked" : "upload_failed", queue.slice(index));
        return;
      }
      const confirmed = new FormData();
      confirmed.set("meetingId", meetingId);
      confirmed.set("key", result.key);
      confirmed.set("fileName", item.file.name);
      confirmed.set("contentType", result.contentType);
      confirmed.set("bytes", String(item.file.size));
      confirmed.set("description", item.description);
      const done = await confirmMeetingFileUpload(confirmed);
      if ("error" in done) {
        stop(done.error, queue.slice(index));
        return;
      }
    }
    setPendingFiles([]);
    setPending(false);
    setProgress(null);
    router.push(`/admin/meetings/${meetingId}?notice=saved`);
    router.refresh();
  }

  return (
    <section className="mt-10 rounded-xl border border-line bg-card p-5">
      <h2 className="font-serif text-2xl">{t.nav.files}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{t.admin.filesHelp}</p>
      {files.length === 0 ? <p className="mt-4 text-sm text-muted">{t.admin.empty}</p> : null}
      {files.length > 0 ? (
        <ul className="mt-4 divide-y divide-line">
          {files.map((file) => (
            <li key={file.id} className="py-4">
              <p className="text-sm">
                {file.url ? (
                  <a className="font-medium text-olive underline" href={file.url} target="_blank" rel="noopener noreferrer">
                    {file.name}
                  </a>
                ) : (
                  file.name
                )}
                {` · ${formatBytes(file.bytes)}`}
              </p>
              {file.downloadError ? <p className="mt-2 text-sm text-clay">{errorText(file.downloadError)}</p> : null}
              <form action={updateMeetingFileDescription} className="mt-3">
                <input type="hidden" name="id" value={file.id} />
                <label className="block text-sm text-muted">
                  {t.admin.description}
                  <input name="description" defaultValue={file.description} maxLength={2000} className={inputClass} />
                </label>
                <button className={`${buttonClass} mt-2`}>{t.admin.save}</button>
              </form>
              <form action={removeMeetingFile} className="mt-2">
                <input type="hidden" name="id" value={file.id} />
                <button className={quietClass}>{t.admin.removeFile}</button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}
      <form onSubmit={onSubmit} className="mt-4">
        <FileButton
          name="files"
          accept={ACCEPT}
          multiple
          label={t.admin.chooseFiles}
          disabled={pending}
          onFiles={onFiles}
        />
        {pendingFiles.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {pendingFiles.map((item) => (
              <li key={item.key} className="rounded-md border border-line px-3 py-3">
                <p className="text-sm">
                  {item.file.name}
                  {` · ${formatBytes(item.file.size)}`}
                </p>
                <label className="mt-2 block text-sm text-muted">
                  {t.admin.description}
                  <input
                    value={item.description}
                    maxLength={2000}
                    disabled={pending}
                    className={inputClass}
                    onChange={(event) => {
                      const description = event.target.value;
                      setPendingFiles((current) =>
                        current.map((entry) => (entry.key === item.key ? { ...entry, description } : entry)),
                      );
                    }}
                  />
                </label>
                <button
                  type="button"
                  className={`${quietClass} mt-2`}
                  disabled={pending}
                  onClick={() => setPendingFiles((current) => current.filter((entry) => entry.key !== item.key))}
                >
                  {t.admin.remove}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <button type="submit" className={`${buttonClass} mt-4`} disabled={pending}>
          {pending
            ? `${t.admin.uploading}${progress ? ` ${progress.current}/${progress.total} ${progress.percent}%` : ""}`
            : t.admin.uploadFiles}
        </button>
        {error ? <p className="mt-3 text-sm text-clay">{errorText(error)}</p> : null}
      </form>
    </section>
  );
}
