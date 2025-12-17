import { NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../lib/auth/getUserFromRequest';

export async function GET() {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  return NextResponse.json({
    id: user.id,
    name: user.name,
    image: user.image,
    email: user.email,
    role: user.role,
    walletAddress: user.walletAddress,
  });
}
