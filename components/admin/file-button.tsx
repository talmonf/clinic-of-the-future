"use client";

import { useRef, useState } from "react";
import { t } from "@/lib/i18n";
import { buttonClass } from "@/components/admin/ui";

export function FileButton({
  name,
  accept,
  required,
  disabled,
  multiple,
  label,
  onFiles,
}: {
  name: string;
  accept: string;
  required?: boolean;
  disabled?: boolean;
  multiple?: boolean;
  label?: string;
  onFiles?: (files: File[]) => void;
}) {
  const [fileName, setFileName] = useState("");
  const scrollY = useRef(0);
  return (
    <>
      <label
        className={`relative inline-flex overflow-hidden ${buttonClass} cursor-pointer ${disabled ? "pointer-events-none opacity-60" : ""}`}
      >
        {label ?? t.admin.chooseFile}
        <input
          name={name}
          type="file"
          accept={accept}
          required={required}
          disabled={disabled}
          multiple={multiple}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
          onClick={() => {
            scrollY.current = window.scrollY;
          }}
          onChange={(event) => {
            const selected = Array.from(event.target.files ?? []);
            if (!multiple) setFileName(selected[0]?.name ?? "");
            if (onFiles) {
              onFiles(selected);
              event.currentTarget.value = "";
            }
            event.currentTarget.blur();
            const top = scrollY.current;
            window.scrollTo(0, top);
            requestAnimationFrame(() => window.scrollTo(0, top));
          }}
        />
      </label>
      {!multiple && fileName ? <span className="text-sm text-ink">{fileName}</span> : null}
    </>
  );
}
