"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { Plus, Eye, Download, ExternalLink, Check, X } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import jsPDF from "jspdf"
import { LeadSearch } from "@/components/lead-search"
import { useAuth, useIsRecruiter } from "@/contexts/auth-context"

const WEBHOOK_URL = process.env.NEXT_PUBLIC_WEBHOOK_WITHDRAWAL_URL 
const DECISION_WEBHOOK_URL = process.env.NEXT_PUBLIC_WEBHOOK_WITHDRAWAL_DECISION_URL 

interface WithdrawalFormData {
  id?: string
  leadId: string
  leadName: string
  clientName: string
  date: string
  withdrawalDetails: string
  reasonForWithdrawal: string
  isDissatisfied: boolean
  dissatisfactionReason: string
  investmentBondWithdrawal: boolean
  cgtCalculationRequested: boolean
  isTaxEfficient: boolean
  plansLeftInPlace: string
  notWithdrawingFromISA: boolean
  oeicStillInPlace: boolean
  verifiedEmailInstruction: boolean
  adviserName: string
  adviserSignature: string
  submissionDate: string
  pdfUrl?: string
  createdAt: string
  withdrawal_approval?: 'approved' | 'rejected' | null
}

interface Lead {
  id: string
  first_name: string
  last_name: string
  email: string
}

