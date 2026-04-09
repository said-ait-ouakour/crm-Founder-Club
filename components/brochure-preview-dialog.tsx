"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { FileText, Mail, User, Edit3 } from "lucide-react"
import type { Lead } from "@/lib/supabase"
import { useState } from "react"

interface BrochurePreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead: Lead
  advisorName: string
  onSend: (customContent?: string, subject?: string, brochureType?: string) => void
  isSending?: boolean
}

export function BrochurePreviewDialog({
  open,
  onOpenChange,
  lead,
  advisorName,
  onSend,
  isSending = false
}: BrochurePreviewDialogProps) {
  const leadFirstName = lead.contact_first_name || "Lead"
  
  const defaultBrochureContent = `Hi ${leadFirstName},

Thank you for your interest in PeopleManager.

Attached you'll find a short presentation that outlines how PeopleManager works and the results it delivers.

If you have any questions or would like a quick demo, please feel free to reply to this email or schedule a time that suits you.

Best regards,
${advisorName}`

  const [isEditing, setIsEditing] = useState(false)
  const [customContent, setCustomContent] = useState(defaultBrochureContent)
  const [hasChanges, setHasChanges] = useState(false)
  const [emailSubject, setEmailSubject] = useState(`Discover How PeopleManager Transforms Recruitment Operations`)
  const [selectedBrochure, setSelectedBrochure] = useState('brochure1')

  // Brochure templates
  const brochureTemplates = {
    brochure1: {
      name: "Cover Email (Intro & Brochure)",
      subject: "The system that makes your best people the standard",
      content: `Hi ${leadFirstName},

Great speaking with you earlier — thanks for taking the time.

As discussed, I've attached our PeopleManager Overview brochure. It shows how we help companies turn their best performer into the benchmark everyone consistently meets.

In brief, PeopleManager:
• Trains every team member to your top standard (no-skip, mastery-based)
• Tracks daily performance with instant feedback
• Frees managers from constant retraining and oversight

Most businesses see measurable results within 30 days.

Let me know if you'd like a short walkthrough — it's often the fastest way to see exactly how it fits your team.

Best regards,
${advisorName}`,
      url: "https://sales-trainer-files.s3.eu-north-1.amazonaws.com/PEOPLEMANAGER+(9).pdf"
    },
    brochure2: {
      name: "Follow-up (Clarity Method & Results)",
      subject: "Why teams using PeopleManager perform 25–40% better",
      content: `Hi ${leadFirstName},

I wanted to share a bit more detail.

Attached is our Clarity Method brochure — it explains how we build transparent, ethical communication into every client interaction and deliver measurable lifts in performance.

Typical results within 60 days:
• +25% conversion rates
• +30% customer satisfaction
• –40% management time spent retraining

Happy to walk you through how we tailor the Clarity System around your brand tone and standards.

Kind regards,
${advisorName}`,
      url: "https://sales-trainer-files.s3.eu-north-1.amazonaws.com/PEOPLEMANAGER+(8).pdf"
    },
    brochure3: {
      name: "Case Studies & Pricing",
      subject: "Verified results & pricing options for your review",
      content: `Hi ${leadFirstName},

Here are a few real-world examples of what PeopleManager delivers.

The attached Verified Results & Case Studies document shows how firms in financial and legal services cut training time by 70–86%, freed 90–95% of manager time, and achieved full productivity from Day 1.

You can also view current package and pricing details here:
👉 peoplemanager.co/prices

If you'd like to explore which option best fits your team size and goals, I'd be happy to arrange a short strategy call.

Best,
${advisorName}`,
      url: "https://sales-trainer-files.s3.eu-north-1.amazonaws.com/PeopleManager-Verified-Results-and-Case-Studies.pdf"
    }
  }

  const currentTemplate = brochureTemplates[selectedBrochure as keyof typeof brochureTemplates]

  const handleContentChange = (value: string) => {
    setCustomContent(value)
    setHasChanges(value !== currentTemplate.content)
  }

  const handleBrochureChange = (brochureType: string) => {
    setSelectedBrochure(brochureType)
    const template = brochureTemplates[brochureType as keyof typeof brochureTemplates]
    setEmailSubject(template.subject)
    setCustomContent(template.content)
    setHasChanges(false)
  }

  const handleSend = () => {
    onSend(hasChanges ? customContent : undefined, emailSubject, selectedBrochure)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Brochure Preview
          </DialogTitle>
          <DialogDescription>
            This is how the brochure email will look when sent to {leadFirstName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 overflow-y-auto flex-1 pr-2">
          {/* Brochure Selection */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Select Brochure Type</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(brochureTemplates).map(([key, template]) => (
                  <Button
                    key={key}
                    variant={selectedBrochure === key ? "default" : "outline"}
                    onClick={() => handleBrochureChange(key)}
                    className="justify-start h-auto py-3 text-left"
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-medium text-sm">{template.name}</span>
                      <span className="text-xs text-gray-500 mt-1">{template.subject}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Lead Information */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4" />
                Lead Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Name:</span>
                  <p className="font-medium text-xs">{lead.contact_first_name} {lead.contact_last_name}</p>
                </div>
                <div>
                  <span className="text-gray-500">Email:</span>
                  <p className="font-medium text-xs">{lead.contact_email || "Not provided"}</p>
                </div>
                <div>
                  <span className="text-gray-500">Business:</span>
                  <p className="font-medium text-xs">{lead.business_name || "Not provided"}</p>
                </div>
                <div>
                  <span className="text-gray-500">Phone:</span>
                  <p className="font-medium text-xs">{lead.business_telephone || lead.mobile_phone || "Not provided"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Preview */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="bg-gray-50 p-3 rounded-lg border">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center border-b pb-1">
                    <span className="text-gray-500">To:</span>
                    <span className="font-medium text-xs">{lead.contact_email || "No email provided"}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-1">
                    <span className="text-gray-500">From:</span>
                    <span className="font-medium text-xs">{advisorName}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-gray-500">Subject:</span>
                    <Input
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="text-xs h-8"
                      placeholder="Enter email subject..."
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Content */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Email Content</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="h-7 px-2"
                >
                  <Edit3 className="h-3 w-3 mr-1" />
                  {isEditing ? "Preview" : "Edit"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {isEditing ? (
                <Textarea
                  value={customContent}
                  onChange={(e) => handleContentChange(e.target.value)}
                  className="min-h-32 text-sm font-mono leading-relaxed resize-none"
                  placeholder="Enter your custom email content..."
                />
              ) : (
                <div className="bg-white p-3 rounded-lg border border-gray-200 max-h-48 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
                    {customContent}
                  </pre>
                </div>
              )}
              {hasChanges && (
                <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                  <Edit3 className="h-3 w-3" />
                  Content has been modified
                </div>
              )}
            </CardContent>
          </Card>

          {/* Brochure Attachment Preview */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {currentTemplate.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-red-100 p-2 rounded">
                    <FileText className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{currentTemplate.name}</p>
                    <p className="text-xs text-gray-500">PDF Document - This will be attached to the email</p>
                  </div>
                </div>
                
                {/* Embedded PDF Preview */}
                <div className="bg-white rounded border border-gray-200 overflow-hidden text-center">
                  <a
                    href={currentTemplate.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-black hover:underline text-sm font-medium text-center"
                  >
                    View {currentTemplate.name} brochure
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex gap-2 flex-shrink-0 border-t pt-4">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSend}
            disabled={isSending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSending ? "Sending..." : "Send Brochure"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
