"use client";

import { DragEvent, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { IconKnowledge } from "@/components/icons";
import { Spinner } from "@/components/ui/Spinner";

const ACCEPT = ".pdf,.docx,.txt,.md";

interface UploadDropzoneProps {
  onFiles: (files: File[]) => void;
  uploading: boolean;
}

export function UploadDropzone({ onFiles, uploading }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    if (uploading) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles(files);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition",
        dragActive
          ? "border-indigo-400 bg-indigo-50"
          : "border-gray-300 bg-white hover:border-gray-400",
        uploading && "pointer-events-none opacity-70",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          e.target.value = ""; // allow re-selecting the same file
        }}
      />
      <div className="mb-3 rounded-full bg-indigo-50 p-3 text-indigo-600">
        {uploading ? (
          <Spinner className="h-6 w-6" />
        ) : (
          <IconKnowledge className="h-6 w-6" />
        )}
      </div>
      <p className="text-sm font-medium text-gray-900">
        {uploading ? "Uploading…" : "Drag & drop files, or click to browse"}
      </p>
      <p className="mt-1 text-xs text-gray-500">
        PDF, DOCX, TXT, or Markdown — up to 10 MB each
      </p>
    </div>
  );
}
