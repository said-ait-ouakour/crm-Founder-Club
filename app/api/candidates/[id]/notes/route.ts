import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();
    const { note } = body;

    if (!note || note.trim() === '') {
      return NextResponse.json({ error: 'Note is required' }, { status: 400 });
    }

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get user's full name from users table
    let authorName = 'Unknown User';
    let authorId = user.id;
    
    const { data: userRecord, error: userRecordError } = await supabase
      .from('users')
      .select('fullname, id')
      .eq('user_id', user.id)
      .single();

    if (!userRecordError && userRecord) {
      const name = (userRecord.fullname || '').trim();
      if (name && name.length > 0) {
        authorName = name;
      }
    }

    // Get current candidate to fetch existing notes
    const { data: candidate, error: fetchError } = await supabase
      .from('candidates')
      .select('notes')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching candidate:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch candidate' }, { status: 500 });
    }

    // Parse existing notes or create new structure
    let existingNotes: Record<string, any> = {};
    if (candidate.notes) {
      try {
        const parsed = JSON.parse(candidate.notes);
        // Handle both legacy format (string values) and new format (object values)
        existingNotes = Object.entries(parsed).reduce((acc, [datetime, value]) => {
          if (typeof value === 'string') {
            // Legacy format: convert to new format
            acc[datetime] = {
              note: value,
              author_id: null,
              author_name: 'Unknown'
            };
          } else {
            // New format: keep as is
            acc[datetime] = value;
          }
          return acc;
        }, {} as Record<string, any>);
      } catch {
        // If parsing fails, treat as legacy format
        const fallbackDate = new Date().toISOString();
        existingNotes = {
          [fallbackDate]: {
            note: candidate.notes,
            author_id: null,
            author_name: 'Unknown'
          }
        };
      }
    }

    // Add new note with current timestamp and author info
    const newTimestamp = new Date().toISOString();
    const updatedNotes = {
      ...existingNotes,
      [newTimestamp]: {
        note: note.trim(),
        author_id: authorId,
        author_name: authorName
      }
    };

    // Update candidate with new notes
    const { data: updatedCandidate, error: updateError } = await supabase
      .from('candidates')
      .update({ notes: JSON.stringify(updatedNotes) })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating candidate notes:', updateError);
      return NextResponse.json({ error: 'Failed to update candidate notes' }, { status: 500 });
    }

    return NextResponse.json({ 
      data: updatedCandidate,
      message: 'Note added successfully' 
    });
  } catch (error) {
    console.error('Error in POST /api/candidates/[id]/notes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
