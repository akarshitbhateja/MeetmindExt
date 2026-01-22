import Groq from "groq-sdk";
import { NextResponse } from "next/server";

// ⚠️ Forces the API to run dynamically (Fixes many Vercel issues)
export const dynamic = 'force-dynamic';

export async function POST(req) {
    try {
        // 1. Validate API Key
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            console.error("❌ CRITICAL: GROQ_API_KEY is missing in Vercel Environment Variables.");
            return NextResponse.json(
                { success: false, error: "Server Configuration Error: API Key missing." }, 
                { status: 500 }
            );
        }

        const groq = new Groq({ apiKey: apiKey });
        const formData = await req.formData();
        const task = formData.get("task");

        // 2. Task: Transcribe
        if (task === 'transcribe') {
            const file = formData.get("file");
            if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

            console.log(`📁 Processing File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

            // Vercel Limit Check (4MB safe limit)
            if (file.size > 4.5 * 1024 * 1024) {
                return NextResponse.json(
                    { error: "File too large. Vercel Free Tier limits uploads to 4.5MB. Please upload a shorter clip." }, 
                    { status: 413 }
                );
            }

            try {
                const transcription = await groq.audio.transcriptions.create({
                    file: file,
                    model: "whisper-large-v3",
                    response_format: "json",
                });
                return NextResponse.json({ success: true, text: transcription.text });
            } catch (groqErr) {
                console.error("Groq Transcribe Error:", groqErr);
                // Handle 403 specifically
                if (groqErr.status === 403) {
                    return NextResponse.json({ error: "Groq API Rejected: Invalid API Key or Account Limit." }, { status: 403 });
                }
                throw groqErr;
            }
        } 
        
        // 3. Task: Summarize
        if (task === 'summarize') {
            const textContext = formData.get("text");
            if (!textContext) return NextResponse.json({ error: "No text provided" }, { status: 400 });

            try {
                const completion = await groq.chat.completions.create({
                    messages: [
                        {
                            role: "system",
                            content: "You are an expert meeting secretary. Create a concise executive summary (HTML format) and list key action items from the transcript provided."
                        },
                        {
                            role: "user",
                            content: textContext
                        }
                    ],
                    model: "openai/gpt-oss-120b",
                });
                return NextResponse.json({ success: true, summary: completion.choices[0].message.content });
            } catch (groqErr) {
                console.error("Groq Summary Error:", groqErr);
                if (groqErr.status === 403) {
                    return NextResponse.json({ error: "Groq API Rejected: Invalid API Key or Account Limit." }, { status: 403 });
                }
                throw groqErr;
            }
        }

        return NextResponse.json({ error: "Invalid task" }, { status: 400 });

    } catch (error) {
        console.error("❌ General API Error:", error);
        return NextResponse.json({ 
            success: false, 
            error: error.message || "Internal Server Error" 
        }, { status: 500 });
    }
}