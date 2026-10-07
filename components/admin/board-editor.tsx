"use client";

import { useEffect, useRef, useState } from "react";
import {
  CaptureUpdateAction,
  Excalidraw,
  FONT_FAMILY,
  convertToExcalidrawElements,
  newElementWith,
  viewportCoordsToSceneCoords,
} from "@excalidraw/excalidraw";
import type { AppState, BinaryFiles, DataURL, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement, FileId } from "@excalidraw/excalidraw/element/types";
import "@excalidraw/excalidraw/index.css";
import { recognizeImage } from "@/lib/board-ocr";
import { loadBoard, saveBoard, type BoardSnapshot } from "@/lib/board-store";
import { t } from "@/lib/i18n";

const TEXT_WIDTH = 360;
const GAP = 40;

function sourceId(element: ExcalidrawElement) {
  const value = element.customData?.ocrSource;
  return typeof value === "string" ? value : null;
}

function wrapTranscript(text: string) {
  const max = 42;
  return text
    .split("\n")
    .map((line) => {
      const words = line.trim().split(/\s+/).filter(Boolean);
      const rows: string[] = [];
      let current = "";
      for (const word of words) {
        const next = current ? `${current} ${word}` : word;
        if (next.length > max && current) {
          rows.push(current);
          current = word;
        } else current = next;
      }
      if (current) rows.push(current);
      return rows.join("\n");
    })
    .filter((line, index, lines) => line || lines[index - 1])
    .join("\n")
    .trim();
}

function beside(image: { x: number; width: number }) {
  return image.x + image.width + GAP;
}

function parkTranscripts(elements: readonly ExcalidrawElement[]) {
  let moved = false;
  const next = elements.map((element) => {
    const fileId = sourceId(element);
    if (!fileId || element.isDeleted || element.type !== "text") return element;
    const image = elements.find(
      (item) => item.type === "image" && !item.isDeleted && item.fileId === fileId,
    );
    if (!image) return element;
    const x = beside(image);
    if (element.x >= image.x + image.width + 8) return element;
    moved = true;
    return newElementWith(element, { x });
  });
  return moved ? next : null;
}

function clipboardImage(data: DataTransfer | null) {
  if (!data) return null;
  const fromFiles = [...data.files].find((file) => file.type.startsWith("image/"));
  if (fromFiles) return fromFiles;
  const item = [...data.items].find((entry) => entry.kind === "file" && entry.type.startsWith("image/"));
  return item?.getAsFile() ?? null;
}

function readDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function imageSize(url: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("image"));
    img.src = url;
  });
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
  const parkingRef = useRef(false);
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

  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("input, textarea, [contenteditable='true']")) return;
      const image = clipboardImage(event.clipboardData);
      if (!image) return;
      event.preventDefault();
      event.stopPropagation();
      void placeClipboardImage(image);
    }
    window.addEventListener("paste", onPaste, true);
    return () => window.removeEventListener("paste", onPaste, true);
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

  async function placeClipboardImage(file: File) {
    const api = apiRef.current;
    if (!api) return;
    const dataUrl = await readDataUrl(file);
    const natural = await imageSize(dataUrl);
    const appState = api.getAppState();
    const maxEdge = (Math.min(appState.width, appState.height) / appState.zoom.value) * 0.62;
    const scale = Math.min(1, maxEdge / Math.max(natural.width, natural.height, 1));
    const width = Math.max(32, natural.width * scale);
    const height = Math.max(32, natural.height * scale);
    const center = viewportCoordsToSceneCoords(
      {
        clientX: appState.offsetLeft + appState.width / 2,
        clientY: appState.offsetTop + appState.height / 2,
      },
      appState,
    );
    const fileId = crypto.randomUUID() as FileId;
    const mimeType = (file.type || "image/png") as BinaryFiles[string]["mimeType"];
    api.addFiles([
      {
        id: fileId,
        dataURL: dataUrl as DataURL,
        mimeType,
        created: Date.now(),
      },
    ]);
    const [image] = convertToExcalidrawElements(
      [
        {
          type: "image",
          x: center.x - width / 2,
          y: center.y - height / 2,
          width,
          height,
          fileId,
        },
      ],
      { regenerateIds: true },
    );
    if (!image) return;
    api.updateScene({
      elements: [...api.getSceneElementsIncludingDeleted(), image],
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
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
    const wrapped = wrapTranscript(text);
    const lines = wrapped.split("\n").length;
    const [created] = convertToExcalidrawElements(
      [
        {
          type: "text",
          x: beside(image),
          y: image.y,
          width: TEXT_WIDTH,
          height: lines * 22,
          text: wrapped,
          fontSize: 16,
          fontFamily: FONT_FAMILY["Liberation Sans"],
          textAlign: hebrew ? "right" : "left",
          autoResize: false,
        },
      ],
      { regenerateIds: true },
    );
    if (!created) return;
    const transcript = newElementWith(created, {
      x: beside(image),
      y: image.y,
      customData: { ocrSource: fileId },
    });
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
          autoFocus
          onChange={(elements, appState, files) => {
            if (parkingRef.current) {
              parkingRef.current = false;
              scheduleSave(sceneSnapshot(elements, appState, files));
              return;
            }
            const placed = parkTranscripts(elements);
            const scene = placed ?? elements;
            scheduleSave(sceneSnapshot(scene, appState, files));
            if (placed) {
              parkingRef.current = true;
              apiRef.current?.updateScene({
                elements: placed,
                captureUpdate: CaptureUpdateAction.NEVER,
              });
            }
            transcribe(scene, files);
          }}
        />
      </div>
    </div>
  );
}
