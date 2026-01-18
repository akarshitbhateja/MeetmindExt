import Groq from "groq-sdk";
import { NextResponse } from "next/server";

// Force dynamic to prevent caching issues on Vercel
export const dynamic = 'force-dynamic';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req) {
    try {
        console.log("🚀 Starting Groq Processing...");

        // 1. Check API Key
        if (!process.env.GROQ_API_KEY) {
            console.error("❌ CRITICAL: GROQ_API_KEY is missing in Environment Variables");
            throw new Error("Server Configuration Error: GROQ_API_KEY is missing.");
        }

        const formData = await req.formData();
        const task = formData.get("task");
        
        console.log(`📝 Task received: ${task}`);

        // --- TASK: TRANSCRIBE ---
        if (task === 'transcribe') {
            const file = formData.get("file");
            if (!file) throw new Error("No file uploaded");
            
            console.log(`📁 File received: ${file.name} (${file.size} bytes)`);

            // Check file size (Vercel Limit is ~4.5MB)
            if (file.size > 4 * 1024 * 1024) {
                throw new Error("File is too large for Vercel Free Tier (Max 4MB). Please try a shorter clip.");
            }

            const transcription = await groq.audio.transcriptions.create({
                file: file,
                model: "whisper-large-v3",
                response_format: "json",
            });
            
            console.log("✅ Transcription Complete");
            return NextResponse.json({ text: transcription.text });
        } 
        
        // --- TASK: SUMMARIZE ---
        if (task === 'summarize') {
            const textContext = formData.get("text");
            if (!textContext) throw new Error("No text provided for summarization");

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
            
            console.log("✅ Summary Complete");
            return NextResponse.json({ summary: completion.choices[0].message.content });
        }

        return NextResponse.json({ error: "Invalid task specified" }, { status: 400 });

    } catch (error) {
        console.error("❌ Groq API Error:", error);
        // Return the ACTUAL error message to the frontend for debugging
        return NextResponse.json({ 
            success: false, 
            error: error.message || "Internal Server Error",
            details: error.toString() 
        }, { status: 500 });
    }
}