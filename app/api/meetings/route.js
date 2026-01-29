import dbConnect from '@/lib/db';
import Meeting from '@/models/Meeting';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    await dbConnect();
    const data = await req.json();
    const meeting = await Meeting.create(data);
    return NextResponse.json({ success: true, data: meeting });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const meetingId = searchParams.get('id');

    if (meetingId) {
        const meeting = await Meeting.findById(meetingId);
        return NextResponse.json({ success: true, data: meeting });
    }

    const meetings = await Meeting.find({ userId }).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: meetings });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    await dbConnect();
    const data = await req.json();
    const { id, ...updateData } = data;
    const meeting = await Meeting.findByIdAndUpdate(id, updateData, { new: true });
    return NextResponse.json({ success: true, data: meeting });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ✅ NEW: DELETE METHOD
export async function DELETE(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, error: "ID required" }, { status: 400 });

    await Meeting.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}