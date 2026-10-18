"use client";

import { useRef, useState } from "react";
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
  const scrollY = useRef(0);
  return (
    <>
      <label
        className={`relative inline-flex overflow-hidden ${buttonClass} cursor-pointer ${disabled ? "pointer-events-none opacity-60" : ""}`}
      >
        {t.admin.chooseFile}
        <input
          name={name}
          type="file"
          accept={accept}
          required={required}
          disabled={disabled}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
          onClick={() => {
            scrollY.current = window.scrollY;
          }}
          onChange={(event) => {
            setFileName(event.target.files?.[0]?.name ?? "");
            event.currentTarget.blur();
            const top = scrollY.current;
            window.scrollTo(0, top);
            requestAnimationFrame(() => window.scrollTo(0, top));
          }}
        />
      </label>
      {fileName ? <span className="text-sm text-ink">{fileName}</span> : null}
    </>
  );
}
