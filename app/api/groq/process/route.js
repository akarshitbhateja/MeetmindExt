import Groq from "groq-sdk";
import { NextResponse } from "next/server";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req) {
    try {
        const formData = await req.formData();
        const file = formData.get("file"); // Audio file
        const task = formData.get("task"); // 'transcribe' or 'summarize'
        const textContext = formData.get("text"); // For summarization

        if (task === 'transcribe' && file) {
            // 1. Whisper Transcription
            const transcription = await groq.audio.transcriptions.create({
                file: file,
                model: "whisper-large-v3",
                response_format: "json",
            });
            return NextResponse.json({ text: transcription.text });
        } 
        
        if (task === 'summarize' && textContext) {
            // 2. LLM Summarization
            const completion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "You are an expert meeting secretary. Extract key action items, decisions made, and a brief summary from the following meeting transcript. Return HTML formatted text."
                    },
                    {
                        role: "user",
                        content: textContext
                    }
                ],
                model: "mixtral-8x7b-32768",
            });
            return NextResponse.json({ summary: completion.choices[0].message.content });
        }

        return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    } catch (error) {
        console.error("Groq Error:", error);
        return NextResponse.json({ error: "Processing failed" }, { status: 500 });
    }
}