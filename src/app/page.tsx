"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PhotoUploader } from "@/components/PhotoUploader";
import { PhotoGallery } from "@/components/PhotoGallery";
import { VoiceInterface } from "@/components/VoiceInterface";
import { WorldViewer, applySceneEditGlobal } from "@/components/WorldViewer";
import { SceneEditBar } from "@/components/SceneEditBar";
import { NetworkBackground } from "@/components/NetworkBackground";
import type { PhotoMetadata } from "@/lib/types";

const SUGGESTIONS = [
  "What was I doing on December 1st, 2009?",
  "Show me my summer vacation photos",
  "Take me back to my birthday party",
  "Find photos from 2015",
];

export default function Home() {
  const [photos, setPhotos] = useState<PhotoMetadata[]>([]);
  const [worldUrl, setWorldUrl] = useState<string | undefined>();
  const [splatUrl, setSplatUrl] = useState<string | undefined>();
  const [splatUrls, setSplatUrls] = useState<{ "100k"?: string; "500k"?: string; full_res?: string } | undefined>();
  const [worldCaption, setWorldCaption] = useState<string | undefined>();
  const [worldThumbnail, setWorldThumbnail] = useState<string | undefined>();
  const [isGeneratingWorld, setIsGeneratingWorld] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [highlightedPhotoIds, setHighlightedPhotoIds] = useState<string[]>([]);
  const [showLightbox, setShowLightbox] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const vaultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setHasScrolled(window.scrollY > 100);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    fetch("/api/photos")
      .then((res) => res.json())
      .then((data) => {
        if (data.photos?.length > 0) setPhotos(data.photos);
      })
      .catch(console.error);
  }, []);

  const handlePhotosUploaded = useCallback((newPhotos: PhotoMetadata[]) => {
    setPhotos((prev) => [...prev, ...newPhotos]);
  }, []);

  const handleWorldGenerated = useCallback((url: string, splat?: string, allSplatUrls?: { "100k"?: string; "500k"?: string; full_res?: string }) => {
    setWorldUrl(url);
    if (splat) setSplatUrl(splat);
    if (allSplatUrls) setSplatUrls(allSplatUrls);
    setIsGeneratingWorld(false);
    setShowLightbox(true);
  }, []);

  return (
    <main className="min-h-screen bg-transparent">
      <NetworkBackground />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 spatial-header __enableXr__">
        <div className="max-w-screen-2xl mx-auto px-6 py-5 flex items-center justify-between">
          <h1 className="text-xs font-light tracking-[0.3em] text-white/70 uppercase">
            SceneForge
          </h1>
        </div>
      </header>

      {/* ── Drawer toggle (left edge) ── */}
      <button
        onClick={() => setDrawerOpen(!drawerOpen)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-40 w-5 h-14 glass flex items-center justify-center hover:bg-white/10 transition-colors rounded-r-lg group border-l-0"
        title={drawerOpen ? "Close archive" : "Open archive"}
      >
        <svg
          className={`w-3 h-3 text-white/30 group-hover:text-white/70 transition-all duration-300 ${drawerOpen ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* ── Photos / Upload drawer (glassmorphism) ── */}
      <div
        className={`fixed left-0 top-0 bottom-0 z-30 w-96 glass-strong shadow-2xl shadow-black/30 transition-transform duration-300 ease-out overflow-y-auto ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="pt-24 px-6 pb-8 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-light">Photo Archive</h2>
            <button onClick={() => setDrawerOpen(false)} className="text-white/30 hover:text-white/70 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <PhotoUploader onPhotosUploaded={handlePhotosUploaded} />
            </div>
            <button
              className="flex-shrink-0 w-[52px] h-[52px] border border-dashed border-slate-300 hover:border-primary hover:bg-slate-50 transition-all flex items-center justify-center group"
              title="Import from Google Photos"
              onClick={() => window.open("https://photos.google.com", "_blank")}
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10h1V12H7.38l.72-1.2L12 4.36V2z" fill="#EA4335"/>
                <path d="M12 2v2.36l3.9 6.44L16.62 12H13v10h-1c5.52 0 10-4.48 10-10S17.52 2 12 2z" fill="#4285F4"/>
                <path d="M2 12c0 5.52 4.48 10 10 10v-10H2z" fill="#34A853"/>
                <path d="M12 12h10c0-5.52-4.48-10-10-10v10z" fill="#FBBC05"/>
              </svg>
            </button>
          </div>

          {photos.length > 0 && (
            <PhotoGallery photos={photos} highlightedIds={highlightedPhotoIds} />
          )}
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="pt-20 pb-20 px-6">
        <div className="max-w-screen-2xl mx-auto">
          <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-12 min-h-[85vh]">

            {/* Left Column: Voice Orb + Suggestions */}
            <div className="flex flex-col items-center justify-center gap-8">
              <VoiceInterface onWorldGenerated={handleWorldGenerated} />

              {/* Example prompts */}
              <div className="w-full max-w-xs space-y-2">
                <p className="text-[9px] uppercase tracking-[0.2em] text-white/30 font-light text-center mb-3">
                  Try saying...
                </p>
                {SUGGESTIONS.map((s, i) => (
                  <div
                    key={i}
                    className="px-4 py-2.5 glass text-[11px] text-white/50 tracking-wide hover:text-white/80 hover:border-white/20 transition-all cursor-default text-center rounded-lg"
                  >
                    {s}
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: World Viewer */}
            <div className="space-y-8">
              <div className="sticky top-20">
                {worldUrl || splatUrl ? (
                  <button
                    onClick={() => setShowLightbox(true)}
                    className="w-full relative overflow-hidden glass aspect-video group cursor-pointer rounded-xl"
                  >
                    {worldThumbnail ? (
                      <img src={worldThumbnail} alt="World preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-1000" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-light">World Ready</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="px-6 py-3 glass text-white/80 text-[10px] font-light uppercase tracking-[0.2em] rounded-full">
                        Step Into Memory
                      </div>
                    </div>
                  </button>
                ) : (
                  <WorldViewer isGenerating={isGeneratingWorld} />
                )}

                {generationError && (
                  <div className="mt-6 glass rounded-lg p-4 text-center">
                    <p className="text-[10px] uppercase tracking-[0.15em] font-light text-red-400">{generationError}</p>
                    <button
                      onClick={() => setGenerationError(null)}
                      className="mt-3 text-[9px] tracking-[0.15em] uppercase text-red-400/60 hover:text-red-400 font-light underline underline-offset-4"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {!worldUrl && !isGeneratingWorld && (
                  <div className="mt-6 text-center glass rounded-lg p-4">
                    <p className="text-[10px] text-white/30 font-light uppercase tracking-[0.15em]">
                      Talk to the assistant or open the archive to generate a world.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Blinking "Example Vaults" arrow — hides on scroll ── */}
      {photos.length > 0 && !hasScrolled && (
        <button
          onClick={() => vaultsRef.current?.scrollIntoView({ behavior: "smooth" })}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 cursor-pointer group"
        >
          <span className="text-[9px] uppercase tracking-[0.2em] text-white/25 font-light group-hover:text-white/50 transition-colors">
            Example Vaults
          </span>
          <svg className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 transition-colors animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      {/* ── Example Vaults section ── */}
      {photos.length > 0 && (
        <div ref={vaultsRef} className="px-6 pb-24">
          <div className="max-w-screen-2xl mx-auto">
            <div className="border-t border-white/5 pt-16">
              <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-light text-center mb-2">
                Example Vaults
              </h2>
              <p className="text-[9px] uppercase tracking-[0.15em] text-white/20 font-light text-center mb-10">
                Select a memory to generate its world
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {photos.slice(0, 18).map((photo) => (
                  <div
                    key={photo.id}
                    className="group relative aspect-square overflow-hidden glass rounded-lg hover:border-white/20 transition-all"
                  >
                    <img
                      src={photo.url}
                      alt={photo.originalName}
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                    />
                    {/* Hover overlay with two actions */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2">
                      <button
                        disabled={isGeneratingWorld}
                        onClick={async () => {
                          setIsGeneratingWorld(true);
                          setGenerationError(null);
                          setHighlightedPhotoIds([photo.id]);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                          try {
                            const res = await fetch("/api/generate-world", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                photoUrl: photo.url,
                                photoId: photo.id,
                                displayName: photo.description || photo.originalName,
                                metadata: {
                                  dateTaken: photo.dateTaken,
                                  latitude: photo.location?.latitude,
                                  longitude: photo.location?.longitude,
                                  cameraMake: photo.camera?.make,
                                  cameraModel: photo.camera?.model,
                                  width: photo.width,
                                  height: photo.height,
                                  originalName: photo.originalName,
                                },
                              }),
                            });
                            const data = await res.json();
                            if (data.error) {
                              setGenerationError(data.details || data.error);
                              setIsGeneratingWorld(false);
                            } else if (data.worldUrl) {
                              handleWorldGenerated(data.worldUrl, data.splatUrl, data.splatUrls);
                              if (data.caption) setWorldCaption(data.caption);
                              if (data.thumbnailUrl) setWorldThumbnail(data.thumbnailUrl);
                            } else {
                              setGenerationError("Generation timed out.");
                              setIsGeneratingWorld(false);
                            }
                          } catch (err) {
                            setGenerationError(err instanceof Error ? err.message : "Failed");
                            setIsGeneratingWorld(false);
                          }
                        }}
                        className="w-8 h-8 rounded-full glass hover:bg-white/20 text-white/80 flex items-center justify-center transition-all disabled:opacity-50"
                        title="Generate world"
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      </button>
                      <button
                        onClick={() => setPhotos((prev) => prev.filter((p) => p.id !== photo.id))}
                        className="w-8 h-8 rounded-full glass hover:bg-red-500/30 text-white/50 hover:text-red-300 flex items-center justify-center transition-all"
                        title="Remove"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox */}
      {showLightbox && (worldUrl || splatUrl) && (
        <div className="fixed inset-0 z-100 bg-black spatial-lightbox spatial-world __enableXr__">
          <div className="absolute top-8 right-8 z-110 flex items-center gap-3">
            {worldCaption && (
              <div className="relative group/info">
                <div className="w-10 h-10 flex items-center justify-center glass rounded-full text-white/50 hover:text-white/80 transition-all cursor-help">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="absolute top-12 right-0 w-72 p-5 glass-strong rounded-xl shadow-2xl opacity-0 translate-y-2 pointer-events-none group-hover/info:opacity-100 group-hover/info:translate-y-0 transition-all duration-300">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-light mb-2">
                    Memory Reconstruction
                  </p>
                  <p className="text-xs text-white/70 leading-relaxed tracking-wide font-light italic">
                    &ldquo;{worldCaption}&rdquo;
                  </p>
                </div>
              </div>
            )}
            {worldUrl && (
              <a
                href={worldUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 glass rounded-full text-[10px] text-white/60 font-light uppercase tracking-[0.15em] hover:text-white/90 hover:bg-white/10 transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open in Marble
              </a>
            )}
            <button
              onClick={() => setShowLightbox(false)}
              className="w-10 h-10 flex items-center justify-center glass rounded-full text-white/50 hover:text-white/80 transition-all"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="w-full h-full relative">
            <WorldViewer
              worldUrl={worldUrl}
              splatUrl={splatUrl}
              splatUrls={splatUrls}
              thumbnailUrl={worldThumbnail}
              caption={worldCaption}
              isGenerating={false}
              fullscreen
            />
            <SceneEditBar onSceneEdit={applySceneEditGlobal} />
          </div>
        </div>
      )}
    </main>
  );
}
