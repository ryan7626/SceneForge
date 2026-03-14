"use client";

import type { PhotoMetadata } from "@/lib/types";
import Image from "next/image";

interface PhotoGalleryProps {
  photos: PhotoMetadata[];
  highlightedIds?: string[];
}

export function PhotoGallery({ photos, highlightedIds = [] }: PhotoGalleryProps) {
  if (photos.length === 0) return null;

  return (
    <div className="space-y-8 mt-12">
      <h3 className="text-xs uppercase tracking-widest text-muted border-b border-slate-100 pb-4">
        Archive ({photos.length})
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8">
        {photos.map((photo) => {
          const isHighlighted = highlightedIds.includes(photo.id);
          const date = photo.dateTaken
            ? new Date(photo.dateTaken).toLocaleDateString("en-US", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              })
            : "No date recorded";

          return (
            <div
              key={photo.id}
              className={`group flex flex-col gap-3 transition-opacity ${
                isHighlighted ? "opacity-100 scale-[1.02]" : "hover:opacity-100"
              }`}
            >
              <div 
                className={`relative aspect-4/3 w-full overflow-hidden bg-white shadow-sm transition-all duration-500 ${
                  isHighlighted ? "border-2 border-primary ring-4 ring-primary/10" : "border border-slate-100"
                }`}
              >
                <Image
                  src={photo.url}
                  alt={photo.description || photo.originalName}
                  fill
                  className={`object-cover transition-all duration-1000 ${
                    isHighlighted ? "grayscale-0 scale-105" : "grayscale-50 group-hover:grayscale-0 group-hover:scale-105"
                  }`}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
              
              <div className="px-1 flex justify-between items-baseline gap-4">
                <p className="text-xs text-main font-bold truncate uppercase tracking-widest">
                  {photo.originalName.replace(/\.[^/.]+$/, "")}
                </p>
                <span className="text-[10px] text-muted tracking-widest font-bold">
                  {date}
                </span>
              </div>
            </div>

          );
        })}
      </div>
    </div>
  );
}

