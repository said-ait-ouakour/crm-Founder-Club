'use client'

import { Button } from "@/components/ui/button"
import { Download, FileText, FileDown } from "lucide-react"
import { FactFind } from "@/lib/supabase"
import { useState } from "react"
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extend jsPDF with autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable?: {
      finalY: number;
    };
  }
}

interface ExportFactFindProps {
  factFind: FactFind
}

export function ExportFactFind({ factFind }: ExportFactFindProps) {
  const [loading, setLoading] = useState<'pdf' | 'docx' | null>(null)

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-GB')
  }

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return '£0.00'
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount)
  }

  const exportToPDF = async () => {
    setLoading('pdf')
    try {
      const doc = new jsPDF()
      
      // Add title
      doc.setFontSize(20)
      doc.text(`Fact Find - ${factFind.contact_name || 'Unknown Contact'}`, 14, 20)
      doc.setFontSize(11)
      doc.setTextColor(100)
      doc.text(`Generated on: ${new Date().toLocaleDateString('en-GB')}`, 14, 30)
      
      // Add basic information
      doc.setFontSize(14)
      doc.setTextColor(0, 0, 0)
      doc.text('Basic Information', 14, 45)
      
      // Basic info table
      const basicInfoData = [
        ['Date', formatDate(factFind.factfind_date)],
        ['Consultant', factFind.consultant_name || 'N/A'],
        ['Owner', factFind.owner || 'N/A'],
        ['Currency', factFind.currency || 'GBP'],
        ['Reason for Meeting', factFind.reason_for_meeting || 'N/A']
      ]
      
      // Add table using autoTable
      autoTable(doc, {
        startY: 50,
        head: [['Field', 'Value']],
        body: basicInfoData,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 10 },
        margin: { left: 14 }
      })

      // Add client 1 details
      doc.setFontSize(14)
      doc.text('Client 1 Details', 14, (doc as any).lastAutoTable.finalY + 15)
      
      const client1Data = [
        ['Title', factFind.c1_title || 'N/A'],
        ['First Name', factFind.c1_first_name || 'N/A'],
        ['Last Name', factFind.c1_last_name || 'N/A'],
        ['Date of Birth', formatDate(factFind.c1_dob)],
        ['Gender', factFind.c1_gender || 'N/A'],
        ['Marital Status', factFind.c1_marital_status || 'N/A'],
        ['Occupation', factFind.c1_occupation || 'N/A'],
        ['National Insurance', factFind.c1_national_insurance || 'N/A'],
        ['Has Will', factFind.c1_has_will ? 'Yes' : 'No'],
        ['Has LPA', factFind.c1_has_lpa ? 'Yes' : 'No']
      ]
      
      // Add client 1 table
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Field', 'Value']],
        body: client1Data,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 10 },
        margin: { left: 14 }
      })

      // Save the PDF
      doc.save(`factfind-${factFind.contact_name?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}-${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
    } finally {
      setLoading(null)
    }
  }

  const exportToDOCX = async () => {
    setLoading('docx')
    try {
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                text: `Fact Find - ${factFind.contact_name || 'Unknown Contact'}`,
                heading: HeadingLevel.HEADING_1,
                spacing: { after: 200 }
              }),
              new Paragraph({
                text: `Generated on: ${new Date().toLocaleDateString('en-GB')}`,
                spacing: { after: 400 }
              }),
              
              // Basic Information
              new Paragraph({
                text: 'Basic Information',
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 400, after: 200 }
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Date: ', bold: true }),
                  new TextRun({ text: formatDate(factFind.factfind_date) })
                ],
                spacing: { after: 100 }
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Consultant: ', bold: true }),
                  new TextRun({ text: factFind.consultant_name || 'N/A' })
                ],
                spacing: { after: 100 }
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Owner: ', bold: true }),
                  new TextRun({ text: factFind.owner || 'N/A' })
                ],
                spacing: { after: 100 }
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Reason for Meeting: ', bold: true }),
                  new TextRun({ text: factFind.reason_for_meeting || 'N/A' })
                ],
                spacing: { after: 400 }
              }),
              
              // Client 1 Details
              new Paragraph({
                text: 'Client 1 Details',
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 400, after: 200 }
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Name: ', bold: true }),
                  new TextRun({ text: `${factFind.c1_title || ''} ${factFind.c1_first_name || ''} ${factFind.c1_last_name || ''}`.trim() || 'N/A' })
                ],
                spacing: { after: 100 }
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Date of Birth: ', bold: true }),
                  new TextRun({ text: formatDate(factFind.c1_dob) })
                ],
                spacing: { after: 100 }
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Occupation: ', bold: true }),
                  new TextRun({ text: factFind.c1_occupation || 'N/A' })
                ],
                spacing: { after: 100 }
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'National Insurance: ', bold: true }),
                  new TextRun({ text: factFind.c1_national_insurance || 'N/A' })
                ],
                spacing: { after: 100 }
              })
            ]
          }
        ]
      })

      // Generate the DOCX file
      const blob = await Packer.toBlob(doc)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `factfind-${factFind.contact_name?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}-${new Date().toISOString().split('T')[0]}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error generating DOCX:', error)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex gap-2">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={exportToPDF}
        disabled={!!loading}
      >
        {loading === 'pdf' ? (
          'Generating PDF...'
        ) : (
          <>
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </>
        )}
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={exportToDOCX}
        disabled={!!loading}
      >
        {loading === 'docx' ? (
          'Generating DOCX...'
        ) : (
          <>
            <FileDown className="h-4 w-4 mr-2" />
            Export DOCX
          </>
        )}
      </Button>
    </div>
  )
}
