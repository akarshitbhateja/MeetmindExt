import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const client = await clientPromise;
  const db = client.db("meetmind");

  await db.collection("meetings").insertOne({
    ...body,
    createdAt: new Date(),
  });

  return NextResponse.json({ success: true });
}
