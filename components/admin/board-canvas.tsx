"use client";

import dynamic from "next/dynamic";
import { t } from "@/lib/i18n";

const BoardEditor = dynamic(() => import("./board-editor"), {
  ssr: false,
  loading: () => <p className="p-4 text-sm text-muted">{t.board.loading}</p>,
});

export function BoardCanvas() {
  return (
    <div className="-mx-4 -my-6 min-h-0 flex-1 md:-mx-8">
      <BoardEditor />
    </div>
  );
}
