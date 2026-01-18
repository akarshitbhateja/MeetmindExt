import dbConnect from '@/lib/db';
import Meeting from '@/models/Meeting';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    await dbConnect();
    
    // 1. Get Data
    const body = await req.json();
    console.log("📝 Received Data:", body); // Check your terminal for this!

    // 2. Validate essential fields manually to fail fast
    if (!body.userId) {
        return NextResponse.json({ success: false, error: "User ID is missing" }, { status: 400 });
    }
    if (!body.title) {
        return NextResponse.json({ success: false, error: "Title is missing" }, { status: 400 });
    }

    // 3. Create Meeting
    const meeting = await Meeting.create(body);
    console.log("✅ Meeting Created:", meeting._id);

    return NextResponse.json({ success: true, data: meeting });

  } catch (error) {
    console.error("❌ CREATE ERROR:", error);
    
    // This will return the EXACT error reason to your browser
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        details: error.errors // Mongoose validation details
      },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) return NextResponse.json({ success: false, error: "No User ID" }, { status: 400 });

    const meetings = await Meeting.find({ userId }).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: meetings });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const { id, ...updateData } = body;
    const meeting = await Meeting.findByIdAndUpdate(id, updateData, { new: true });
    return NextResponse.json({ success: true, data: meeting });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}