import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "prisma", "schema.prisma");
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "schema.prisma not found" },
        { status: 404 }
      );
    }

    const content = fs.readFileSync(filePath, "utf8");
    return NextResponse.json({ schema: content });
  } catch (error: any) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
