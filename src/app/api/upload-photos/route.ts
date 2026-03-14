import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { addPhoto } from "@/lib/photo-store";
import type { PhotoMetadata } from "@/lib/types";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function POST(request: NextRequest) {
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });

    const formData = await request.formData();
    const files = formData.getAll("photos") as File[];

    if (!files.length) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    const uploaded: PhotoMetadata[] = [];

    for (const file of files) {
      const id = uuidv4();
      const ext = path.extname(file.name) || ".jpg";
      const filename = `${id}${ext}`;
      const filePath = path.join(UPLOAD_DIR, filename);

      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);

      // Try to extract EXIF date from the file
      let dateTaken: string | null = null;
      try {
        const exifr = await import("exifr");
        const exifData = await exifr.default.parse(buffer, {
          pick: ["DateTimeOriginal", "CreateDate", "ModifyDate", "GPSLatitude", "GPSLongitude"],
        });
        if (exifData) {
          const dateField = exifData.DateTimeOriginal || exifData.CreateDate || exifData.ModifyDate;
          if (dateField) {
            dateTaken = new Date(dateField).toISOString();
          }
        }
      } catch {
        // EXIF extraction failed, that's okay
      }

      // Check if a date was provided via form data
      const providedDate = formData.get(`date_${file.name}`) as string | null;
      if (providedDate && !dateTaken) {
        dateTaken = new Date(providedDate).toISOString();
      }

      const description = (formData.get(`description_${file.name}`) as string) || "";

      const photo: PhotoMetadata = {
        id,
        filename,
        originalName: file.name,
        dateTaken,
        description,
        tags: [],
        uploadedAt: new Date().toISOString(),
        path: filePath,
        url: `/uploads/${filename}`,
      };

      addPhoto(photo);
      uploaded.push(photo);
    }

    return NextResponse.json({ photos: uploaded });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
