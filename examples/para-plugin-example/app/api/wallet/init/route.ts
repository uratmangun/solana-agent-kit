import { NextRequest, NextResponse } from "next/server";
import { activateWallet } from "@/utils/init_server";

export async function POST(req: NextRequest) {
  try {
    const { userShare, walletId,session } = await req.json();

    if (!userShare || !walletId || !session) {
      return NextResponse.json(
        { error: "userShare and walletId are required" },
        { status: 400 }
      );
    }

    await activateWallet(userShare, walletId,session);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 