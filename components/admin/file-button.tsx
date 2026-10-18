"use client";

import { useState } from "react";
import { t } from "@/lib/i18n";
import { buttonClass } from "@/components/admin/ui";

export function FileButton({
  name,
  accept,
  required,
  disabled,
}: {
  name: string;
  accept: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const [fileName, setFileName] = useState("");
  return (
    <div className="grid gap-2">
      <label className={`${buttonClass} w-full cursor-pointer ${disabled ? "pointer-events-none opacity-60" : ""}`}>
        {t.admin.chooseFile}
        <input
          name={name}
          type="file"
          accept={accept}
          required={required}
          disabled={disabled}
          className="sr-only"
          onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
        />
      </label>
      {fileName ? <p className="text-sm text-ink">{fileName}</p> : null}
    </div>
  );
}
