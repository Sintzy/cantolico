import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Redirect to Ezoic's managed ads.txt service
  // This ensures automatic updates and maximum ad revenue
  return NextResponse.redirect(
    'https://srv.adstxtmanager.com/19390/cantolico.pt',
    301 // Permanent redirect
  );
}

// Handle all HTTP methods to ensure proper redirect
export async function HEAD(request: NextRequest) {
  return GET(request);
}

export async function POST(request: NextRequest) {
  return GET(request);
}