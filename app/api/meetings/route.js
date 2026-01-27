import dbConnect from '@/lib/db';
import Meeting from '@/models/Meeting';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Helper to add CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allows extension to fetch
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    
    if (!body.userId || !body.title) {
        return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400, headers: corsHeaders });
    }

    const meeting = await Meeting.create(body);
    return NextResponse.json({ success: true, data: meeting }, { headers: corsHeaders });

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
  }
}

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) return NextResponse.json({ success: false, error: "No User ID" }, { status: 400, headers: corsHeaders });

    const meetings = await Meeting.find({ userId }).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: meetings }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
  }
}

export async function PUT(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const { id, ...updateData } = body;
    const meeting = await Meeting.findByIdAndUpdate(id, updateData, { new: true });
    return NextResponse.json({ success: true, data: meeting }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
  }
}