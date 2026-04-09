"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  User, 
  Home, 
  Car, 
  Building2, 
  PiggyBank, 
  Landmark, 
  FileText, 
  Mail, 
  Phone,
  Heart,
  Gift,
  Percent
} from "lucide-react"

interface Lead {
  id: string
  first_name?: string
  last_name?: string
  email?: string
  phone_number?: string
  mobile_phone?: string
  marital_status?: string
  property_value?: number
  other_properties_value?: number
  car_value?: number
  contents_value?: number
  antiques_value?: number
  bat_value?: number
  investments_value?: number
  life_insurance_value?: number
  other_assets_value?: number
  outstanding_mortgage?: number
  other_loans_value?: number
  other_liabilities_value?: number
  main_home_beneficiaries?: string
  will_clause_effect?: string
  gifts_last_7_years?: boolean | string
  gifting_10_percent_estate?: boolean | string
}

interface LeadIHTAnswersProps {
  lead: Lead
}

// Helper function to format currency
const formatCurrency = (value?: number | null) => {
  if (value === null || value === undefined) return "Not provided"
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

// Helper function to format text responses
const formatTextResponse = (value?: string | null) => {
  if (!value || value.trim() === '') return "Not provided"
  return value
}

// Helper function to format boolean or string responses
const formatBooleanOrTextResponse = (value?: boolean | string | null) => {
  if (value === null || value === undefined) return "Not provided"
  
  if (typeof value === 'boolean') {
    return value ? "Yes" : "No"
  }
  
  if (typeof value === 'string') {
    if (value.trim() === '') return "Not provided"
    return value
  }
  
  return "Not provided"
}

// Helper function to get status badge for boolean-like responses
const getResponseBadge = (value?: boolean | string | null) => {
  if (value === null || value === undefined) return <Badge variant="outline">Not provided</Badge>
  
  if (typeof value === 'boolean') {
    return value ? (
      <Badge className="bg-green-100 text-green-800">Yes</Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800">No</Badge>
    )
  }
  
  if (typeof value === 'string') {
    if (value.trim() === '') return <Badge variant="outline">Not provided</Badge>
    
    const lowerValue = value.toLowerCase()
    if (lowerValue.includes('yes') || lowerValue.includes('true')) {
      return <Badge className="bg-green-100 text-green-800">Yes</Badge>
    } else if (lowerValue.includes('no') || lowerValue.includes('false')) {
      return <Badge className="bg-red-100 text-red-800">No</Badge>
    }
    
    return <Badge variant="outline">{value}</Badge>
  }
  
  return <Badge variant="outline">Not provided</Badge>
}

export function LeadIHTAnswers({ lead }: LeadIHTAnswersProps) {
  const ihtQuestions = [
    {
      id: 1,
      question: "For IHT purposes, what is your marital status?",
      answer: formatTextResponse(lead.marital_status),
      icon: <User className="h-4 w-4" />,
      category: "personal"
    },
    {
      id: 2,
      question: "Just so we can work out the tax, how much is your main residence worth?",
      answer: formatCurrency(lead.property_value),
      icon: <Home className="h-4 w-4" />,
      category: "property"
    },
    {
      id: 3,
      question: "What is the total value of all your other properties?",
      answer: formatCurrency(lead.other_properties_value),
      icon: <Building2 className="h-4 w-4" />,
      category: "property"
    },
    {
      id: 4,
      question: "What is the approximate value of any Cars, Caravans or Boats?",
      answer: formatCurrency(lead.car_value),
      icon: <Car className="h-4 w-4" />,
      category: "assets"
    },
    {
      id: 5,
      question: "What is the resale value of your household contents & personal effects?",
      answer: formatCurrency(lead.contents_value),
      icon: <FileText className="h-4 w-4" />,
      category: "assets"
    },
    {
      id: 6,
      question: "What is the approximate value of any antiques, jewellery, art and or collectables?",
      answer: formatCurrency(lead.antiques_value),
      icon: <FileText className="h-4 w-4" />,
      category: "assets"
    },
    {
      id: 7,
      question: "What is the approximate total value of your bank and building society accounts?",
      answer: formatCurrency(lead.bat_value),
      icon: <PiggyBank className="h-4 w-4" />,
      category: "financial"
    },
    {
      id: 8,
      question: "What is the total value of your Investments?",
      answer: formatCurrency(lead.investments_value),
      icon: <Landmark className="h-4 w-4" />,
      category: "financial"
    },
    {
      id: 9,
      question: "What is the value of any Life Insurance plans, not written in trust?",
      answer: formatCurrency(lead.life_insurance_value),
      icon: <FileText className="h-4 w-4" />,
      category: "financial"
    },
    {
      id: 10,
      question: "What is the value of any other assets?",
      answer: formatCurrency(lead.other_assets_value),
      icon: <FileText className="h-4 w-4" />,
      category: "assets"
    },
    {
      id: 11,
      question: "What is the total outstanding Mortgage/s you have?",
      answer: formatCurrency(lead.outstanding_mortgage),
      icon: <Home className="h-4 w-4" />,
      category: "liabilities"
    },
    {
      id: 12,
      question: "What is the outstanding value of other loans you have?",
      answer: formatCurrency(lead.other_loans_value),
      icon: <FileText className="h-4 w-4" />,
      category: "liabilities"
    },
    {
      id: 13,
      question: "What is the outstanding value of other liabilities you have?",
      answer: formatCurrency(lead.other_liabilities_value),
      icon: <FileText className="h-4 w-4" />,
      category: "liabilities"
    },
    {
      id: 14,
      question: "Your full name",
      answer: `${lead.contact_first_name || ''} ${lead.contact_last_name || ''}`.trim() || "Not provided",
      icon: <User className="h-4 w-4" />,
      category: "personal"
    },
    {
      id: 15,
      question: "Email address you want your result sent to?",
      answer: formatTextResponse(lead.email),
      icon: <Mail className="h-4 w-4" />,
      category: "personal"
    },
    {
      id: 16,
      question: "Your phone number",
      answer: formatTextResponse(lead.phone_number || lead.mobile_phone),
      icon: <Phone className="h-4 w-4" />,
      category: "personal"
    },
    {
      id: 17,
      question: "Who do you want to benefit from your main residential home?",
      answer: formatTextResponse(lead.main_home_beneficiaries),
      icon: <Heart className="h-4 w-4" />,
      category: "planning"
    },
    {
      id: 18,
      question: "Are there any clauses in your Will that can affect IHT?",
      answer: formatTextResponse(lead.will_clause_effect),
      icon: <FileText className="h-4 w-4" />,
      category: "planning"
    },
    {
      id: 19,
      question: "Have you made any gifts in the last 7 years? (Gifts to family or friends above £3,000.00)",
      answer: formatBooleanOrTextResponse(lead.gifts_last_7_years),
      icon: <Gift className="h-4 w-4" />,
      category: "planning"
    },
    {
      id: 20,
      question: "Are you gifting more than 10% of your estate to a UK registered Charity?",
      answer: formatBooleanOrTextResponse(lead.gifting_10_percent_estate),
      icon: <Percent className="h-4 w-4" />,
      category: "planning"
    }
  ]

  // Group questions by category
  const groupedQuestions = ihtQuestions.reduce((acc, question) => {
    if (!acc[question.category]) {
      acc[question.category] = []
    }
    acc[question.category].push(question)
    return acc
  }, {} as Record<string, typeof ihtQuestions>)

  const categoryLabels = {
    personal: "Personal Information",
    property: "Property Values",
    assets: "Assets & Valuables",
    financial: "Financial Assets",
    liabilities: "Liabilities & Debts",
    planning: "Estate Planning"
  }

  const categoryIcons = {
    personal: <User className="h-4 w-4" />,
    property: <Home className="h-4 w-4" />,
    assets: <FileText className="h-4 w-4" />,
    financial: <PiggyBank className="h-4 w-4" />,
    liabilities: <FileText className="h-4 w-4" />,
    planning: <Heart className="h-4 w-4" />
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" />
          IHT Assessment Answers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(groupedQuestions).map(([category, questions]) => (
          <div key={category} className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 border-b pb-2">
              {categoryIcons[category as keyof typeof categoryIcons]}
              {categoryLabels[category as keyof typeof categoryLabels]}
            </div>
            <div className="space-y-3">
              {questions.map((q) => (
                <div key={q.id} className="text-sm">
                  <div className="flex items-start gap-2 mb-1">
                    {q.icon}
                    <span className="font-medium text-gray-600 text-xs leading-tight">
                      {q.question}
                    </span>
                  </div>
                  <div className="ml-6">
                    {q.category === 'planning' && (q.id === 18 || q.id === 19 || q.id === 20) ? (
                      getResponseBadge(q.id === 19 ? lead.gifts_last_7_years : q.id === 20 ? lead.gifting_10_percent_estate : lead.will_clause_effect)
                    ) : (
                      <span className="text-gray-800 font-medium">{q.answer}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        {/* Summary Section */}
        <div className="mt-6 pt-4 border-t">
          <div className="text-sm font-medium text-gray-700 mb-3">Quick Summary</div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Total Assets:</span>
              <span className="font-medium">
                {formatCurrency(
                  (lead.property_value || 0) +
                  (lead.other_properties_value || 0) +
                  (lead.car_value || 0) +
                  (lead.contents_value || 0) +
                  (lead.antiques_value || 0) +
                  (lead.bat_value || 0) +
                  (lead.investments_value || 0) +
                  (lead.life_insurance_value || 0) +
                  (lead.other_assets_value || 0)
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total Liabilities:</span>
              <span className="font-medium">
                {formatCurrency(
                  (lead.outstanding_mortgage || 0) +
                  (lead.other_loans_value || 0) +
                  (lead.other_liabilities_value || 0)
                )}
              </span>
            </div>
            <div className="flex justify-between col-span-2 pt-2 border-t">
              <span className="text-gray-500 font-medium">Net Estate Value:</span>
              <span className="font-semibold">
                {formatCurrency(
                  ((lead.property_value || 0) +
                  (lead.other_properties_value || 0) +
                  (lead.car_value || 0) +
                  (lead.contents_value || 0) +
                  (lead.antiques_value || 0) +
                  (lead.bat_value || 0) +
                  (lead.investments_value || 0) +
                  (lead.life_insurance_value || 0) +
                  (lead.other_assets_value || 0)) -
                  ((lead.outstanding_mortgage || 0) +
                  (lead.other_loans_value || 0) +
                  (lead.other_liabilities_value || 0))
                )}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
