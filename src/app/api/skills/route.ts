import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const sql = getDb();
  const result = await sql`SELECT * FROM skills_taxonomy ORDER BY category, name`;
  return NextResponse.json(result);
}
