"use client";

import { useCallback, useEffect, useState } from "react";

type ArtifactViewerProps = {
  path: string | null;
  onClose: () => void;
};

type ArtifactContent =
  | { type: "image"; url: string }
  | { type: "text"; content: string }
  | { type: "error"; message: string }
  | null;

function getArtifactType(filePath: string): "image" | "text" {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "svg"].includes(ext)) return "image";
  return "text";
}

function getFileName(filePath: string): string {
  return filePath.split("/").pop() ?? filePath;
}

export function ArtifactViewer({ path: artifactPath, onClose }: ArtifactViewerProps) {
  const [content, setContent] = useState<ArtifactContent>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadArtifact = useCallback(async (filePath: string) => {
    setIsLoading(true);
    setContent(null);

    const apiUrl = `/api/artifact?path=${encodeURIComponent(filePath)}`;
    const type = getArtifactType(filePath);

    try {
      const response = await fetch(apiUrl);

      if (!response.ok) {
        const errorBody = await response.text();
        setContent({ type: "error", message: `Failed to load (${response.status}): ${errorBody}` });
        return;
      }

      if (type === "image") {
        setContent({ type: "image", url: apiUrl });
      } else {
        const text = await response.text();
        setContent({ type: "text", content: text });
      }
    } catch (err) {
      setContent({ type: "error", message: err instanceof Error ? err.message : String(err) });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (artifactPath) {
      void loadArtifact(artifactPath);
    } else {
      setContent(null);
    }
  }, [artifactPath, loadArtifact]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (artifactPath) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [artifactPath, onClose]);

  if (!artifactPath) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-[90vw] max-w-4xl max-h-[85vh] bg-neutral-950 border border-neutral-700 rounded-xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <p className="text-sm font-mono text-neutral-300 truncate">{getFileName(artifactPath)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-1 text-xs border border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500"
          >
            ESC
          </button>
        </div>

        {/* Path bar */}
        <div className="px-4 py-2 border-b border-neutral-800 bg-black/30">
          <p className="text-[11px] font-mono text-neutral-600 break-all">{artifactPath}</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading && (
            <div className="flex items-center justify-center h-40">
              <div className="w-5 h-5 border-2 border-neutral-600 border-t-white rounded-full animate-spin" />
            </div>
          )}

          {content?.type === "error" && (
            <div className="border border-red-800 px-4 py-3 text-sm text-red-300">
              {content.message}
            </div>
          )}

          {content?.type === "image" && (
            <div className="flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={content.url}
                alt={getFileName(artifactPath)}
                className="max-w-full max-h-[65vh] object-contain rounded"
              />
            </div>
          )}

          {content?.type === "text" && (
            <pre className="text-xs text-neutral-300 font-mono whitespace-pre-wrap leading-relaxed max-h-[65vh] overflow-auto">
              {content.content}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
