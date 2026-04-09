import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
})

export async function uploadToS3(
  file: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  const params = {
    Bucket: "crm-files1",
    Key: `withdrawals/${Date.now()}-${fileName}`,
    Body: file,
    ContentType: contentType,
  }

  const command = new PutObjectCommand(params)
  await s3Client.send(command)

  // Return the public URL
  return `https://${params.Bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${params.Key}`
}
