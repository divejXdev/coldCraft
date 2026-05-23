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

    console.log("ATS API raw response:", raw.substring(0, 500));

    const extract = (label: string, nextLabel: string) => {
      const regex = new RegExp(`${label}:[\\s\\S]*?(?=${nextLabel}:|$)`);
      const match = raw.match(regex);
      const result = match ? match[0].replace(`${label}:`, "").trim() : "";
      console.log(`Extract "${label}": ${result.substring(0, 100)}`);
      return result;
    };

    const scoreRaw = extract("SCORE", "MATCHED_KEYWORDS");
    const score = parseInt(scoreRaw.replace(/\D/g, "")) || 0;
    const matchedKeywords = extract("MATCHED_KEYWORDS", "MISSING_KEYWORDS");
    const missingKeywords = extract("MISSING_KEYWORDS", "TOP_TIP");
    const topTip = extract("TOP_TIP", "ZZZNONE");

    console.log("ATS parsed:", { score, matchedKeywords: matchedKeywords.substring(0, 50), missingKeywords: missingKeywords.substring(0, 50) });

    return NextResponse.json({
      score,
      matchedKeywords,
      missingKeywords,
      topTip,
    });
  } catch (error) {
    console.error("ATS API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    const missingKey = errorMessage.toLowerCase().includes("missing") && errorMessage.toLowerCase().includes("api key");
    if (missingKey) {
      return NextResponse.json(
        {
          error:
            "AI provider API key is missing in this environment. Set GEMINI_API_KEY (preferred) or OPENAI_API_KEY in Vercel.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: `Failed to analyze ATS score: ${errorMessage}` },
      { status: 500 }
    );
  }
}

