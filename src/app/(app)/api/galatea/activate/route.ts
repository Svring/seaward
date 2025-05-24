import { NextRequest, NextResponse } from 'next/server';
import { activateGalateaForSSHDevice } from '@/providers/galatea-provider/galatea-provider';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sshConfig, remotePath } = body;

    if (!sshConfig) {
      return NextResponse.json({ success: false, error: 'Missing sshConfig' }, { status: 400 });
    }

    await activateGalateaForSSHDevice(sshConfig, remotePath);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error in /api/galatea/activate:", err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to activate Galatea.' }, { status: 500 });
  }
}
