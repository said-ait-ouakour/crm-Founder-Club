import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '500')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ leads: [], total: 0 })
    }

    const searchTerm = query.trim()

    // Build the search query with multiple conditions
    let supabaseQuery = supabase
      .from('leads')
      .select('id, first_name, last_name, email, phone_number', { count: 'exact' })
      .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .order('first_name')
      .range(offset, offset + limit - 1)

    const { data, error, count } = await supabaseQuery

    if (error) {
      console.error('Error searching leads:', error)
      return NextResponse.json(
        { error: 'Failed to search leads' },
        { status: 500 }
      )
    }

    // Type guard to ensure data matches expected format
    const typedData = (data || []).map((item) => ({
      id: String(item.id),
      first_name: String(item.first_name || ''),
      last_name: String(item.last_name || ''),
      email: String(item.email || ''),
      phone_number: item.phone_number ? String(item.phone_number) : undefined,
    }))

    return NextResponse.json({
      leads: typedData,
      total: count || 0,
      hasMore: (count || 0) > offset + limit
    })

  } catch (error) {
    console.error('Error in leads search API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
