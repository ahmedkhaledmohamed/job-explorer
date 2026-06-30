import { NextRequest, NextResponse } from "next/server";
import { generate } from "@/lib/ai";

const SYSTEM_PROMPT = `You are a career coach helping a senior product/engineering leader structure a case study that demonstrates their thinking quality to hiring managers.

Given a freeform description of a project or achievement, extract and structure it into:

1. situation: What was the context? What problem existed? (2-3 sentences)
2. approach: How did they tackle it? What was the strategy? (2-3 sentences)
3. decisions: Array of key decisions made, each with:
   - decision: What was decided
   - rationale: Why this choice over alternatives
   - outcome: What resulted
4. metrics: Key-value pairs of measurable outcomes (e.g. {"users_impacted": "700M+", "delivery_time": "8 weeks"})
5. reflections: What they learned or would do differently (1-2 sentences)
6. skills: Array of skill tags demonstrated (e.g. ["platform thinking", "incident response", "cross-functional alignment"])
7. title: A concise, compelling title for this case study
8. company: Company name if mentioned
9. role: Role/title if mentioned

Return a JSON object with exactly these keys. Be specific and concrete — avoid generic language.`;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { description } = body;

  if (!description || description.trim().length < 20) {
    return NextResponse.json(
      { error: "Provide a description of at least 20 characters" },
      { status: 400 }
    );
  }

  try {
    const { content, model } = await generate(
      SYSTEM_PROMPT,
      `Structure this into a case study:\n\n${description}`
    );

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "AI returned invalid JSON", raw: content },
        { status: 502 }
      );
    }

    return NextResponse.json({ ...parsed, generation_model: model });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI generation failed" },
      { status: 502 }
    );
  }
}
