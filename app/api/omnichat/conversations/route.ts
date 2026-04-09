import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { unipile } from '@/lib/unipile'

// ==================== CACHE SYSTEM ====================
interface CacheItem<T> {
  data: T
  expiresAt: number
  createdAt: number
}

class ConversationCache {
  private cache = new Map<string, CacheItem<any>>()
  private readonly DEFAULT_TTL = 2 * 60 * 1000 // 2 minutes default
  private readonly MAX_CACHE_SIZE = 1000
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000

  constructor() {
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL)
    }
  }

  private cleanup() {
    const now = Date.now()
    let cleaned = 0
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key)
        cleaned++
      }
    }
    if (cleaned > 0) {
      console.log(`[OmniChat Cache] Cleaned up ${cleaned} expired entries`)
    }
  }

  private enforceMaxSize() {
    if (this.cache.size <= this.MAX_CACHE_SIZE) return
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].createdAt - b[1].createdAt)
    const toRemove = entries.slice(0, entries.length - this.MAX_CACHE_SIZE)
    toRemove.forEach(([key]) => this.cache.delete(key))
  }

  get(key: string): any | null {
    const item = this.cache.get(key)
    if (!item) return null
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key)
      return null
    }
    return item.data
  }

  set(key: string, data: any, ttl: number = this.DEFAULT_TTL) {
    this.enforceMaxSize()
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now()
    })
  }

  invalidate(pattern?: string) {
    if (!pattern) {
      this.cache.clear()
      return
    }
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE
    }
  }
}

const globalCache = new ConversationCache()

export function invalidateOmniChatCache(pattern?: string) {
  globalCache.invalidate(pattern)
}

// ==================== HELPER FUNCTIONS ====================
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
    process.env.SUPABASE_SERVICE_API_KEY ||
    process.env.SUPBASE_SERVICE_API_KEY

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
  }

  if (!supabaseKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  }

  return createClient(supabaseUrl, supabaseKey)
}

function generateCacheKey(params: {
  limit: number
  offset: number
  advisorLeads?: string
  search?: string
  channel?: string
}): string {
  return `omnichat:paginated:${params.limit}:${params.offset}:${params.advisorLeads || 'all'}:${params.search || ''}:${params.channel || 'all'}`
}

function generateFullListCacheKey(advisorLeads?: string, search?: string, channel?: string): string {
  return `omnichat:full_list:${advisorLeads || 'all'}:${search || ''}:${channel || 'all'}`
}

