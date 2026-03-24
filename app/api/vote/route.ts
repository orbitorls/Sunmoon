import { NextRequest, NextResponse } from 'next/server';

// In-memory vote storage (for demo purposes)
// In production, use a database
const votes: Record<string, number> = {};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, verified } = body;

    // Validate input
    if (!projectId) {
      return NextResponse.json(
        { success: false, message: 'กรุณาเลือกผลงาน' },
        { status: 400 }
      );
    }

    if (!verified) {
      return NextResponse.json(
        { success: false, message: 'กรุณายืนยันว่าคุณไม่ใช่บอท' },
        { status: 400 }
      );
    }

    // Record the vote
    votes[projectId] = (votes[projectId] || 0) + 1;

    console.log(`[Vote] Project: ${projectId}, Total votes: ${votes[projectId]}`);
    console.log('[Vote] All votes:', votes);

    return NextResponse.json({
      success: true,
      message: 'โหวตสำเร็จ!',
      projectId,
      totalVotes: votes[projectId],
    });
  } catch (error) {
    console.error('[Vote Error]', error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return current vote counts
  return NextResponse.json({
    success: true,
    votes,
  });
}
