import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  try {
    const livekitUrl = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!livekitUrl || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "LiveKit environment variables not configured" },
        { status: 500 }
      );
    }

    const roomName = `memory-room-${uuidv4().slice(0, 8)}`;
    const participantName = `user-${uuidv4().slice(0, 6)}`;

    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      name: participantName,
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({
      serverUrl: livekitUrl,
      roomName,
      participantToken: token,
      participantName,
    });
  } catch (error) {
    console.error("Connection details error:", error);
    return NextResponse.json(
      { error: "Failed to create connection details" },
      { status: 500 }
    );
  }
}
