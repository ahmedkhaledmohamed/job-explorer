import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/auth";
import { createHash, randomBytes } from "crypto";

async function getUserId(): Promise<number> {
  const session = await auth();
  if (session?.user?.id) return parseInt(session.user.id);
  const sql = getDb();
  const result = await sql`SELECT id FROM users ORDER BY id LIMIT 1`;
  return (result[0]?.id as number) || 1;
}

export async function GET() {
  const sql = getDb();
  const userId = await getUserId();

  const keys = await sql`
    SELECT id, key_prefix, name, permissions, last_used, created_at
    FROM api_keys WHERE account_type = 'user' AND account_id = ${userId}
    ORDER BY created_at DESC
  `;

  return NextResponse.json(keys);
}

export async function POST(request: NextRequest) {
  const sql = getDb();
  const userId = await getUserId();
  const body = await request.json();
  const { name, permissions } = body;

  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const rawKey = `jx_${randomBytes(24).toString("hex")}`;
  const prefix = rawKey.slice(0, 10);
  const hash = createHash("sha256").update(rawKey).digest("hex");

  await sql`
    INSERT INTO api_keys (account_type, account_id, key_prefix, key_hash, name, permissions)
    VALUES ('user', ${userId}, ${prefix}, ${hash}, ${name}, ${permissions || ["read:profile"]})
  `;

  return NextResponse.json({ key: rawKey, prefix, name }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const sql = getDb();
  const userId = await getUserId();
  const { searchParams } = new URL(request.url);
  const keyId = searchParams.get("id");

  if (!keyId) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  await sql`DELETE FROM api_keys WHERE id = ${parseInt(keyId)} AND account_type = 'user' AND account_id = ${userId}`;
  return NextResponse.json({ deleted: true });
}
