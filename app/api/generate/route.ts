import { NextRequest, NextResponse } from "next/server";
import { generateGeminiText } from "@/app/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { resume, jobDescription, tone, length } = await req.json();


    if (!resume || !jobDescription) {
      return NextResponse.json(
        { error: "Resume and job description are required" },
        { status: 400 }
      );
    }

    const toneGuide: Record<string, string> = {
    professional: "formal, respectful, and polished — like a senior professional",
    casual: "friendly, warm, and conversational — like reaching out to someone you almost know",
    bold: "confident, direct, and assertive — you know your worth and you're not afraid to show it",
    followup: "polite but persistent — this is a follow-up to an email sent exactly 1 week ago with no reply",
  };

  const lengthGuide: Record<string, string> = {
    short: "3-4 lines maximum — brutally short and punchy",
    medium: "2 short paragraphs — hook, value, CTA",
    detailed: "3 paragraphs — context, specific value you bring, and a clear call to action",
  };

  const prompt = `
You are an expert at writing cold emails that actually get responses from busy hiring managers.

You have TWO jobs here:
1. Extract the most important ATS keywords from the job description
2. Write a cold email that naturally uses those exact keywords — so the candidate mirrors the company's own language

This makes the email feel tailored AND keyword-optimized at the same time.

Candidate Resume:
${resume}

Job Description:
${jobDescription}

Tone: ${toneGuide[tone]}
Length: ${lengthGuide[length]}

Rules:
- Extract 6-10 ATS keywords from the job description first
- Weave AT LEAST 4 of those keywords naturally into the email body
- Never start with "I hope this email finds you well"
- Be specific to the resume and job — never generic
- End with a clear, low-friction CTA
- LinkedIn note must be under 300 characters

Return in this EXACT format:

ATS_KEYWORDS:
[comma separated list of keywords extracted from job description]

KEYWORDS_USED:
[comma separated list of keywords you actually used in the email]

SUBJECT_LINES:
1. [subject line 1]
2. [subject line 2]
3. [subject line 3]

EMAIL:
[the cold email body only]

LINKEDIN_NOTE:
[300 character max LinkedIn connection request]

COMPANY_TYPE:
[one of: Startup, Big Tech, Agency, Mid-size, Unknown]

TONE_REASON:
[one sentence explaining why this tone fits this company]
EOF`;

  const raw = await generateGeminiText(
    prompt,
    "You write cold emails that are human, specific, keyword-optimized, and get replies. Every email mirrors the company's own language naturally."
  );

  console.log("Generate API raw response:", raw.substring(0, 500));

  const extract = (label: string, nextLabel: string) => {
    const regex = new RegExp(`${label}:[\\s\\S]*?(?=${nextLabel}:|$)`);
    const match = raw.match(regex);
    const result = match ? match[0].replace(`${label}:`, "").trim() : "";
    console.log(`Extract "${label}": ${result.substring(0, 100)}`);
    return result;
  };

    const atsKeywords = extract("ATS_KEYWORDS", "KEYWORDS_USED");
    const keywordsUsed = extract("KEYWORDS_USED", "SUBJECT_LINES");
    const subjectLines = extract("SUBJECT_LINES", "EMAIL");
    const email = extract("EMAIL", "LINKEDIN_NOTE");
    const linkedinNote = extract("LINKEDIN_NOTE", "COMPANY_TYPE");
    const companyType = extract("COMPANY_TYPE", "TONE_REASON");
    const toneReason = extract("TONE_REASON", "ZZZNONE");

    if (!email || !linkedinNote) {
      console.error("Missing critical fields in response. Raw:", raw);
      throw new Error("AI response missing email or LinkedIn note. Check API response format.");
    }

    return NextResponse.json({
      atsKeywords,
      keywordsUsed,
      subjectLines,
      email,
      linkedinNote,
      companyType,
      toneReason,
    });
  } catch (error) {
    console.error("Generate API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Handle missing env keys explicitly so the client doesn't fail mysteriously.
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
      { error: `Failed to generate email: ${errorMessage}` },
      { status: 500 }
    );
  }
}

