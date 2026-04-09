import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// In-memory storage for WebSocket connections
// In production, you might want to use Redis or another persistent store
const clients = new Map<string, any>()

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    status: 'WebSocket endpoint ready',
    connectedClients: clients.size,
    message: 'Use WebSocket client to connect'
  })
}

// Simulate WebSocket connection for testing
export async function POST(request: NextRequest) {
  try {
    const { userId, leadId, action } = await request.json()
    
    if (action === 'connect') {
      const clientId = `${userId}-${leadId || 'global'}`
      clients.set(clientId, { 
        userId, 
        leadId, 
        connectedAt: new Date().toISOString(),
        lastSeen: new Date().toISOString()
      })
      
      console.log(`WebSocket client registered: ${clientId}`)
      return NextResponse.json({ 
        success: true, 
        clientId,
        message: 'Client registered successfully' 
      })
    }
    
    if (action === 'disconnect') {
      const clientId = `${userId}-${leadId || 'global'}`
      clients.delete(clientId)
      console.log(`WebSocket client disconnected: ${clientId}`)
      return NextResponse.json({ 
        success: true, 
        message: 'Client disconnected successfully' 
      })
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    
  } catch (error) {
    console.error('WebSocket API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Function to broadcast notification to specific lead viewers
export function broadcastToLead(leadId: string, notification: any) {
  const message = JSON.stringify(notification)
  let sentCount = 0
  
  for (const [clientId, ws] of clients.entries()) {
    if (clientId.includes(`-${leadId}`) && ws.readyState === 1) {
      try {
        ws.send(message)
        sentCount++
      } catch (error) {
        console.error(`Error sending to client ${clientId}:`, error)
        clients.delete(clientId)
      }
    }
  }
  
  console.log(`Broadcasted notification to ${sentCount} clients for lead ${leadId}`)
  return sentCount
}

// Function to broadcast notification to specific user
export function broadcastToUser(userId: string, notification: any) {
  const message = JSON.stringify(notification)
  let sentCount = 0
  
  for (const [clientId, ws] of clients.entries()) {
    if (clientId.startsWith(`${userId}-`) && ws.readyState === 1) {
      try {
        ws.send(message)
        sentCount++
      } catch (error) {
        console.error(`Error sending to client ${clientId}:`, error)
        clients.delete(clientId)
      }
    }
  }
  
  console.log(`Broadcasted notification to ${sentCount} clients for user ${userId}`)
  return sentCount
}