export default function WithdrawalPage() {
  const { profile } = useAuth()
  const isRecruiter = useIsRecruiter();
  
  // Check if user has access to withdrawal page (recruiters cannot access)
  if (isRecruiter) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to access the withdrawal page.
          </p>
          <p className="text-sm text-gray-500">
            Recruiters can only access the recruitment page.
          </p>
        </div>
      </div>
    );
  }
  const [withdrawals, setWithdrawals] = useState<WithdrawalFormData[]>([])
  const [withdrawalLeads, setWithdrawalLeads] = useState<Array<{
    id: string
    first_name: string
    last_name: string
    email: string
    withdrawal_link: string
    withdrawal_approval?: 'approved' | 'rejected' | null
  }>>([])
  const [showForm, setShowForm] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingDecision, setPendingDecision] = useState<{leadId: string, decision: 'approved' | 'rejected'} | null>(null)
  
  // Get advisor name from auth context
  const advisorName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : ''
  
  const [formData, setFormData] = useState<WithdrawalFormData>({
    leadId: "",
    leadName: "",
    clientName: "",
    date: new Date().toISOString().split("T")[0],
    withdrawalDetails: "",
    reasonForWithdrawal: "",
    isDissatisfied: false,
    dissatisfactionReason: "",
    investmentBondWithdrawal: false,
    cgtCalculationRequested: false,
    isTaxEfficient: false,
    plansLeftInPlace: "",
    notWithdrawingFromISA: false,
    oeicStillInPlace: false,
    verifiedEmailInstruction: false,
    adviserName: advisorName,
    adviserSignature: advisorName,
    submissionDate: new Date().toISOString().split("T")[0],
    createdAt: new Date().toISOString(),
  })

  // Fetch withdrawals and leads with withdrawal forms
  useEffect(() => {
    // fetchWithdrawals()
    fetchWithdrawalLeads()
  }, [])

  // Update advisor name when profile changes
  useEffect(() => {
    if (profile && advisorName) {
      setFormData(prev => ({
        ...prev,
        adviserName: advisorName,
        adviserSignature: advisorName
      }))
    }
  }, [profile, advisorName])

  const fetchWithdrawalLeads = async () => {
    try {
      console.log('Supabase client:', supabase);
      
      // First, test the connection
      const { data: testData, error: testError } = await supabase
        .from('leads')
        .select('count', { count: 'exact', head: true });
      
      if (testError) {
        console.error('Supabase connection error:', testError);
        toast.error('Database connection error');
        return;
      }
      
      console.log('Test query successful, total leads in table:', testData);
      
      // Now fetch the actual data
      console.log('Fetching withdrawal leads...');
      const { data, error, count } = await supabase
        .from('leads')
        .select('id, first_name, last_name, email, withdrawal_link, withdrawal_approval', { count: 'exact' })
        .not('withdrawal_link', 'is', null)
        .order('created_on', { ascending: false });
  
      if (error) throw error;
      
      console.log('Raw data from database:', data);
      console.log('Number of leads with withdrawal links:', count);
      
      if (!data || data.length === 0) {
        console.log('No leads found with withdrawal links');
        // Let's try a different query to see if we get any data at all
        const { data: allLeads } = await supabase
          .from('leads')
          .select('id, first_name, withdrawal_link')
          .limit(5);
        console.log('Sample of leads (first 5):', allLeads);
      }
      
      const typedData = (data || []).map(lead => ({
        id: String(lead.id),
        first_name: String(lead.first_name || ''),
        last_name: String(lead.last_name || ''),
        email: String(lead.email || ''),
        withdrawal_link: String(lead.withdrawal_link || ''),
        withdrawal_approval: lead.withdrawal_approval as 'approved' | 'rejected' | null
      }));
      
      console.log('Processed withdrawal leads:', typedData);
      setWithdrawalLeads(typedData);
    } catch (error) {
      console.error('Error in fetchWithdrawalLeads:', error);
      toast.error('Failed to load withdrawal forms: ' + (error as Error).message);
    }
  };


  const fetchWithdrawals = async () => {
    try {
      const { data, error } = await supabase
        .from("withdrawal_forms")
        .select("*")
        .order("created_on", { ascending: false })

      if (error) throw error

      // Type guard to ensure data matches WithdrawalFormData interface
      const typedData =
        data?.map((item) => ({
          id: item.id ? String(item.id) : undefined,
          leadId: String(item.lead_id || ""),
          leadName: String(item.lead_name || ""),
          clientName: String(item.client_name || ""),
          date: String(item.date || ""),
          withdrawalDetails: String(item.withdrawal_details || ""),
          reasonForWithdrawal: String(item.reason_for_withdrawal || ""),
          isDissatisfied: Boolean(item.is_dissatisfied),
          dissatisfactionReason: String(item.dissatisfaction_reason || ""),
          investmentBondWithdrawal: Boolean(item.investment_bond_withdrawal),
          cgtCalculationRequested: Boolean(item.cgt_calculation_requested),
          isTaxEfficient: Boolean(item.is_tax_efficient),
          plansLeftInPlace: String(item.plans_left_in_place || ""),
          notWithdrawingFromISA: Boolean(item.not_withdrawing_from_isa),
          oeicStillInPlace: Boolean(item.oeic_still_in_place),
          verifiedEmailInstruction: Boolean(item.verified_email_instruction),
          adviserName: String(item.adviser_name || ""),
          adviserSignature: String(item.adviser_signature || ""),
          submissionDate: String(item.submission_date || ""),
          pdfUrl: item.pdf_url ? String(item.pdf_url) : undefined,
          createdAt: String(item.created_on || new Date().toISOString()),
        })) || []

      setWithdrawals(typedData)
    } catch (error) {
      console.error("Error fetching withdrawals:", error)
      toast.error("Failed to fetch withdrawals")
    }
  }

  const handleInputChange = (field: keyof WithdrawalFormData, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleCreateNew = () => {
    setShowForm(true)
    setSelectedLead(null)
    setFormData({
      leadId: "",
      leadName: "",
      clientName: "",
      date: new Date().toISOString().split("T")[0],
      withdrawalDetails: "",
      reasonForWithdrawal: "",
      isDissatisfied: false,
      dissatisfactionReason: "",
      investmentBondWithdrawal: false,
      cgtCalculationRequested: false,
      isTaxEfficient: false,
      plansLeftInPlace: "",
      notWithdrawingFromISA: false,
      oeicStillInPlace: false,
      verifiedEmailInstruction: false,
      adviserName: advisorName,
      adviserSignature: advisorName,
      submissionDate: new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString(),
    })
  }

  const handleLeadSelect = (lead: Lead) => {
    setSelectedLead(lead)
    setFormData((prev) => ({
      ...prev,
      leadId: lead.id,
      leadName: `${lead.first_name} ${lead.last_name}`,
      clientName: `${lead.first_name} ${lead.last_name}`,
    }))
  }

  const generatePDF = (data: WithdrawalFormData): Blob => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    })

    const margin = 20
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    let yPos = margin

    const blackText: [number, number, number] = [0, 0, 0]
    const orangeAccent: [number, number, number] = [249, 115, 22]
    const grayText: [number, number, number] = [75, 85, 99]

    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...orangeAccent)
    doc.text("WITHDRAWAL REQUEST FORM", pageWidth / 2, yPos, { align: "center" })
    yPos += 15

    doc.setLineWidth(0.5)
    doc.setDrawColor(...orangeAccent)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 15

    doc.setFontSize(9)
    doc.setTextColor(...grayText)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - margin, yPos, { align: "right" })
    yPos += 15

    const addTableField = (label: string, value: string) => {
      // Check if we need a new page
      if (yPos > pageHeight - 40) {
        doc.addPage()
        yPos = margin
      }

      const tableWidth = pageWidth - 2 * margin
      const labelWidth = tableWidth * 0.4 // 40% for labels
      const valueWidth = tableWidth * 0.6 // 60% for values
      const baseRowHeight = 10
      const lineHeight = 4
      const cellPadding = 3

      // Calculate how many lines the value will need
      doc.setFontSize(10)
      doc.setFont("Arial", "normal")
      const valueLines = doc.splitTextToSize(value, valueWidth - cellPadding * 2)
      const numberOfLines = Math.max(1, valueLines.length)
      const actualRowHeight = Math.max(baseRowHeight, numberOfLines * lineHeight + cellPadding * 2)

      // Draw table borders
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.3)

      // Left column (label) - full height
      doc.rect(margin, yPos - cellPadding, labelWidth, actualRowHeight)
      // Right column (value) - full height
      doc.rect(margin + labelWidth, yPos - cellPadding, valueWidth, actualRowHeight)

      // Label text (bold, left column, vertically centered)
      doc.setFontSize(10)
      doc.setFont("Arial", "bold")
      doc.setTextColor(...blackText)
      const labelY = yPos + (actualRowHeight - baseRowHeight) / 2
      doc.text(label, margin + cellPadding, labelY, { maxWidth: labelWidth - cellPadding * 2 })

      // Value text (normal, right column, properly wrapped)
      doc.setFont("Arial", "normal")
      doc.setTextColor(...blackText)

      // Add each line of the value text
      for (let i = 0; i < valueLines.length; i++) {
        const lineY = yPos + i * lineHeight
        doc.text(valueLines[i], margin + labelWidth + cellPadding, lineY)
      }

      yPos += actualRowHeight + 1 // Small gap between rows
    }

    const addSectionHeader = (title: string) => {
      if (yPos > pageHeight - 40) {
        doc.addPage()
        yPos = margin
      }

      yPos += 8
      doc.setFontSize(13)
      doc.setFont("Arial", "bold")
      doc.setTextColor(...orangeAccent)
      doc.text(title, margin, yPos)
      yPos += 12
    }

    addSectionHeader("CLIENT INFORMATION")
    addTableField("Client Name", data.clientName)
    addTableField("Date", data.date)
    if (data.withdrawalDetails) {
      addTableField("Withdrawal Details", data.withdrawalDetails)
    }
    addTableField("Reason for Withdrawal", data.reasonForWithdrawal)
    addTableField("Client Dissatisfied", data.isDissatisfied ? "Yes" : "No")
    if (data.isDissatisfied && data.dissatisfactionReason) {
      addTableField("Dissatisfaction Details", data.dissatisfactionReason)
    }

    addSectionHeader("INVESTMENT DETAILS")
    addTableField("Investment Bond Withdrawal", data.investmentBondWithdrawal ? "Yes" : "No")
    if (data.investmentBondWithdrawal) {
      addTableField("CGT Calculation Requested", data.cgtCalculationRequested ? "Yes" : "No")
    }
    addTableField("Tax Efficient Withdrawal", data.isTaxEfficient ? "Yes" : "No")
    if (data.plansLeftInPlace) {
      addTableField("Plans Left in Place", data.plansLeftInPlace)
    }
    addTableField("Not Withdrawing from ISA", data.notWithdrawingFromISA ? "Yes" : "No")
    addTableField("OEIC Still in Place", data.oeicStillInPlace ? "Yes" : "No")

    addSectionHeader("VERIFICATION & APPROVAL")
    addTableField("Email Instruction Verified", data.verifiedEmailInstruction ? "Yes" : "No")
    addTableField("Adviser Name", data.adviserName)
    addTableField("Adviser Signature", data.adviserSignature)
    addTableField("Submission Date", data.submissionDate)

    // Add Adviser's Declaration
    addSectionHeader("ADVISER'S DECLARATION")
    
    // Declaration text
    if (yPos > pageHeight - 60) {
      doc.addPage()
      yPos = margin
    }
    
    doc.setFontSize(10)
    doc.setFont("Arial", "normal")
    doc.setTextColor(...blackText)
    const declarationText = "I confirm that all the above checks have been completed and the information provided is accurate to the best of my knowledge. I understand that if this form is not completed or is completed in error, I may be liable for any issues arising from the withdrawal."
    const declarationLines = doc.splitTextToSize(declarationText, pageWidth - 2 * margin)
    doc.text(declarationLines, margin, yPos)
    yPos += declarationLines.length * 5 + 15

    // Signature fields
    if (yPos > pageHeight - 80) {
      doc.addPage()
      yPos = margin
    }

    doc.setFontSize(10)
    doc.setFont("Arial", "bold")
    doc.setTextColor(...blackText)
    doc.text("Adviser's Name:", margin, yPos)
    yPos += 8
    
    // Draw line for signature and add adviser name
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.5)
    doc.line(margin, yPos, margin + 80, yPos)
    // Add adviser name on the line
    doc.setFont("Arial", "normal")
    doc.setTextColor(...blackText)
    doc.text(data.adviserName, margin + 2, yPos - 2)
    yPos += 15

    doc.setFont("Arial", "bold")
    doc.text("Signature:", margin, yPos)
    yPos += 8
    
    // Draw line for signature and add adviser signature
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.5)
    doc.line(margin, yPos, margin + 80, yPos)
    // Add adviser signature on the line
    doc.setFont("Arial", "normal")
    doc.setTextColor(...blackText)
    doc.text(data.adviserSignature, margin + 2, yPos - 2)
    yPos += 15

    doc.setFont("Arial", "bold")
    doc.text("Date:", margin, yPos)
    yPos += 8
    
    // Draw line for date and add submission date
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.5)
    doc.line(margin, yPos, margin + 80, yPos)
    // Add submission date on the line
    doc.setFont("Arial", "normal")
    doc.setTextColor(...blackText)
    doc.text(data.submissionDate, margin + 2, yPos - 2)
    yPos += 20

    // Add Disclaimer
    addSectionHeader("DISCLAIMER")
    
    if (yPos > pageHeight - 40) {
      doc.addPage()
      yPos = margin
    }
    
    doc.setFontSize(10)
    doc.setFont("Arial", "normal")
    doc.setTextColor(...blackText)
    const disclaimerText = "By signing this form, you acknowledge that failure to complete this form accurately or to conduct the necessary checks may result in liability for any issues arising from the withdrawal."
    const disclaimerLines = doc.splitTextToSize(disclaimerText, pageWidth - 2 * margin)
    doc.text(disclaimerLines, margin, yPos)

    const pageCount = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(...grayText)
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: "right" })
    }

    return doc.output("blob")
  }


  const sendToWebhook = async (leadId: string, pdfBlob: Blob, fileName: string, advisorName: string): Promise<boolean> => {
    console.log("Sending PDF to webhook...");

    try {
      if (!process.env.NEXT_PUBLIC_WEBHOOK_WITHDRAWAL_URL) {
        throw new Error('NEXT_PUBLIC_WEBHOOK_WITHDRAWAL_URL environment variable is not set')
      }

      // Create FormData and append the PDF file
      const formData = new FormData();
      const pdfFile = new File([pdfBlob], fileName || `withdrawal-${leadId}-${Date.now()}.pdf`, {
        type: 'application/pdf',
      });
      formData.append('pdf', pdfFile);
      formData.append('lead_id', leadId);
      formData.append('advisor_name', advisorName);
      formData.append('timestamp', new Date().toISOString());
      
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        body: formData,
        // Let the browser set the Content-Type with the boundary
      });

      if (!response.ok) {
        throw new Error(`Webhook error: ${response.statusText}`);
      }

      console.log('PDF successfully sent to webhook');
      return true;
    } catch (error) {
      console.error("Error in uploadPDF:", error)
      if (error instanceof Error) {
        console.error("Error details:", {
          name: error.name,
          message: error.message,
          stack: error.stack,
        })
      }
      throw error // Re-throw to be handled by the caller
    }
  }

  const sendDecisionToWebhook = async (leadId: string, decision: 'approved' | 'rejected'): Promise<boolean> => {
    console.log(`Sending decision ${decision} to webhook for lead ${leadId}...`);

    try {
      if (!process.env.NEXT_PUBLIC_WEBHOOK_WITHDRAWAL_DECISION_URL) {
        throw new Error('NEXT_PUBLIC_WEBHOOK_WITHDRAWAL_DECISION_URL environment variable is not set')
      }

      const response = await fetch(DECISION_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          decision: decision,
          lead_id: leadId,
          timestamp: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook error: ${response.statusText}`);
      }

      console.log(`Decision ${decision} successfully sent to webhook`);
      return true;
    } catch (error) {
      console.error("Error sending decision to webhook:", error)
      if (error instanceof Error) {
        console.error("Error details:", {
          name: error.name,
          message: error.message,
          stack: error.stack,
        })
      }
      throw error // Re-throw to be handled by the caller
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    if (!selectedLead) {
      toast.error("Please select a lead");
      return;
    }
    e.preventDefault()
    console.log("Form submission started")

    if (!formData.clientName || !formData.adviserName || !formData.adviserSignature || !formData.leadId) {
      const missingFields = []
      if (!formData.clientName) missingFields.push("Client Name")
      if (!formData.adviserName) missingFields.push("Adviser Name")
      if (!formData.adviserSignature) missingFields.push("Adviser Signature")
      if (!formData.leadId) missingFields.push("Lead")

      console.error("Missing required fields:", missingFields)
      toast.error(`Missing required fields: ${missingFields.join(", ")}`)
      return
    }

    setIsLoading(true)
    console.log("Form validation passed, starting PDF generation")

    try {
      // Generate PDF
      console.log("Generating PDF...")
      const pdfBlob = generatePDF(formData)
      console.log("PDF generated successfully")

      const fileName = `WithdrawalForm_${formData.clientName.replace(/\s+/g, "_")}_${formData.date}.pdf`
      console.log("Preparing to upload file:", fileName)

      // Send PDF to webhook
      console.log("Sending PDF to webhook...")
      const fileNameWithExt = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`
      await sendToWebhook(formData.leadId, pdfBlob, fileNameWithExt, formData.adviserName)
      console.log("PDF sent to webhook successfully")

      toast.success("Withdrawal form generated and sent successfully!")
      console.log("Success toast shown")

      // Reset form and close
      setShowForm(false)
      setSelectedLead(null)
      console.log("Form reset and closed")
    } catch (error) {
      console.error("Error in form submission:", error)
      if (error instanceof Error) {
        console.error("Error details:", {
          message: error.message,
          name: error.name,
          stack: error.stack,
        })
      }
      toast.error(`Failed to process form: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      console.log("Form submission process completed")
      setIsLoading(false)
    }
  }

  const handleViewForm = (withdrawal: WithdrawalFormData) => {
    setFormData(withdrawal)
    setShowForm(true)
    setSelectedLead(null)
  }

  const handleDownloadPDF = async (withdrawal: WithdrawalFormData) => {
    try {
      if (withdrawal.pdfUrl) {
        const response = await fetch(withdrawal.pdfUrl)
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `WithdrawalForm_${withdrawal.clientName.replace(/\s+/g, "_")}_${withdrawal.date}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error("Error downloading PDF:", error)
      toast.error("Failed to download PDF")
    }
  }

  const handleApproveReject = (leadId: string, decision: 'approved' | 'rejected') => {
    setPendingDecision({ leadId, decision })
    setShowConfirmDialog(true)
  }

  const handleConfirmDecision = async () => {
    if (!pendingDecision) return

    setIsLoading(true)
    try {
      await sendDecisionToWebhook(pendingDecision.leadId, pendingDecision.decision)
      toast.success(`Withdrawal ${pendingDecision.decision} successfully!`)
      setShowConfirmDialog(false)
      setPendingDecision(null)
      // Refresh the data to show updated approval status
      await fetchWithdrawalLeads()
    } catch (error) {
      console.error("Error processing decision:", error)
      toast.error(`Failed to ${pendingDecision.decision} withdrawal: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelDecision = () => {
    setShowConfirmDialog(false)
    setPendingDecision(null)
  }

  const getRowStyling = (approvalStatus: 'approved' | 'rejected' | null | undefined) => {
    if (approvalStatus === 'approved') {
      return 'bg-green-50 border-l-4 border-green-400'
    } else if (approvalStatus === 'rejected') {
      return 'bg-red-50 border-l-4 border-red-400'
    }
    return ''
  }

  // Confirmation Dialog Component
  const ConfirmationDialog = () => {
    if (!showConfirmDialog || !pendingDecision) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h3 className="text-lg font-semibold mb-4">
            Confirm {pendingDecision.decision === 'approved' ? 'Approval' : 'Rejection'}
          </h3>
          <p className="text-gray-600 mb-6">
            Are you sure you want to {pendingDecision.decision} this withdrawal request? 
          </p>
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={handleCancelDecision}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDecision}
              disabled={isLoading}
              className={pendingDecision.decision === 'approved' 
                ? "bg-green-600 hover:bg-green-700 text-white" 
                : "bg-red-600 hover:bg-red-700 text-white"
              }
            >
              {isLoading ? "Processing..." : `Confirm ${pendingDecision.decision === 'approved' ? 'Approval' : 'Rejection'}`}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (showForm) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Withdrawal Form</h1>
              <p className="text-gray-600">Complete withdrawal request form for client processing</p>
            </div>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Back to Withdrawals
            </Button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Lead Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl text-blue-600">Select Lead</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label>Search and Select Lead</Label>
                      <LeadSearch
                        selectedLead={selectedLead}
                        onSelectLead={(lead) => {
                          if (lead) {
                            handleLeadSelect(lead)
                          } else {
                            setSelectedLead(null)
                            setFormData(prev => ({
                              ...prev,
                              leadId: "",
                              leadName: "",
                              clientName: ""
                            }))
                          }
                        }}
                        placeholder="Search by name or email..."
                        className="mt-1"
                        useApiSearch={true}
                        allowManualInput={true}
                      />
                    </div>
                    {selectedLead && (
                      <div className="p-4 bg-gray-50 rounded-md border">
                        <h4 className="font-medium text-gray-900 mb-2">Selected Lead</h4>
                        <div className="space-y-1 text-sm">
                          <p><span className="font-medium">Name:</span> {selectedLead.first_name} {selectedLead.last_name}</p>
                          <p><span className="font-medium">Email:</span> {selectedLead.email}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Client Information Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl text-blue-600">Client Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="clientName">Client's Name *</Label>
                      <Input
                        id="clientName"
                        value={formData.clientName}
                        onChange={(e) => handleInputChange("clientName", e.target.value)}
                        placeholder="Enter client's full name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="date">Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => handleInputChange("date", e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="withdrawalDetails">Withdrawal Details</Label>
                    <Textarea
                      id="withdrawalDetails"
                      value={formData.withdrawalDetails}
                      onChange={(e) => handleInputChange("withdrawalDetails", e.target.value)}
                      placeholder="Please provide detailed information about the withdrawal"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="reasonForWithdrawal">Reason for Withdrawal *</Label>
                    <Textarea
                      id="reasonForWithdrawal"
                      value={formData.reasonForWithdrawal}
                      onChange={(e) => handleInputChange("reasonForWithdrawal", e.target.value)}
                      placeholder="Please specify the reason for withdrawal"
                      rows={3}
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isDissatisfied"
                        checked={formData.isDissatisfied}
                        onCheckedChange={(checked) => handleInputChange("isDissatisfied", checked as boolean)}
                      />
                      <Label htmlFor="isDissatisfied">Is the client dissatisfied?</Label>
                    </div>

                    {formData.isDissatisfied && (
                      <div>
                        <Label htmlFor="dissatisfactionReason">Please specify</Label>
                        <Textarea
                          id="dissatisfactionReason"
                          value={formData.dissatisfactionReason}
                          onChange={(e) => handleInputChange("dissatisfactionReason", e.target.value)}
                          placeholder="Please specify the reason for dissatisfaction"
                          rows={3}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Investment Bond Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl text-blue-600">Investment Bond Withdrawal</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="investmentBondWithdrawal"
                        checked={formData.investmentBondWithdrawal}
                        onCheckedChange={(checked) => handleInputChange("investmentBondWithdrawal", checked as boolean)}
                      />
                      <Label htmlFor="investmentBondWithdrawal">Investment Bond Withdrawal (if applicable)</Label>
                    </div>

                    {formData.investmentBondWithdrawal && (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="cgtCalculationRequested"
                            checked={formData.cgtCalculationRequested}
                            onCheckedChange={(checked) =>
                              handleInputChange("cgtCalculationRequested", checked as boolean)
                            }
                          />
                          <Label htmlFor="cgtCalculationRequested">
                            Have you written to the provider for a CGT calculation before making the withdrawal?
                          </Label>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Portfolio Withdrawal Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl text-blue-600">Portfolio Withdrawal</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isTaxEfficient"
                        checked={formData.isTaxEfficient}
                        onCheckedChange={(checked) => handleInputChange("isTaxEfficient", checked as boolean)}
                      />
                      <Label htmlFor="isTaxEfficient">Is this the most tax-efficient withdrawal?</Label>
                    </div>

                    <div>
                      <Label htmlFor="plansLeftInPlace">What plans are being left in place?</Label>
                      <Textarea
                        id="plansLeftInPlace"
                        value={formData.plansLeftInPlace}
                        onChange={(e) => handleInputChange("plansLeftInPlace", e.target.value)}
                        placeholder="Describe the plans that will remain active"
                        rows={3}
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="notWithdrawingFromISA"
                          checked={formData.notWithdrawingFromISA}
                          onCheckedChange={(checked) => handleInputChange("notWithdrawingFromISA", checked as boolean)}
                        />
                        <Label htmlFor="notWithdrawingFromISA">Ensure not withdrawing from ISA</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="oeicStillInPlace"
                          checked={formData.oeicStillInPlace}
                          onCheckedChange={(checked) => handleInputChange("oeicStillInPlace", checked as boolean)}
                        />
                        <Label htmlFor="oeicStillInPlace">OEIC still in place</Label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Verification Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl text-blue-600">Verification & Security</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="verifiedEmailInstruction"
                      checked={formData.verifiedEmailInstruction}
                      onCheckedChange={(checked) => handleInputChange("verifiedEmailInstruction", checked as boolean)}
                    />
                    <Label htmlFor="verifiedEmailInstruction">
                      If the client emailed the instruction, have you spoken to them to ensure it's really them?
                    </Label>
                  </div>
                </CardContent>
              </Card>

              {/* Adviser Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl text-blue-600">Adviser Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="adviserName">Adviser's Name *</Label>
                      <Input
                        id="adviserName"
                        value={formData.adviserName}
                        onChange={(e) => handleInputChange("adviserName", e.target.value)}
                        placeholder="Enter adviser's full name"
                        required
                        className="bg-gray-50"
                      />
                      <p className="text-sm text-gray-500 mt-1">Automatically populated from your profile</p>
                    </div>
                    <div>
                      <Label htmlFor="adviserSignature">Adviser's Signature (typed name only) *</Label>
                      <Input
                        id="adviserSignature"
                        value={formData.adviserSignature}
                        onChange={(e) => handleInputChange("adviserSignature", e.target.value)}
                        placeholder="Type your full name as signature"
                        required
                        className="bg-gray-50"
                      />
                      <p className="text-sm text-gray-500 mt-1">Automatically populated from your profile</p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="submissionDate">Date *</Label>
                    <Input
                      id="submissionDate"
                      type="date"
                      value={formData.submissionDate}
                      onChange={(e) => handleInputChange("submissionDate", e.target.value)}
                      required
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Submit Button */}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
                  disabled={isLoading}
                >
                  {isLoading ? "Submitting..." : "Submit Withdrawal Form"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Withdrawal Forms</h1>
          <p className="text-gray-600">Manage and view withdrawal request forms</p>
        </div>

        <div className="mb-6">
          <Button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Create New Withdrawal
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lead with Withdrawal Forms</CardTitle>
          </CardHeader>
          <CardContent>
            {withdrawals.length === 0 ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  
                </div>

                {/* Withdrawal Forms List */}
                <Card>
                  {/* <CardHeader>
                    <CardTitle>Withdrawal Forms</CardTitle>
                  </CardHeader> */}
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Lead Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Actions</TableHead>
                          <TableHead>Approval Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {withdrawalLeads.map((lead) => (
                          <TableRow key={lead.id} className={getRowStyling(lead.withdrawal_approval)}>
                            <TableCell>{`${lead.first_name} ${lead.last_name}`}</TableCell>
                            <TableCell>{lead.email}</TableCell>
                            <TableCell>
                              <Link href={lead.withdrawal_link} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" size="sm">
                                  <ExternalLink className="h-4 w-4 mr-2" /> View Form
                                </Button>
                              </Link>
                            </TableCell>
                            <TableCell>
                              {lead.withdrawal_approval ? (
                                <div className="flex items-center space-x-2">
                                  {lead.withdrawal_approval === 'approved' ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      <Check className="h-3 w-3 mr-1" />
                                      Approved
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      <X className="h-3 w-3 mr-1" />
                                      Rejected
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleApproveReject(lead.id, 'approved')}
                                    className="text-green-600 border-green-600 hover:bg-green-50"
                                    disabled={isLoading}
                                  >
                                    <Check className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleApproveReject(lead.id, 'rejected')}
                                    className="text-red-600 border-red-600 hover:bg-red-50"
                                    disabled={isLoading}
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {withdrawalLeads.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">
                              No withdrawal forms found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

              
               
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead Name</TableHead>

                    <TableHead>Adviser</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.map((withdrawal) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell className="font-medium">{withdrawal.leadName}</TableCell>
                      <TableCell>{withdrawal.clientName}</TableCell>
                      <TableCell>{withdrawal.date}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{withdrawal.reasonForWithdrawal}</TableCell>
                      <TableCell>{withdrawal.adviserName}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleViewForm(withdrawal)}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          {withdrawal.pdfUrl && (
                            <Button variant="outline" size="sm" onClick={() => handleDownloadPDF(withdrawal)}>
                              <Download className="h-4 w-4 mr-1" />
                              PDF
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      <ConfirmationDialog />
    </div>
  )
}