export async function GET(request: Request) {
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(request.url)
    const searchQuery = searchParams.get('search') || ''
    const channelFilter = searchParams.get('channel') || 'all' // 'all', 'email', 'sms', 'whatsapp', 'linkedin'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const skipCache = searchParams.get('nocache') === 'true'

    // Get authenticated user to check role and Unipile account (for LinkedIn profile pictures)
    let assignedLeadIds: string[] | null = null
    let isAdvisor = false
    let userUnipileAccountId: string | null = null

    try {
      const serverSupabase = await createServerClient()
      const { data: { user }, error: userError } = await serverSupabase.auth.getUser()

      if (!userError && user) {
        const { data: userProfile, error: profileError } = await serverSupabase
          .from('users')
          .select('id, role, unipile_account_id')
          .eq('user_id', user.id)
          .single()

        if (!profileError && userProfile) {
          isAdvisor = userProfile.role === 'advisor'
          userUnipileAccountId = userProfile.unipile_account_id || null

          if (isAdvisor) {
            const { data: userLeads, error: userLeadsError } = await serverSupabase
              .from('users_leads')
              .select('lead_id')
              .eq('user_id', userProfile.id)

            if (!userLeadsError && userLeads) {
              assignedLeadIds = userLeads.map((ul) => ul.lead_id)
              console.log(`[OmniChat] Advisor has ${assignedLeadIds.length} assigned leads`)

              if (assignedLeadIds.length === 0) {
                return NextResponse.json({
                  conversations: [],
                  total: 0,
                  limit,
                  offset,
                  hasMore: false,
                  nextOffset: 0,
                  cached: false,
                  queryTime: Date.now() - startTime
                })
              }
            }
          }
        }
      }
    } catch (authError) {
      console.error('[OmniChat] Error getting user auth:', authError)
    }

    // Check cache
    const cacheKey = generateCacheKey({
      limit,
      offset,
      advisorLeads: assignedLeadIds ? assignedLeadIds.sort().join(',') : 'all',
      search: searchQuery,
      channel: channelFilter
    })
    
    if (!skipCache) {
      const cachedResponse = globalCache.get(cacheKey)
      if (cachedResponse) {
        console.log(`[OmniChat Cache] Hit for paginated key`)
        return NextResponse.json({
          ...cachedResponse,
          cached: true,
          queryTime: Date.now() - startTime
        })
      }
    }

    let supabase
    try {
      supabase = getSupabaseClient()
    } catch (supabaseError) {
      const errorMessage = supabaseError instanceof Error ? supabaseError.message : 'Failed to initialize database connection'
      console.error('Supabase initialization error:', errorMessage)
      return NextResponse.json({ error: 'Database configuration error', message: errorMessage }, { status: 500 })
    }

    const IN_CLAUSE_LIMIT = 100
    const emailMessagesByLead: Map<string, any> = new Map()
    const smsMessagesByLead: Map<string, any> = new Map()
    const linkedinMessagesByLead: Map<string, any> = new Map()

    const queryPromises: Promise<void>[] = []

    // ==================== EMAIL MESSAGES QUERY ====================
    const emailQueryPromise = (async () => {
      try {
        let allConversations: any[] = []
        
        if (isAdvisor && assignedLeadIds && assignedLeadIds.length > 0) {
          const batches: string[][] = []
          for (let i = 0; i < assignedLeadIds.length; i += IN_CLAUSE_LIMIT) {
            batches.push(assignedLeadIds.slice(i, i + IN_CLAUSE_LIMIT))
          }

          const convPromises = batches.map(batch =>
            supabase
              .from('email_conversation')
              .select('id, lead_id')
              .in('lead_id', batch)
          )

          const convResults = await Promise.all(convPromises)
          for (const result of convResults) {
            if (!result.error && result.data) {
              allConversations.push(...result.data)
            }
          }
        } else {
          const { data, error } = await supabase
            .from('email_conversation')
            .select('id, lead_id')

          if (!error && data) {
            allConversations = data
          }
        }

        if (allConversations.length === 0) return

        const allConversationIds = allConversations.map(c => c.id)
        const convToLeadMap = new Map<number, string>()
        const uniqueLeadIds = new Set<string>()
        
        for (const conv of allConversations) {
          convToLeadMap.set(conv.id, conv.lead_id)
          uniqueLeadIds.add(conv.lead_id)
        }

        // Fetch email messages in batches
        const convBatches: number[][] = []
        for (let i = 0; i < allConversationIds.length; i += IN_CLAUSE_LIMIT) {
          convBatches.push(allConversationIds.slice(i, i + IN_CLAUSE_LIMIT))
        }

        const msgPromises = convBatches.map(batch =>
          supabase
            .from('email_messages')
            .select('id, conversation_id, content, direction, last_update, created_at')
            .in('conversation_id', batch)
            .order('created_at', { ascending: false })
        )

        const msgResults = await Promise.all(msgPromises)
        let allEmailData: any[] = []
        
        for (const result of msgResults) {
          if (!result.error && result.data) {
            allEmailData.push(...result.data)
          }
        }

        // Fetch lead info
        const leadArray = Array.from(uniqueLeadIds)
        const leadBatches: string[][] = []
        for (let i = 0; i < leadArray.length; i += IN_CLAUSE_LIMIT) {
          leadBatches.push(leadArray.slice(i, i + IN_CLAUSE_LIMIT))
        }

        const leadInfoMap = new Map<string, any>()
        const leadPromises = leadBatches.map(batch =>
          supabase
            .from('leads')
            .select('id, contact_first_name, contact_last_name, contact_email')
            .in('id', batch)
        )

        const leadResults = await Promise.all(leadPromises)
        for (const result of leadResults) {
          if (!result.error && result.data) {
            for (const lead of result.data) {
              leadInfoMap.set(lead.id, lead)
            }
          }
        }

        // Process messages
        for (const msg of allEmailData) {
          const leadId = convToLeadMap.get(msg.conversation_id)
          if (!leadId) continue

          const lead = leadInfoMap.get(leadId)
          if (!lead) continue

          const emailDate = msg.last_update || msg.created_at
          if (!emailDate) continue

          const msgTimestamp = new Date(emailDate).getTime()
          if (isNaN(msgTimestamp)) continue

          const existing = emailMessagesByLead.get(leadId)
          if (!existing || msgTimestamp > existing.timestamp) {
            emailMessagesByLead.set(leadId, {
              msg: { ...msg, lead },
              timestamp: msgTimestamp,
              direction: msg.direction
            })
          }
        }
      } catch (error) {
        console.error('[OmniChat] Email query error:', error)
      }
    })()
    queryPromises.push(emailQueryPromise)

    // ==================== SMS/WHATSAPP MESSAGES QUERY ====================
    const smsQueryPromise = (async () => {
      try {
        let allSmsData: any[] = []
        
        if (isAdvisor && assignedLeadIds && assignedLeadIds.length > 0) {
          if (assignedLeadIds.length <= IN_CLAUSE_LIMIT) {
            const { data, error } = await supabase
              .from('leads_sms_whatsapp_conversations')
              .select(`
                id,
                lead_id,
                message_text,
                message_type,
                is_inbound,
                sent_at,
                created_at,
                leads!inner(id, contact_first_name, contact_last_name, contact_email)
              `)
              .in('lead_id', assignedLeadIds)
              .order('sent_at', { ascending: false })
            
            if (!error && data) allSmsData = data
          } else {
            const batches: string[][] = []
            for (let i = 0; i < assignedLeadIds.length; i += IN_CLAUSE_LIMIT) {
              batches.push(assignedLeadIds.slice(i, i + IN_CLAUSE_LIMIT))
            }
            
            const batchPromises = batches.map(batch => 
              supabase
                .from('leads_sms_whatsapp_conversations')
                .select(`
                  id,
                  lead_id,
                  message_text,
                  message_type,
                  is_inbound,
                  sent_at,
                  created_at,
                  leads!inner(id, contact_first_name, contact_last_name, contact_email)
                `)
                .in('lead_id', batch)
                .order('sent_at', { ascending: false })
            )
            
            const batchResults = await Promise.all(batchPromises)
            for (const result of batchResults) {
              if (!result.error && result.data) {
                allSmsData.push(...result.data)
              }
            }
          }
        } else {
          const { data, error } = await supabase
            .from('leads_sms_whatsapp_conversations')
            .select(`
              id,
              lead_id,
              message_text,
              message_type,
              is_inbound,
              sent_at,
              created_at,
              leads!inner(id, contact_first_name, contact_last_name, contact_email)
            `)
            .order('sent_at', { ascending: false })
          
          if (!error && data) allSmsData = data
        }

        for (const msg of allSmsData) {
          const leadId = msg.lead_id
          if (!leadId) continue

          const smsDate = msg.sent_at || msg.created_at
          if (!smsDate) continue

          const msgTimestamp = new Date(smsDate).getTime()
          if (isNaN(msgTimestamp)) continue

          const existing = smsMessagesByLead.get(leadId)
          if (!existing || msgTimestamp > existing.timestamp) {
            smsMessagesByLead.set(leadId, { msg, timestamp: msgTimestamp })
          }
        }
      } catch (error) {
        console.error('[OmniChat] SMS/WhatsApp query error:', error)
      }
    })()
    queryPromises.push(smsQueryPromise)

    // ==================== LINKEDIN MESSAGES QUERY ====================
    const linkedinQueryPromise = (async () => {
      try {
        let allLinkedinData: any[] = []
        
        if (isAdvisor && assignedLeadIds && assignedLeadIds.length > 0) {
          if (assignedLeadIds.length <= IN_CLAUSE_LIMIT) {
            const { data, error } = await supabase
              .from('linkedin_messages')
              .select('id, lead_id, message, message_id, is_inbound, created_at')
              .in('lead_id', assignedLeadIds)
              .order('created_at', { ascending: false })
            
            if (!error && data) allLinkedinData = data
          } else {
            const batches: string[][] = []
            for (let i = 0; i < assignedLeadIds.length; i += IN_CLAUSE_LIMIT) {
              batches.push(assignedLeadIds.slice(i, i + IN_CLAUSE_LIMIT))
            }
            
            const batchPromises = batches.map(batch => 
              supabase
                .from('linkedin_messages')
                .select('id, lead_id, message, message_id, is_inbound, created_at')
                .in('lead_id', batch)
                .order('created_at', { ascending: false })
            )
            
            const batchResults = await Promise.all(batchPromises)
            for (const result of batchResults) {
              if (!result.error && result.data) {
                allLinkedinData.push(...result.data)
              }
            }
          }
        } else {
          const { data, error } = await supabase
            .from('linkedin_messages')
            .select('id, lead_id, message, message_id, is_inbound, created_at')
            .order('created_at', { ascending: false })
          
          if (!error && data) allLinkedinData = data
        }

        // Get lead info for LinkedIn messages
        const linkedinLeadIds = [...new Set(allLinkedinData.map(m => m.lead_id))]
        if (linkedinLeadIds.length > 0) {
          const leadBatches: string[][] = []
          for (let i = 0; i < linkedinLeadIds.length; i += IN_CLAUSE_LIMIT) {
            leadBatches.push(linkedinLeadIds.slice(i, i + IN_CLAUSE_LIMIT))
          }

          const leadInfoMap = new Map<string, any>()
          const leadPromises = leadBatches.map(batch =>
            supabase
              .from('leads')
              .select('id, contact_first_name, contact_last_name, contact_email, linkedin_account_id')
              .in('id', batch)
          )

          const leadResults = await Promise.all(leadPromises)
          for (const result of leadResults) {
            if (!result.error && result.data) {
              for (const lead of result.data) {
                leadInfoMap.set(lead.id, lead)
              }
            }
          }

          for (const msg of allLinkedinData) {
            const leadId = msg.lead_id
            if (!leadId) continue

            const lead = leadInfoMap.get(leadId)
            if (!lead) continue

            const linkedinDate = msg.created_at
            if (!linkedinDate) continue

            const msgTimestamp = new Date(linkedinDate).getTime()
            if (isNaN(msgTimestamp)) continue

            const existing = linkedinMessagesByLead.get(leadId)
            if (!existing || msgTimestamp > existing.timestamp) {
              linkedinMessagesByLead.set(leadId, { 
                msg: { ...msg, lead }, 
                timestamp: msgTimestamp 
              })
            }
          }
        }
      } catch (error) {
        console.error('[OmniChat] LinkedIn query error:', error)
      }
    })()
    queryPromises.push(linkedinQueryPromise)

    // Wait for all queries to complete
    await Promise.all(queryPromises)

    console.log(`[OmniChat] Fetched ${emailMessagesByLead.size} email leads, ${smsMessagesByLead.size} SMS/WA leads, ${linkedinMessagesByLead.size} LinkedIn leads in ${Date.now() - startTime}ms`)

    // ==================== MERGE AND PROCESS RESULTS ====================
    const leadMessagesMap = new Map<string, {
      id: string
      lead_id: string
      lead_name: string
      lead_email: string
      last_message: string
      last_message_date: string
      channel: "email" | "sms" | "whatsapp" | "linkedin"
      conversation_id: string
      is_unanswered: boolean
      lead_linkedin_account_id?: string | null
    }>()

    const allLeadIds = new Set<string>()
    emailMessagesByLead.forEach((_, leadId) => allLeadIds.add(leadId))
    smsMessagesByLead.forEach((_, leadId) => allLeadIds.add(leadId))
    linkedinMessagesByLead.forEach((_, leadId) => allLeadIds.add(leadId))

    for (const leadId of allLeadIds) {
      const emailEntry = emailMessagesByLead.get(leadId)
      const smsEntry = smsMessagesByLead.get(leadId)
      const linkedinEntry = linkedinMessagesByLead.get(leadId)

      const emailTimestamp = emailEntry?.timestamp || 0
      const smsTimestamp = smsEntry?.timestamp || 0
      const linkedinTimestamp = linkedinEntry?.timestamp || 0

      let mostRecentMsg: any = null
      let mostRecentTimestamp = 0
      let mostRecentChannel: "email" | "sms" | "whatsapp" | "linkedin" = 'email'

      // Find most recent across all channels
      if (emailTimestamp >= smsTimestamp && emailTimestamp >= linkedinTimestamp && emailTimestamp > 0) {
        mostRecentMsg = emailEntry?.msg
        mostRecentTimestamp = emailTimestamp
        mostRecentChannel = 'email'
      } else if (smsTimestamp >= emailTimestamp && smsTimestamp >= linkedinTimestamp && smsTimestamp > 0) {
        mostRecentMsg = smsEntry?.msg
        mostRecentTimestamp = smsTimestamp
        mostRecentChannel = smsEntry?.msg.message_type?.toLowerCase() === 'whatsapp' ? 'whatsapp' : 'sms'
      } else if (linkedinTimestamp > 0) {
        mostRecentMsg = linkedinEntry?.msg
        mostRecentTimestamp = linkedinTimestamp
        mostRecentChannel = 'linkedin'
      }

      if (!mostRecentMsg) continue

      // Determine if unanswered (inbound message)
      let isUnanswered = false
      if (mostRecentChannel === 'email') {
        isUnanswered = (mostRecentMsg.direction || '').toLowerCase() === 'inbound'
      } else if (mostRecentChannel === 'linkedin') {
        isUnanswered = mostRecentMsg.is_inbound === true
      } else {
        isUnanswered = mostRecentMsg.is_inbound === true
      }

      // Extract lead info
      let lead: any = null
      let conversationId = ''
      let messageId = ''
      let lastMessageDate = ''
      let messagePreview = ''

      if (mostRecentChannel === 'email') {
        lead = mostRecentMsg.lead
        conversationId = String(mostRecentMsg.conversation_id)
        messageId = String(mostRecentMsg.id)
        lastMessageDate = mostRecentMsg.last_update || mostRecentMsg.created_at
        messagePreview = (mostRecentMsg.content || '').substring(0, 100)
      } else if (mostRecentChannel === 'linkedin') {
        lead = mostRecentMsg.lead
        conversationId = mostRecentMsg.id
        messageId = mostRecentMsg.message_id || mostRecentMsg.id
        lastMessageDate = mostRecentMsg.created_at
        messagePreview = (mostRecentMsg.message || '').substring(0, 100)
      } else {
        const leads = Array.isArray(mostRecentMsg.leads) ? mostRecentMsg.leads : [mostRecentMsg.leads]
        lead = leads[0]
        conversationId = mostRecentMsg.id
        messageId = mostRecentMsg.id
        lastMessageDate = mostRecentMsg.sent_at || mostRecentMsg.created_at
        messagePreview = (mostRecentMsg.message_text || '').substring(0, 100)
      }

      if (!lead) continue

      const firstName = lead.contact_first_name || lead.first_name || ''
      const lastName = lead.contact_last_name || lead.last_name || ''
      const leadName = `${firstName} ${lastName}`.trim() || 'Unknown Lead'

      leadMessagesMap.set(leadId, {
        id: messageId,
        lead_id: leadId,
        lead_name: leadName,
        lead_email: lead.contact_email || lead.email || '',
        last_message: messagePreview,
        last_message_date: lastMessageDate,
        channel: mostRecentChannel,
        conversation_id: conversationId,
        is_unanswered: isUnanswered,
        ...(mostRecentChannel === 'linkedin' && lead?.linkedin_account_id
          ? { lead_linkedin_account_id: lead.linkedin_account_id }
          : {})
      })
    }

    // Convert to array and sort
    let conversations = Array.from(leadMessagesMap.values())

    // Sort: unanswered first, then by most recent date
    conversations.sort((a, b) => {
      if (a.is_unanswered && !b.is_unanswered) return -1
      if (!a.is_unanswered && b.is_unanswered) return 1
      return new Date(b.last_message_date).getTime() - new Date(a.last_message_date).getTime()
    })

    // Cache the full processed list
    const fullListCacheKey = generateFullListCacheKey(
      assignedLeadIds ? assignedLeadIds.sort().join(',') : undefined
    )
    globalCache.set(fullListCacheKey, { conversations: [...conversations] }, 2 * 60 * 1000)

    // ==================== APPLY FILTERS ====================
    if (channelFilter && channelFilter !== 'all') {
      conversations = conversations.filter(conv => conv.channel === channelFilter)
    }

    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      conversations = conversations.filter(conv => {
        const nameMatch = conv.lead_name?.toLowerCase().includes(query)
        const emailMatch = conv.lead_email?.toLowerCase().includes(query)
        return nameMatch || emailMatch
      })
    }

    // Pagination
    const total = conversations.length
    let paginated = conversations.slice(offset, offset + limit)

    // Enrich LinkedIn conversations with profile picture URL (Unipile)
    if (userUnipileAccountId && paginated.some((c: any) => c.channel === 'linkedin' && c.lead_linkedin_account_id)) {
      const enriched = await Promise.all(
        paginated.map(async (conv: any) => {
          if (conv.channel !== 'linkedin' || !conv.lead_linkedin_account_id) {
            return { ...conv, lead_profile_picture_url: null }
          }
          try {
            const profile = await unipile.getUser(conv.lead_linkedin_account_id, userUnipileAccountId!)
            const url = (profile as any)?.profile_picture_url ?? (profile as any)?.profile_picture_url_large ?? null
            return { ...conv, lead_profile_picture_url: url }
          } catch {
            return { ...conv, lead_profile_picture_url: null }
          }
        })
      )
      paginated = enriched
    }

    const response = {
      conversations: paginated,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
      nextOffset: offset + limit,
      cached: false,
      queryTime: Date.now() - startTime,
      cacheStats: globalCache.getStats()
    }

    if (!skipCache) {
      globalCache.set(cacheKey, response, 30 * 1000)
    }

    console.log(`[OmniChat] Processed ${total} conversations in ${response.queryTime}ms (advisor: ${isAdvisor}, cached: false)`)

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error loading conversations:', error)
    return NextResponse.json(
      {
        error: 'Failed to load conversations',
        details: error instanceof Error ? error.message : 'Unknown error',
        queryTime: Date.now() - startTime
      },
      { status: 500 }
    )
  }
}

// POST endpoint for cache invalidation
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { pattern, all } = body

    if (all) {
      globalCache.invalidate()
      return NextResponse.json({
        success: true,
        message: 'All cache invalidated',
        stats: globalCache.getStats()
      })
    }

    if (pattern) {
      globalCache.invalidate(pattern)
      return NextResponse.json({
        success: true,
        message: `Cache invalidated for pattern: ${pattern}`,
        stats: globalCache.getStats()
      })
    }

    return NextResponse.json({
      success: false,
      message: 'Please provide either "pattern" or "all: true" in the request body'
    }, { status: 400 })
  } catch (error) {
    console.error('Error invalidating cache:', error)
    return NextResponse.json(
      { error: 'Failed to invalidate cache', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
