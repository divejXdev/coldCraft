import { NextRequest, NextResponse } from "next/server";
import { generateGeminiText } from "@/app/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { resume, jobDescription } = await req.json();

    if (!resume || !jobDescription) {
      return NextResponse.json(
        { error: "Resume and job description are required" },
        { status: 400 }
      );
    }

    const prompt = `
You are an ATS (Applicant Tracking System) expert.

Analyze how well this resume matches this job description.

Resume:
${resume}

Job Description:
${jobDescription}

Return in this EXACT format:

SCORE:
[number between 0 and 100]

MATCHED_KEYWORDS:
[comma separated list of keywords found in both resume and job description]

MISSING_KEYWORDS:
[comma separated list of important keywords in job description but missing from resume]

TOP_TIP:
[one specific, actionable sentence to improve the ATS score]
`;

  const raw = await generateGeminiText(
    prompt,
    "You are a precise ATS analyzer. Be accurate and specific."
  );

    const extract = (label: string, nextLabel: string) => {
      const regex = new RegExp(`${label}:[\\s\\S]*?(?=${nextLabel}:|$)`);
      const match = raw.match(regex);
      return match ? match[0].replace(`${label}:`, "").trim() : "";
    };

    const scoreRaw = extract("SCORE", "MATCHED_KEYWORDS");
    const score = parseInt(scoreRaw.replace(/\D/g, "")) || 0;

    return NextResponse.json({
      score,
      matchedKeywords: extract("MATCHED_KEYWORDS", "MISSING_KEYWORDS"),
      missingKeywords: extract("MISSING_KEYWORDS", "TOP_TIP"),
      topTip: extract("TOP_TIP", "ZZZNONE"),
    });
  } catch (error) {
    console.error("ATS API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to analyze ATS score: ${errorMessage}` },
      { status: 500 }
    );
  }
}
