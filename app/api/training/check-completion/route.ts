import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MongoClient, ObjectId } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const MONGODB_DB = process.env.MONGODB_DB || 'advisor_training'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get user ID from query parameters
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }
    

    // Get user's peoplemanager_id from the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('peoplemanager_id, role, fullname')
      .eq('user_id', userId)
      .single()


    if (userError) {
      console.error('Error fetching user data:', userError)
      return NextResponse.json({ 
        error: 'Error fetching user data',
        details: userError.message,
        systemLookedUp: false 
      }, { status: 500 })
    }

    if (!userData) {
      return NextResponse.json({ 
        error: 'User not found in database',
        systemLookedUp: false 
      }, { status: 404 })
    }

    if (!userData.peoplemanager_id) {
      return NextResponse.json({ 
        error: 'No peoplemanager_id found for user',
        systemLookedUp: false 
      }, { status: 404 })
    }

    // Connect to MongoDB and check user's systemLookedUp status
    const client = new MongoClient(MONGODB_URI)
    await client.connect()
    
    const db = client.db(MONGODB_DB)
    const collection = db.collection('users')
    
    // Find user by peoplemanager_id
    const query = {
      _id: new ObjectId(userData.peoplemanager_id)
    }
    
    const user = await collection.findOne(query)

    await client.close()

    if (!user) {
      return NextResponse.json({ 
        systemLookedUp: false,
        message: 'User not found in PeopleManager system'
      })
    }

    // Check if user is system looked up (unlocked)
    const isSystemLookedUp = user.systemLookedUp === false
    
    return NextResponse.json({ 
      systemLookedUp: isSystemLookedUp,
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      },
      message: isSystemLookedUp ? 'User is unlocked and can make calls' : 'User is locked and cannot make calls'
    })

  } catch (error) {
    console.error('Error checking system lock status:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      systemLookedUp: false 
    }, { status: 500 })
  }
}
