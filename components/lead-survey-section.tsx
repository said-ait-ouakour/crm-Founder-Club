"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, CheckCircle2, XCircle, Clock } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface SurveyData {
  id: string
  lead_id: string
  aware_long_term_care: boolean | null
  want_info_wills: boolean | null
  want_info_lpas: boolean | null
  interested_power_of_attorney: boolean | null
  interested_release_equity: boolean | null
  want_nisa_options: boolean | null
  want_15min_followup: boolean | null
  want_reduce_inheritance_tax: boolean | null
  want_pension_or_investment_info: boolean | null
  home_in_trust_protect_from_care: boolean | null
  interested_increasing_retirement_income: boolean | null
  want_improve_returns: boolean | null
  happy_with_savings_performance: boolean | null
  want_full_review_or_charge_assessment: boolean | null
  own_home: boolean | null
  savings_or_investments_over_50k: boolean | null
  savings_investments_pensions_over_50k: boolean | null
  marital_status: string | null
  home_over_1m: boolean | null
  email: string | null
  created_at: string
}

interface LeadSurveySectionProps {
  leadId: string
}

export function LeadSurveySection({ leadId }: LeadSurveySectionProps) {
  const [surveyData, setSurveyData] = useState<SurveyData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSurveyData()
  }, [leadId])

  const fetchSurveyData = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) {
        console.error('Error fetching survey data:', error)
        setSurveyData(null)
      } else if (data && data.length > 0) {
        setSurveyData(data[0] as unknown as SurveyData)
      } else {
        setSurveyData(null)
      }
    } catch (error) {
      console.error('Error fetching survey data:', error)
      setSurveyData(null)
    } finally {
      setLoading(false)
    }
  }


  const getBooleanIcon = (value: boolean | null) => {
    if (value === null) return <Clock className="h-4 w-4 text-gray-400" />
    return value ? (
      <CheckCircle2 className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    )
  }

  const getBooleanText = (value: boolean | null) => {
    if (value === null) return "Not answered"
    return value ? "Yes" : "No"
  }

  const getBooleanColor = (value: boolean | null) => {
    if (value === null) return "text-gray-500"
    return value ? "text-green-600" : "text-red-600"
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Survey Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
            <p className="text-sm text-gray-600 mt-2">Loading survey data...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" />
          Survey Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {surveyData ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Survey Status</p>
                <Badge className="bg-green-100 text-green-800">
                  Completed
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">
                  Completed: {new Date(surveyData.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Personal Information */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Personal Information</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  {getBooleanIcon(surveyData.own_home)}
                  <span className={getBooleanColor(surveyData.own_home)}>
                    Owns Home: {getBooleanText(surveyData.own_home)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {getBooleanIcon(surveyData.home_over_1m)}
                  <span className={getBooleanColor(surveyData.home_over_1m)}>
                    Home Over £1M: {getBooleanText(surveyData.home_over_1m)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {getBooleanIcon(surveyData.savings_or_investments_over_50k)}
                  <span className={getBooleanColor(surveyData.savings_or_investments_over_50k)}>
                    Savings/Investments Over £50K: {getBooleanText(surveyData.savings_or_investments_over_50k)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {getBooleanIcon(surveyData.savings_investments_pensions_over_50k)}
                  <span className={getBooleanColor(surveyData.savings_investments_pensions_over_50k)}>
                    Total Assets Over £50K: {getBooleanText(surveyData.savings_investments_pensions_over_50k)}
                  </span>
                </div>
                {surveyData.marital_status && (
                  <div className="col-span-2">
                    <span className="text-sm text-gray-600">
                      Marital Status: <span className="font-medium">{surveyData.marital_status}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Interest Areas */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Interest Areas</h4>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  {getBooleanIcon(surveyData.want_info_wills)}
                  <span className={getBooleanColor(surveyData.want_info_wills)}>
                    Wants Will Information: {getBooleanText(surveyData.want_info_wills)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {getBooleanIcon(surveyData.want_info_lpas)}
                  <span className={getBooleanColor(surveyData.want_info_lpas)}>
                    Wants LPA Information: {getBooleanText(surveyData.want_info_lpas)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {getBooleanIcon(surveyData.interested_power_of_attorney)}
                  <span className={getBooleanColor(surveyData.interested_power_of_attorney)}>
                    Interested in Power of Attorney: {getBooleanText(surveyData.interested_power_of_attorney)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {getBooleanIcon(surveyData.interested_release_equity)}
                  <span className={getBooleanColor(surveyData.interested_release_equity)}>
                    Interested in Equity Release: {getBooleanText(surveyData.interested_release_equity)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {getBooleanIcon(surveyData.want_reduce_inheritance_tax)}
                  <span className={getBooleanColor(surveyData.want_reduce_inheritance_tax)}>
                    Wants to Reduce Inheritance Tax: {getBooleanText(surveyData.want_reduce_inheritance_tax)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {getBooleanIcon(surveyData.want_pension_or_investment_info)}
                  <span className={getBooleanColor(surveyData.want_pension_or_investment_info)}>
                    Wants Pension/Investment Info: {getBooleanText(surveyData.want_pension_or_investment_info)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {getBooleanIcon(surveyData.interested_increasing_retirement_income)}
                  <span className={getBooleanColor(surveyData.interested_increasing_retirement_income)}>
                    Wants to Increase Retirement Income: {getBooleanText(surveyData.interested_increasing_retirement_income)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {getBooleanIcon(surveyData.want_improve_returns)}
                  <span className={getBooleanColor(surveyData.want_improve_returns)}>
                    Wants to Improve Returns: {getBooleanText(surveyData.want_improve_returns)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {getBooleanIcon(surveyData.want_full_review_or_charge_assessment)}
                  <span className={getBooleanColor(surveyData.want_full_review_or_charge_assessment)}>
                    Wants Full Review/Charge Assessment: {getBooleanText(surveyData.want_full_review_or_charge_assessment)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {getBooleanIcon(surveyData.home_in_trust_protect_from_care)}
                  <span className={getBooleanColor(surveyData.home_in_trust_protect_from_care)}>
                    Home in Trust for Care Protection: {getBooleanText(surveyData.home_in_trust_protect_from_care)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {getBooleanIcon(surveyData.aware_long_term_care)}
                  <span className={getBooleanColor(surveyData.aware_long_term_care)}>
                    Aware of Long-term Care: {getBooleanText(surveyData.aware_long_term_care)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {getBooleanIcon(surveyData.want_nisa_options)}
                  <span className={getBooleanColor(surveyData.want_nisa_options)}>
                    Wants NISA Options: {getBooleanText(surveyData.want_nisa_options)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {getBooleanIcon(surveyData.happy_with_savings_performance)}
                  <span className={getBooleanColor(surveyData.happy_with_savings_performance)}>
                    Happy with Savings Performance: {getBooleanText(surveyData.happy_with_savings_performance)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {getBooleanIcon(surveyData.want_15min_followup)}
                  <span className={getBooleanColor(surveyData.want_15min_followup)}>
                    Wants 15min Follow-up: {getBooleanText(surveyData.want_15min_followup)}
                  </span>
                </div>
              </div>
            </div>

            {surveyData.email && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Contact Information</h4>
                <p className="text-sm text-gray-600">
                  Email: <span className="font-medium">{surveyData.email}</span>
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600">No survey completed yet</p>
            <p className="text-xs text-gray-500 mt-2">Use the "Fill Survey" button in the header to complete the survey for this lead</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
