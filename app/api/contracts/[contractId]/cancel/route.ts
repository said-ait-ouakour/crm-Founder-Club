import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const SIGNNOW_API_BASE_URL = process.env.SIGNNOW_API_BASE_URL ?? "https://api.signnow.com"
const SIGNNOW_ACCESS_TOKEN = process.env.SIGNNOW_ACCESS_TOKEN
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

type Invite = { status?: string; invite_status?: string }
type SignNowDocument = {
  status?: string
  document_status?: string
  status_code?: string
  completed?: boolean
  is_completed?: boolean
  field_invites?: Invite[]
  data?: {
    status?: string
    field_invites?: Invite[]
  }
}

const getDocument = async (documentId: string): Promise<SignNowDocument> => {
  const response = await fetch(`${SIGNNOW_API_BASE_URL}/document/${documentId}`, {
    headers: { Authorization: `Bearer ${SIGNNOW_ACCESS_TOKEN}` },
    cache: "no-store",
  })
  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(text || response.statusText)
  }
  return response.json()
}

// 1) Explicit completion detector (be liberal with synonyms)
const isCompleted = (doc: SignNowDocument) => {
  if (doc.completed || doc.is_completed) return true
  const s = (
    doc.status ??
    doc.document_status ??
    doc.status_code ??
    doc.data?.status ??
    ""
  ).toLowerCase()

  // Common values seen in the wild
  return (
    s.includes("complete") ||
    s.includes("completed") ||
    s.includes("fulfilled") ||
    s.includes("final") ||
    s.includes("executed")
  )
}

// 2) Pending/cancellable invites detector (field-based flow)
const hasPendingInvite = (doc: SignNowDocument) => {
  const rawStatus = (
    doc.status ??
    doc.document_status ??
    doc.status_code ??
    doc.data?.status ??
    ""
  ).toLowerCase()

  // Fast path: statuses commonly used while invites are still live
  if (/(sent|pending|awaiting|in\s*progress|partially\s*completed)/.test(rawStatus)) {
    return true
  }

  const invites: Invite[] = doc.field_invites ?? doc.data?.field_invites ?? []
  if (!invites.length) return false

  // Treat only “sent/pending/awaiting” as cancellable
  return invites.some((i) => {
    const st = (i?.status || i?.invite_status || "").toLowerCase()
    return /(sent|pending|awaiting|in\s*progress)/.test(st)
  })
}

const createServiceClient = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase service credentials are not configured.")
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
}

const cancelInvite = async (documentId: string) => {
  const response = await fetch(`${SIGNNOW_API_BASE_URL}/document/${documentId}/fieldinvitecancel`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${SIGNNOW_ACCESS_TOKEN}`,
    },
    // No body for this endpoint
  })

  const text = await response.text().catch(() => "")

  if (!response.ok) {
    let parsed: any = undefined
    try {
      parsed = JSON.parse(text)
    } catch {
      /* noop */
    }

    const message =
      parsed?.errors?.[0]?.message ||
      parsed?.error ||
      "Failed to cancel contract invite."

    const code = parsed?.errors?.[0]?.code
    return {
      success: false,
      status: response.status,
      error: message,
      code,
      details: parsed ?? text,
    }
  }

  return { success: true as const }
}

export async function PUT(request: Request, { params }: { params: { contractId: string } }) {
  if (!SIGNNOW_ACCESS_TOKEN) {
    return NextResponse.json({ error: "SignNow access token is not configured." }, { status: 500 })
  }

  const contractId = params.contractId
  if (!contractId) {
    return NextResponse.json({ error: "Contract id is required." }, { status: 400 })
  }

  // Optional client payload, but we don't forward it to SignNow anymore
  await request.json().catch(() => null)

  const documentId = contractId.replace("Document:", "")

  try {
    const doc = await getDocument(documentId)

    // A) Completed? -> block with 409 and a clear message
    if (isCompleted(doc)) {
      return NextResponse.json(
        {
          error: "Document is already completed; invites cannot be canceled.",
          code: "COMPLETED",
        },
        { status: 409 },
      )
    }

    // B) Not completed but also no pending invites? -> block
    if (!hasPendingInvite(doc)) {
      return NextResponse.json(
        {
          error: "Document is not in a cancellable state. Only pending/sent invitations can be canceled.",
          code: "NOT_CANCELLABLE",
        },
        { status: 409 },
      )
    }

    // C) Try to cancel
    const cancelResult = await cancelInvite(documentId)

    if (!cancelResult.success) {
      const { status, error, code, details } = cancelResult
      return NextResponse.json(
        {
          error,
          code,
          details,
        },
        { status: status ?? 400 },
      )
    }

    try {
      const supabase = createServiceClient()
      const { error: updateError } = await supabase
        .from("contracts")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("contract_id", contractId)

      if (updateError) {
        console.error("[contract-cancel] supabase update error", updateError)
        return NextResponse.json(
          {
            success: true,
            updated: false,
            warning: "Contract invite cancelled, but failed to update local status.",
          },
          { status: 200 },
        )
      }
    } catch (error: any) {
      console.error("[contract-cancel] supabase client error", error)
      return NextResponse.json(
        {
          success: true,
          updated: false,
          warning: "Contract invite cancelled, but local status update was skipped.",
        },
        { status: 200 },
      )
    }

    return NextResponse.json({ success: true, updated: true })
  } catch (error: any) {
    console.error("[contract-cancel] error", error)
    return NextResponse.json(
      {
        error: "Failed to cancel contract invite.",
        details: error?.message ?? "Unknown error",
      },
      { status: 500 },
    )
  }
}
