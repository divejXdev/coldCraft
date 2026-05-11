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

  const extract = (label: string, nextLabel: string) => {
    const regex = new RegExp(`${label}:[\\s\\S]*?(?=${nextLabel}:|$)`);
    const match = raw.match(regex);
    return match ? match[0].replace(`${label}:`, "").trim() : "";
  };

    return NextResponse.json({
      atsKeywords: extract("ATS_KEYWORDS", "KEYWORDS_USED"),
      keywordsUsed: extract("KEYWORDS_USED", "SUBJECT_LINES"),
      subjectLines: extract("SUBJECT_LINES", "EMAIL"),
      email: extract("EMAIL", "LINKEDIN_NOTE"),
      linkedinNote: extract("LINKEDIN_NOTE", "COMPANY_TYPE"),
      companyType: extract("COMPANY_TYPE", "TONE_REASON"),
      toneReason: extract("TONE_REASON", "ZZZNONE"),
    });
  } catch (error) {
    console.error("Generate API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to generate email: ${errorMessage}` },
      { status: 500 }
    );
  }
}
