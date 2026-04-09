import { NextResponse } from "next/server"

const SIGNNOW_API_BASE_URL = process.env.SIGNNOW_API_BASE_URL ?? "https://api.signnow.com"
const SIGNNOW_ACCESS_TOKEN = process.env.SIGNNOW_ACCESS_TOKEN

export async function GET(
  request: Request,
  { params }: { params: { contractId: string } },
) {
  try {
    if (!SIGNNOW_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: "SignNow access token is not configured." },
        { status: 500 },
      )
    }

    const contractId = params.contractId
    if (!contractId) {
      return NextResponse.json({ error: "Contract id is required." }, { status: 400 })
    }

    const documentId = contractId.replace("Document:", "")

    const response = await fetch(`${SIGNNOW_API_BASE_URL}/document/${documentId}/download`, {
      method: "GET",
      headers: {
        Accept: "application/pdf",
        Authorization: `Bearer ${SIGNNOW_ACCESS_TOKEN}`,
      },
    })

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      console.error("[contract-download] Failed with status", response.status, text)
      return NextResponse.json(
        { error: "Failed to download contract.", details: text || response.statusText },
        { status: response.status },
      )
    }

    const blob = await response.arrayBuffer()

    return new NextResponse(blob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="contract-${documentId}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error("[contract-download] error", error)
    return NextResponse.json(
      {
        error: "Failed to download contract.",
        details: error?.message ?? "Unknown error",
      },
      { status: 500 },
    )
  }
}


