import fs from "fs";
import path from "path";
import { PhotoMetadata, PhotoStore } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "photos.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readStore(): PhotoStore {
  ensureDataDir();
  if (!fs.existsSync(STORE_PATH)) {
    return { photos: [] };
  }
  const data = fs.readFileSync(STORE_PATH, "utf-8");
  return JSON.parse(data);
}

function writeStore(store: PhotoStore) {
  ensureDataDir();
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

export function getAllPhotos(): PhotoMetadata[] {
  return readStore().photos;
}

export function addPhoto(photo: PhotoMetadata): void {
  const store = readStore();
  store.photos.push(photo);
  writeStore(store);
}

export function getPhotoById(id: string): PhotoMetadata | undefined {
  return readStore().photos.find((p) => p.id === id);
}

export function searchPhotosByDate(
  dateQuery: string
): PhotoMetadata[] {
  const photos = readStore().photos;
  const query = dateQuery.toLowerCase();

  return photos.filter((photo) => {
    if (!photo.dateTaken) return false;
    const photoDate = new Date(photo.dateTaken);
    const dateStr = photoDate.toISOString().split("T")[0];
    const readableDate = photoDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).toLowerCase();

    return (
      dateStr.includes(query) ||
      readableDate.includes(query) ||
      photo.dateTaken.includes(query)
    );
  });
}

export function searchPhotosByText(query: string): PhotoMetadata[] {
  const photos = readStore().photos;
  const q = query.toLowerCase();

  return photos.filter((photo) => {
    const searchable = [
      photo.description,
      photo.originalName,
      photo.location || "",
      ...(photo.tags || []),
      photo.dateTaken || "",
    ]
      .join(" ")
      .toLowerCase();
    return searchable.includes(q);
  });
}

export function searchPhotos(query: string): PhotoMetadata[] {
  const photos = readStore().photos;
  const q = query.toLowerCase();

  // Try to extract date patterns
  const datePatterns = [
    /(\d{4})-(\d{1,2})-(\d{1,2})/,                    // 2009-12-01
    /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i,  // December 1st, 2009
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,                    // 12/01/2009
  ];

  const results: PhotoMetadata[] = [];

  for (const photo of photos) {
    if (!photo.dateTaken) continue;

    const photoDate = new Date(photo.dateTaken);
    let matched = false;

    // Check date match
    for (const pattern of datePatterns) {
      const match = query.match(pattern);
      if (match) {
        const queryDate = new Date(match[0]);
        if (!isNaN(queryDate.getTime())) {
          const sameDay =
            photoDate.getFullYear() === queryDate.getFullYear() &&
            photoDate.getMonth() === queryDate.getMonth() &&
            photoDate.getDate() === queryDate.getDate();
          if (sameDay) matched = true;
        }
      }
    }

    // Check year match
    const yearMatch = q.match(/\b(19|20)\d{2}\b/);
    if (yearMatch && photoDate.getFullYear().toString() === yearMatch[0]) {
      matched = true;
    }

    // Check month match
    const months = [
      "january", "february", "march", "april", "may", "june",
      "july", "august", "september", "october", "november", "december",
    ];
    for (let i = 0; i < months.length; i++) {
      if (q.includes(months[i]) && photoDate.getMonth() === i) {
        matched = true;
      }
    }

    // Check text match
    const searchable = [
      photo.description,
      photo.originalName,
      photo.location || "",
      ...(photo.tags || []),
    ]
      .join(" ")
      .toLowerCase();
    if (searchable.includes(q)) matched = true;

    if (matched) results.push(photo);
  }

  // If no results from smart search, fall back to simple text search
  if (results.length === 0) {
    return searchPhotosByText(query);
  }

  return results;
}
