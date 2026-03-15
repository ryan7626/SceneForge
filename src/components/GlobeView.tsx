"use client";

import { useEffect, useRef, useState } from "react";
import type { PhotoMetadata } from "@/lib/types";

interface GlobeViewProps {
  photos: PhotoMetadata[];
  onPhotoClick: (photo: PhotoMetadata) => void;
  selectedPhotoId?: string;
}

// Convert lat/lng to 3D position on sphere
function latLngToPos(lat: number, lng: number, radius: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return [x, y, z];
}

export function GlobeView({ photos, onPhotoClick, selectedPhotoId }: GlobeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredPhoto, setHoveredPhoto] = useState<PhotoMetadata | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;

    async function initGlobe() {
      const THREE = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");

      if (cancelled) return;

      const container = containerRef.current!;
      const width = container.clientWidth;
      const height = container.clientHeight;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.set(0, 1, 3.5);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setClearColor(0x000000, 0);
      container.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.4;
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.minPolarAngle = Math.PI * 0.3;
      controls.maxPolarAngle = Math.PI * 0.7;

      const RADIUS = 1.5;

      // Globe wireframe
      const globeGeo = new THREE.SphereGeometry(RADIUS, 48, 48);
      const globeMat = new THREE.MeshBasicMaterial({
        color: 0xe67e22,
        wireframe: true,
        transparent: true,
        opacity: 0.08,
      });
      const globe = new THREE.Mesh(globeGeo, globeMat);
      scene.add(globe);

      // Solid inner sphere for depth
      const innerGeo = new THREE.SphereGeometry(RADIUS * 0.98, 48, 48);
      const innerMat = new THREE.MeshBasicMaterial({
        color: 0xfcfaf7,
        transparent: true,
        opacity: 0.6,
      });
      scene.add(new THREE.Mesh(innerGeo, innerMat));

      // Latitude/longitude grid lines
      const gridMat = new THREE.LineBasicMaterial({ color: 0xe67e22, transparent: true, opacity: 0.04 });
      for (let lat = -60; lat <= 60; lat += 30) {
        const points: THREE.Vector3[] = [];
        for (let lng = 0; lng <= 360; lng += 5) {
          const [x, y, z] = latLngToPos(lat, lng, RADIUS * 1.001);
          points.push(new THREE.Vector3(x, y, z));
        }
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), gridMat));
      }

      // Photo pins
      const pinGroup = new THREE.Group();
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();
      const pinMeshes: { mesh: THREE.Mesh; photo: PhotoMetadata }[] = [];

      const photosWithLocation = photos.filter(
        (p) => p.location?.latitude != null && p.location?.longitude != null
      );

      for (const photo of photosWithLocation) {
        const [x, y, z] = latLngToPos(
          photo.location!.latitude!,
          photo.location!.longitude!,
          RADIUS * 1.02
        );

        // Pin dot
        const isSelected = photo.id === selectedPhotoId;
        const pinGeo = new THREE.SphereGeometry(isSelected ? 0.04 : 0.025, 16, 16);
        const pinMat = new THREE.MeshBasicMaterial({
          color: isSelected ? 0xd35400 : 0xe67e22,
        });
        const pin = new THREE.Mesh(pinGeo, pinMat);
        pin.position.set(x, y, z);
        pinGroup.add(pin);
        pinMeshes.push({ mesh: pin, photo });

        // Pulse ring
        const ringGeo = new THREE.RingGeometry(0.03, 0.05, 16);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xe67e22,
          transparent: true,
          opacity: 0.3,
          side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(x, y, z);
        ring.lookAt(0, 0, 0);
        pinGroup.add(ring);

        // Line from globe surface to pin
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(...latLngToPos(photo.location!.latitude!, photo.location!.longitude!, RADIUS)),
          new THREE.Vector3(x, y, z),
        ]);
        const lineMat = new THREE.LineBasicMaterial({ color: 0xe67e22, transparent: true, opacity: 0.4 });
        pinGroup.add(new THREE.Line(lineGeo, lineMat));
      }

      scene.add(pinGroup);

      // Click handler
      const handleClick = (e: MouseEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        const intersects = raycaster.intersectObjects(pinMeshes.map((p) => p.mesh));
        if (intersects.length > 0) {
          const hit = pinMeshes.find((p) => p.mesh === intersects[0].object);
          if (hit) onPhotoClick(hit.photo);
        }
      };

      // Hover handler
      const handleMouseMove = (e: MouseEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        const intersects = raycaster.intersectObjects(pinMeshes.map((p) => p.mesh));
        if (intersects.length > 0) {
          const hit = pinMeshes.find((p) => p.mesh === intersects[0].object);
          setHoveredPhoto(hit?.photo || null);
          renderer.domElement.style.cursor = "pointer";
        } else {
          setHoveredPhoto(null);
          renderer.domElement.style.cursor = "default";
        }
      };

      renderer.domElement.addEventListener("click", handleClick);
      renderer.domElement.addEventListener("mousemove", handleMouseMove);

      // Ambient light
      scene.add(new THREE.AmbientLight(0xffffff, 0.5));

      renderer.setAnimationLoop(() => {
        controls.update();
        renderer.render(scene, camera);
      });

      const handleResize = () => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener("resize", handleResize);

      return () => {
        renderer.setAnimationLoop(null);
        renderer.domElement.removeEventListener("click", handleClick);
        renderer.domElement.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("resize", handleResize);
        controls.dispose();
        renderer.dispose();
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      };
    }

    let cleanupFn: (() => void) | undefined;
    initGlobe().then((fn) => {
      if (!cancelled) cleanupFn = fn;
    });

    return () => {
      cancelled = true;
      cleanupFn?.();
    };
  }, [photos, selectedPhotoId, onPhotoClick]);

  const photosWithLocation = photos.filter(
    (p) => p.location?.latitude != null && p.location?.longitude != null
  );

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* Stats overlay */}
      <div className="absolute top-6 left-6 space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-primary font-bold">
          {photosWithLocation.length} Locations Mapped
        </p>
        <p className="text-[10px] uppercase tracking-widest text-muted font-bold">
          {photos.length} Total Memories
        </p>
      </div>

      {/* Hover tooltip */}
      {hoveredPhoto && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md border border-primary/20 px-6 py-3 shadow-xl">
          <p className="text-xs font-bold text-main truncate max-w-[200px]">
            {hoveredPhoto.originalName.replace(/\.[^/.]+$/, "")}
          </p>
          <p className="text-[10px] text-muted font-bold uppercase tracking-widest">
            {hoveredPhoto.dateTaken
              ? new Date(hoveredPhoto.dateTaken).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "Unknown date"}
            {hoveredPhoto.location?.latitude &&
              ` — ${hoveredPhoto.location.latitude.toFixed(2)}, ${hoveredPhoto.location.longitude?.toFixed(2)}`}
          </p>
        </div>
      )}
    </div>
  );
}
