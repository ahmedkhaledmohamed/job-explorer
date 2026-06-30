import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const sql = getDb();

  const signals = await sql`
    SELECT * FROM match_signals
    WHERE positive_count + negative_count >= 1
    ORDER BY
      CASE signal_type
        WHEN 'skill' THEN 1 WHEN 'company' THEN 2 WHEN 'source' THEN 3 ELSE 4
      END,
      weight DESC
  `;

  const summary = await sql`
    SELECT signal_type, COUNT(*) as count,
           AVG(weight) as avg_weight,
           SUM(positive_count) as total_positive,
           SUM(negative_count) as total_negative
    FROM match_signals
    WHERE positive_count + negative_count >= 1
    GROUP BY signal_type
    ORDER BY total_positive DESC
  `;

  return NextResponse.json({ signals, summary });
}
