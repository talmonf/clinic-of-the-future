"use client";

import { useEffect, useRef, useState } from "react";
import {
  CaptureUpdateAction,
  Excalidraw,
  FONT_FAMILY,
  convertToExcalidrawElements,
  newElementWith,
} from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI, AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import "@excalidraw/excalidraw/index.css";
import { recognizeImage } from "@/lib/board-ocr";
import { loadBoard, saveBoard, type BoardSnapshot } from "@/lib/board-store";
import { t } from "@/lib/i18n";

const TEXT_WIDTH = 420;

function sourceId(element: ExcalidrawElement) {
  const value = element.customData?.ocrSource;
  return typeof value === "string" ? value : null;
}

function alreadyRead(elements: readonly ExcalidrawElement[], fileId: string) {
  return elements.some((element) => {
    if (element.isDeleted) return false;
    if (sourceId(element) === fileId) return true;
    return element.type === "image" && element.fileId === fileId && element.customData?.ocrEmpty === true;
  });
}

function sceneSnapshot(
  elements: readonly ExcalidrawElement[],
  appState: {
    viewBackgroundColor: string;
    gridSize: number | null;
    scrollX: number;
    scrollY: number;
    zoom: { value: number };
  },
  files: BinaryFiles,
): BoardSnapshot {
  return {
    elements: [...elements],
    appState: {
      viewBackgroundColor: appState.viewBackgroundColor,
      gridSize: appState.gridSize,
      scrollX: appState.scrollX,
      scrollY: appState.scrollY,
      zoom: { value: appState.zoom.value },
    },
    files: { ...files },
  };
}

export default function BoardEditor() {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const startedRef = useRef(new Set<string>());
  const queueRef = useRef(Promise.resolve());
  const mountedRef = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef<BoardSnapshot | null>(null);
  const [snapshot, setSnapshot] = useState<BoardSnapshot | null | undefined>(undefined);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    loadBoard()
      .then((value) => {
        if (mountedRef.current) setSnapshot(value);
      })
      .catch(() => {
        if (mountedRef.current) setSnapshot(null);
      });
    return () => {
      mountedRef.current = false;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const pending = pendingSave.current;
      if (pending) void saveBoard(pending);
    };
  }, []);

  function scheduleSave(next: BoardSnapshot) {
    pendingSave.current = next;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      pendingSave.current = null;
      void saveBoard(next);
    }, 400);
  }

  function showNotice(message: string | null) {
    if (mountedRef.current) setNotice(message);
  }

  async function readImage(fileId: string, dataUrl: string) {
    showNotice(t.board.reading);
    let text = "";
    try {
      text = await recognizeImage(dataUrl);
    } catch {
      showNotice(t.board.failed);
      return;
    }
    const api = apiRef.current;
    if (!api) return;
    const elements = api.getSceneElementsIncludingDeleted();
    const image = elements.find((element) => element.type === "image" && element.fileId === fileId && !element.isDeleted);
    if (!image) return;
    if (!text) {
      api.updateScene({
        elements: elements.map((element) =>
          element.id === image.id ? newElementWith(element, { customData: { ...element.customData, ocrEmpty: true } }) : element,
        ),
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      });
      showNotice(t.board.empty);
      return;
    }
    const hebrew = /[\u0590-\u05FF]/.test(text);
    const [created] = convertToExcalidrawElements(
      [
        {
          type: "text",
          x: image.x + image.width + 24,
          y: image.y,
          width: TEXT_WIDTH,
          text,
          fontSize: 16,
          fontFamily: FONT_FAMILY["Liberation Sans"],
          textAlign: hebrew ? "right" : "left",
          autoResize: false,
        },
      ],
      { regenerateIds: true },
    );
    if (!created) return;
    const transcript = newElementWith(created, { customData: { ocrSource: fileId } });
    api.updateScene({
      elements: [...api.getSceneElementsIncludingDeleted(), transcript],
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
    showNotice(null);
  }

  function transcribe(elements: readonly ExcalidrawElement[], files: BinaryFiles) {
    for (const element of elements) {
      if (element.isDeleted || element.type !== "image" || !element.fileId) continue;
      const fileId = element.fileId;
      if (startedRef.current.has(fileId) || alreadyRead(elements, fileId)) continue;
      const dataUrl = files[fileId]?.dataURL;
      if (!dataUrl) continue;
      startedRef.current.add(fileId);
      queueRef.current = queueRef.current.then(() => readImage(fileId, dataUrl)).catch(() => {});
    }
  }

  if (snapshot === undefined) {
    return <p className="p-4 text-sm text-muted">{t.board.loading}</p>;
  }

  return (
    <div className="relative h-[calc(100dvh-11rem)] w-full md:h-[calc(100dvh-3rem)]">
      {notice ? (
        <p className="absolute start-3 bottom-3 z-10 max-w-sm rounded-md border border-line bg-card px-3 py-1 text-sm text-ink">
          {notice}
        </p>
      ) : null}
      <div dir="ltr" className="h-full w-full [&_.excalidraw]:h-full [&_.excalidraw]:min-h-0 [&_.excalidraw]:p-0">
        <Excalidraw
          initialData={
            snapshot
              ? {
                  elements: snapshot.elements as ExcalidrawElement[],
                  appState: snapshot.appState as Partial<AppState>,
                  files: snapshot.files as BinaryFiles,
                }
              : null
          }
          excalidrawAPI={(api) => {
            apiRef.current = api;
          }}
          onChange={(elements, appState, files) => {
            scheduleSave(sceneSnapshot(elements, appState, files));
            transcribe(elements, files);
          }}
        />
      </div>
    </div>
  );
}
