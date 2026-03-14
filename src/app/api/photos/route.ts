import { NextRequest, NextResponse } from "next/server";
import { getAllPhotos, searchPhotos, getPhotoById } from "@/lib/photo-store";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const id = searchParams.get("id");

  if (id) {
    const photo = getPhotoById(id);
    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }
    return NextResponse.json({ photo });
  }

  if (query) {
    const photos = searchPhotos(query);
    return NextResponse.json({ photos });
  }

  const photos = getAllPhotos();
  return NextResponse.json({ photos });
}
