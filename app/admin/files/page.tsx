import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { PageIntro } from "@/components/admin/ui";
import { getDb } from "@/lib/db";
import { meetingFiles, meetings } from "@/lib/db/schema";
import { formatBytes, formatWhen } from "@/lib/format";
import { t } from "@/lib/i18n";
import { S3NotConfiguredError, presignRecordingGet } from "@/lib/s3";
import { requireUser } from "@/lib/session";

export default async function FilesPage() {
  await requireUser();
  const rows = await getDb()
    .select({
      id: meetingFiles.id,
      fileName: meetingFiles.fileName,
      description: meetingFiles.description,
      byteSize: meetingFiles.byteSize,
      objectKey: meetingFiles.objectKey,
      createdAt: meetingFiles.createdAt,
      meetingId: meetings.id,
      meetingTitle: meetings.title,
    })
    .from(meetingFiles)
    .innerJoin(meetings, eq(meetings.id, meetingFiles.meetingId))
    .orderBy(desc(meetingFiles.createdAt));
  const files = await Promise.all(
    rows.map(async (row) => {
      let url: string | null = null;
      try {
        url = await presignRecordingGet(row.objectKey);
      } catch (error) {
        return {
          ...row,
          url: null,
          downloadError: error instanceof S3NotConfiguredError ? "s3_unconfigured" : "generic",
        };
      }
      return { ...row, url, downloadError: null };
    }),
  );
  const s3Missing = files.some((file) => file.downloadError === "s3_unconfigured");

  return (
    <div>
      <PageIntro title={t.nav.files} />
      {s3Missing ? <p className="mb-4 text-sm text-clay">{t.errors.s3_unconfigured}</p> : null}
      {files.length === 0 ? <p className="text-sm text-muted">{t.admin.empty}</p> : null}
      {files.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-line bg-card">
          <table className="w-full min-w-[48rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="px-4 py-3 text-start font-medium">{t.admin.fileName}</th>
                <th className="px-4 py-3 text-start font-medium">{t.admin.description}</th>
                <th className="px-4 py-3 text-start font-medium">{t.admin.meeting}</th>
                <th className="px-4 py-3 text-start font-medium">{t.admin.fileSize}</th>
                <th className="px-4 py-3 text-start font-medium">{t.admin.uploadedOn}</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.id} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-3 align-top">
                    {file.url ? (
                      <a className="text-olive underline" href={file.url} target="_blank" rel="noopener noreferrer">
                        {file.fileName}
                      </a>
                    ) : (
                      file.fileName
                    )}
                    {file.downloadError && file.downloadError !== "s3_unconfigured" ? (
                      <p className="mt-1 text-clay">{t.errors.generic}</p>
                    ) : null}
                  </td>
                  <td className="max-w-xs px-4 py-3 align-top whitespace-pre-wrap break-words">{file.description}</td>
                  <td className="px-4 py-3 align-top">
                    <Link className="text-olive underline" href={`/admin/meetings/${file.meetingId}`}>
                      {file.meetingTitle}
                    </Link>
                  </td>
                  <td className="px-4 py-3 align-top whitespace-nowrap">{formatBytes(file.byteSize)}</td>
                  <td className="px-4 py-3 align-top whitespace-nowrap">{formatWhen(file.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
