import { fetchMessageById } from '@/lib/sendgrid'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params
  if (!id) {
    return new Response(JSON.stringify({ error: 'Bad Request' }), { status: 400 })
  }
  const message = await fetchMessageById(id)
  return Response.json(message)
}