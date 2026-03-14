"use client";

import { useCallback, useState, useRef } from "react";
import type { PhotoMetadata } from "@/lib/types";

interface PhotoUploaderProps {
  onPhotosUploaded: (photos: PhotoMetadata[]) => void;
}

export function PhotoUploader({ onPhotosUploaded }: PhotoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (files: FileList | File[]) => {
      setUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      const fileArray = Array.from(files);

      for (const file of fileArray) {
        formData.append("photos", file);
      }

      try {
        const res = await fetch("/api/upload-photos", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Upload failed");

        const data = await res.json();
        setUploadProgress(100);
        onPhotosUploaded(data.photos);
      } catch (error) {
        console.error("Upload failed:", error);
      } finally {
        setUploading(false);
        setTimeout(() => setUploadProgress(0), 1000);
      }
    },
    [onPhotosUploaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length) {
        handleUpload(e.dataTransfer.files);
      }
    },
    [handleUpload]
  );

  return (
    <div
      className={`relative border transition-all duration-300 p-24 text-center cursor-pointer min-h-[400px] flex flex-col items-center justify-center ${
        isDragging
          ? "border-main bg-slate-50"
          : "border-dashed border-slate-300 hover:border-main hover:bg-slate-50"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleUpload(e.target.files)}
      />

      {uploading ? (
        <div className="space-y-8 w-full max-w-sm mx-auto">
          <p className="text-xs uppercase tracking-widest text-primary font-bold">Resurrecting...</p>
          <div className="w-full h-[1px] bg-slate-100">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out shadow-[0_0_10px_rgba(230,126,34,0.5)]"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-sm uppercase tracking-widest text-primary font-bold">
              Gather Memories
            </h3>
            <p className="text-xs text-muted max-w-xs mx-auto uppercase tracking-widest leading-loose font-medium">
              Drop your moments here to bring them back to life.
            </p>
          </div>
          <button className="px-10 py-4 border border-primary text-primary text-xs uppercase tracking-widest font-bold hover:bg-primary hover:text-white transition-all hover:shadow-lg hover:shadow-primary/20">
            Choose Moments
          </button>
        </div>
      )}

    </div>
  );
}

