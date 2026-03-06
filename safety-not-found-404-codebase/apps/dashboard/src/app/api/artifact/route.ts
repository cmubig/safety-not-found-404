import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const EXTENSION_TO_CONTENT_TYPE: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".log": "text/plain; charset=utf-8",
};

export async function GET(req: NextRequest) {
  const filePath = req.nextUrl.searchParams.get("path");
  if (!filePath) {
    return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
  }

  const workspaceRoot = path.resolve(process.cwd(), "..", "..");
  const engineRoot = path.join(workspaceRoot, "services", "research-engine");
  const resolved = path.resolve(filePath);

  if (!resolved.startsWith(engineRoot)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  if (!fs.existsSync(resolved)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const stat = fs.statSync(resolved);
  if (!stat.isFile()) {
    return NextResponse.json({ error: "Not a file" }, { status: 400 });
  }

  const ext = path.extname(resolved).toLowerCase();
  const contentType = EXTENSION_TO_CONTENT_TYPE[ext] ?? "application/octet-stream";

  const buffer = fs.readFileSync(resolved);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(buffer.length),
      "Cache-Control": "no-cache",
    },
  });
}
