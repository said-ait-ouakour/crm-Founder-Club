import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    const { data: candidate, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching candidate:', error);
      return NextResponse.json({ error: 'Failed to fetch candidate' }, { status: 500 });
    }

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    return NextResponse.json({ data: candidate });
  } catch (error) {
    console.error('Error in GET /api/candidates/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();
    
    const { data: candidate, error } = await supabase
      .from('candidates')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating candidate:', error);
      return NextResponse.json({ error: 'Failed to update candidate' }, { status: 500 });
    }

    return NextResponse.json({ data: candidate });
  } catch (error) {
    console.error('Error in PUT /api/candidates/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
