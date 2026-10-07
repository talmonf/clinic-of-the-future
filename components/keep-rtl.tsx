"use client";

import { useEffect } from "react";

/** Excalidraw sets the document direction from its own language. Keep the site RTL. */
export function KeepRtl() {
  useEffect(() => {
    const root = document.documentElement;
    const keep = () => {
      if (root.getAttribute("dir") !== "rtl") root.setAttribute("dir", "rtl");
      if (root.lang !== "he") root.lang = "he";
    };
    keep();
    const observer = new MutationObserver(keep);
    observer.observe(root, { attributes: true, attributeFilter: ["dir", "lang"] });
    return () => observer.disconnect();
  }, []);
  return null;
}
