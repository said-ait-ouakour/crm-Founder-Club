import { createClient } from "@/lib/supabase/client"
import { string } from "zod"

export const supabase = createClient()

// Database types
export interface Lead {
  id: string
  // Business Information
  business_name?: string
  business_address_1?: string
  business_address_2?: string
  business_locality?: string
  business_town?: string
  business_county?: string
  business_post_code?: string
  business_telephone?: string
  company_email?: string
  website?: string
  linkedin_company_url?: string
  linkedin_account_id?: string
  linkedin_invite_accepted?: boolean
  industry?: string
  company_size?: string
  annual_revenue?: number
  sic_07_code?: string
  sic_07_description?: string
  major_sector_desc?: string
  contact_urn?: string
  employees_band_desc?: string
  national_employees_band_desc?: string
  modeled_turnover_band_desc?: string
  
  // Contact Person
  contact_title?: string
  contact_first_name?: string
  contact_last_name?: string
  contact_position?: string
  contact_email?: string
  mobile_phone?: string
  other_phone?: string
  salutation?: string
  date_of_birth?: string
  
  // Compliance
  tps_checked?: boolean
  ctps_checked?: boolean
  verified_phone?: boolean
  verified_email?: boolean
  
  // Lead Management
  owner?: string
  current_status: string
  status_reason?: string
  current_progress?: string
  stage?: string
  lead_source?: string
  pipeline_stage?: number
  pipeline_stage_updated_at?: string
  type_of_lead?: string
  customer_type?: string
  engaged?: boolean
  unsubscribed?: boolean
  
  // Goals & Budget
  goals?: string
  budget?: number
  budget_frequency?: string
  goal_term?: string
  goal_year?: number
  household_income?: number
  
  // Communication Preferences
  preferred_contact_method?: string
  allow_email?: boolean
  allow_phone?: boolean
  allow_fax?: boolean
  allow_mail?: boolean
  allow_bulk_email?: boolean
  
  // Marketing
  marketing_materials_sent?: boolean
  added_to_marketing_list?: boolean
  campaign_name?: string
  last_campaign_date?: string
  
  // System Fields
  created_on?: string
  form_submitted?: string
  active_duration_days?: number
  easy_id?: string
  easy_description?: string
  notes?: string
  last_note_by?: string
  last_note_date?: string
  best_time_to_contact?: string
  followup_letter_date?: string
  followup_letter_name?: string
  followup_letter_notes?: string
  whatsapp_reengage_sent?: boolean
  blog_sent?: boolean
  followup_start?: boolean
  withdrawal_link?: string
  withdrawal_approval?: string
  crm_temp_id?: number
  last_guide_sent?: string
  meeting_achievement?: string
  hasCalled?: boolean
  lead_situation?: LeadSituation[]
  email_conversation?: {
    id?: number
    twilio_conv_id?: string
    whatsapp_twilio_conv_id?: string
    chat_id?: string
    linkedin_attendee_id?: string
    linkedin_conversation_uri?: string
    linkedin_chat_id?: string
  }[]
  calls?: {
    id?: number
    transcript?: string
    call_ended_reason?: string
  }[]
  users_leads?: {
    id?: number
    user_id?: number
    users?: {
      id?: number
      fullname?: string
      email?: string
    }
  }[]
}

export interface Contact {
  lead_id: any
  phone_number: any
  id: string
  first_name: string
  last_name: string
  salutation?: string
  email: string
  mobile_phone?: string
  home_phone?: string
  business_phone?: string
  fax?: string
  owner?: string
  status: string
  status_reason?: string
  appointment_booked?: boolean
  date_cancelled?: string
  review_status?: string
  review_next_due_date?: string
  review_actual_date?: string
  review_next_step?: string
  review_outcome?: string
  reviewed_by?: string
  review_created_on?: string
  preferred_day?: string
  preferred_time?: string
  preferred_service?: string
  preferred_facility?: string
  preferred_user?: string
  allow_email?: boolean
  allow_phone?: boolean
  allow_fax?: boolean
  allow_mail?: boolean
  allow_bulk_email?: boolean
  existing_survey_clarity?: string
  existing_survey_helpfulness?: string
  existing_survey_advisor_ability?: string
  existing_survey_standard?: string
  existing_survey_establishment?: string
  existing_survey_result?: string
  potential_survey_literature_useful?: boolean
  potential_survey_advice_clear?: boolean
  potential_survey_rushed?: boolean
  potential_survey_feedback?: string
  potential_survey_did_not_go_ahead_reason?: string
  address_name?: string
  street_1?: string
  street_2?: string
  street_3?: string
  city?: string
  county?: string
  postal_code?: string
  country?: string
  birthday?: string
  anniversary?: string
  gender?: string
  marital_status?: string
  spouse_partner_name?: string
  occupation?: string
  property_value?: number
  savings_investments?: number
  mortgage_value?: number
  total_current_value?: number
  out_of_cash?: boolean
  phase_1_complete?: boolean
  phase_2_complete?: boolean
  phase_3_complete?: boolean
  investment_service_status?: string
  investment_profile_date?: string
  funds_switched?: boolean
  fund_switch_status?: string
  mps_fee?: number
  mps_data_input?: boolean
  osf_data_input?: boolean
  originating_lead?: string
  will_completed?: boolean
  lpa_signed_by_donor?: boolean
  lpa_completed?: boolean
  presentation_consultation_notes?: string
  omw_profile_needed?: boolean
  docu_sign_forms_required?: string
  docu_sign_sent?: boolean
  email_to_info?: boolean
  send_investment_program?: boolean
  member_service_level?: string
  client_agreement_signed?: boolean
  risk_level?: string
  supervising_financial_advisor?: string
  supporting_broker?: string
  seminar_invitation_sent?: boolean
  seminar_invitation_date?: string
  seminar_attended?: boolean
  google_review_points?: number
  trustpilot_points?: number
  vouched_for_points?: number
  claimed_points?: number
  referral_source?: string
  customer_points_summary?: string
  notes?: string
  activities?: string
  last_updated: string
  created_at: string
}

export interface Opportunity {
  id: string
  contact_id: string
  name: string
  description?: string
  stage: string
  probability: number
  amount?: number
  expected_close_date?: string
  owner?: string
  source?: string
  type?: string
  priority: string
  status: string
  created_at: string
  updated_at: string
  closed_date?: string
  notes?: string
  contact?: Contact
  lead?: Lead
  
  // Extended fields for comprehensive opportunity management
  opportunity_type?: string
  topic?: string
  opportunity_topic?: string
  potential_customer?: string
  fact_find_id?: string
  main_objectives?: string
  advisor?: string
  supervised_by?: string
  lead_source?: string
  advisor_initial_analysis?: string
  benifits?: string
  revenue_user_provided?: number
  revenue_system_calculated?: number
  currency?: string
  investment_manager?: string
  rating?: string
  received595_pay?: boolean
  paid_owner?: string
  paid_advisor?: string
  price_list?: string
  
  // Additional fields from database schema
  lead_id?: string
  illustration_id?: string
  revenue?: string
  est_revenue?: number
  est_closed_date?: string
}

export interface OpportunityProduct {
  id: string
  opportunity_id: string
  product_type: 'existing' | 'writein'
  product_name: string
  price_per_unit: number
  list_price: number
  quantity: number
  extended_amount: number
  created_at: string
  updated_at: string
}

export interface Advisor{ // Independent Account Manager
  id:string
  fullname?:string
  email?:string
  phone?:string
  ringcentral_name?:string
  user_id?:string
  role?:string
  leads?: {
    id?:string
    lead_id?:string
  }[]
}

export interface FactFind {
  id: string
  contact_id: string
  factfind_date?: Date | null
  consultant_name?: string
  owner?: string
  contact_name?: string
  currency?: string
  reason_for_meeting?: string
  c1_title?: string
  c1_first_name?: string
  c1_middle_name?: string
  c1_last_name?: string
  c1_other_names?: string
  c1_gender?: string
  c1_marital_status?: string
  c1_health_status?: string
  c1_employment_status?: string
  c1_occupation?: string
  c1_dob?: Date | null
  c1_smoker?: boolean
  c1_nationality?: string
  c1_has_will?: boolean
  c1_has_lpa?: boolean
  c1_national_insurance?: string
  c1_id_type?: string
  c1_id_number?: string
  c1_id_country?: string
  c1_id_expiry?: Date | null
  c1_town_of_birth?: string
  c2_title?: string
  c2_first_name?: string
  c2_middle_name?: string
  c2_last_name?: string
  c2_other_names?: string
  c2_gender?: string
  c2_marital_status?: string
  c2_health_status?: string
  c2_employment_status?: string
  c2_occupation?: string
  c2_dob?: Date | null
  c2_smoker?: boolean
  c2_nationality?: string
  c2_has_will?: boolean
  c2_has_lpa?: boolean
  c2_national_insurance?: string
  c2_id_type?: string
  c2_id_number?: string
  c2_id_country?: string
  c2_id_expiry?: Date | null
  c2_town_of_birth?: string
  c1_income?: number
  c1_council_tax?: number
  c1_utilities?: number
  c1_groceries?: number
  c1_insurances?: number
  c1_entertainment?: number
  c1_regular_commitments?: number
  c1_discretionary_spending?: number
  c1_mortgage_payments?: number
  c1_loans_or_credit_cards?: number
  c1_other_outgoings?: number
  c1_total_outgoings?: number
  c2_income?: number
  c2_council_tax?: number
  c2_utilities?: number
  c2_groceries?: number
  c2_insurances?: number
  c2_entertainment?: number
  c2_regular_commitments?: number
  c2_discretionary_spending?: number
  c2_mortgage_payments?: number
  c2_loans_or_credit_cards?: number
  c2_other_outgoings?: number
  c2_total_outgoings?: number
  c1_main_home?: number
  c1_second_property?: number
  c1_third_property?: number
  c1_fourth_property?: number
  c1_investments?: number
  c1_savings?: number
  c1_pension?: number
  c1_life_not_in_trust?: number
  c1_car_or_boat?: number
  c1_chattels?: number
  c1_gifts?: number
  c1_business_assets?: number
  c1_rights_in_trust?: number
  c1_expected_inheritance_2y?: number
  c2_main_home?: number
  c2_second_property?: number
  c2_third_property?: number
  c2_fourth_property?: number
  c2_investments?: number
  c2_savings?: number
  c2_pension?: number
  c2_life_not_in_trust?: number
  c2_car_or_boat?: number
  c2_chattels?: number
  c2_gifts?: number
  c2_business_assets?: number
  c2_rights_in_trust?: number
  c2_expected_inheritance_2y?: number
  mortgages_total?: number
  loans_total?: number
  hp_credit_total?: number
  net_assets_total?: number
  inheritance_tax_allowance?: number
  taxable_estate?: number
  inheritance_tax_due?: number
  main_beneficiaries?: string
  child_1_name?: string
  child_1_relation_c1?: string
  child_1_relation_c2?: string
  child_1_financial_dependency?: boolean
  child_1_note?: string
  child_2_name?: string
  child_2_relation_c1?: string
  child_2_relation_c2?: string
  child_2_financial_dependency?: boolean
  child_2_note?: string
  child_3_name?: string
  child_3_relation_c1?: string
  child_3_relation_c2?: string
  child_3_financial_dependency?: boolean
  child_3_note?: string
  child_4_name?: string
  child_4_relation_c1?: string
  child_4_relation_c2?: string
  child_4_financial_dependency?: boolean
  child_4_note?: string
  child_5_name?: string
  child_5_relation_c1?: string
  child_5_relation_c2?: string
  child_5_financial_dependency?: boolean
  child_5_note?: string
  child_6_name?: string
  child_6_relation_c1?: string
  child_6_relation_c2?: string
  child_6_financial_dependency?: boolean
  child_6_note?: string
  grandchildren_notes?: string
  isa_used_this_year?: boolean
  atr_risk_result?: string
  atr_in_words?: string
  target_capital?: number
  current_capital?: number
  target_income?: number
  excluded_property_trusts?: boolean
  small_gifts_exemption?: boolean
  normal_expense_exemption?: boolean
  lifestyle_trust?: boolean
  marriage_gift_exemption?: boolean
  pension_beneficiaries_info?: string
  whole_of_life_policy?: boolean
  inter_vivos_life_cover?: boolean
  business_property_relief?: boolean
  agricultural_property_relief?: boolean
  woodlands_relief?: boolean
  critical_illness_cover?: boolean
  private_medical_insurance?: boolean
  accident_sickness_unemployment_cover?: boolean
  long_term_care?: boolean
  savings_scheme?: boolean
  investments?: boolean
  pensions?: boolean
  mortgage_cover?: boolean
  will_planning_notes?: string
  deed_of_variation?: boolean
  discretionary_trust?: boolean
  loan_trust?: boolean
  dual_protection_scheme?: boolean
  home_protection_scheme?: boolean
  enterprise_schemes?: boolean
  feedback_1_solution?: string
  feedback_1_benefit?: string
  feedback_1_expectation?: string
  feedback_2_solution?: string
  feedback_2_benefit?: string
  feedback_2_expectation?: string
  feedback_3_solution?: string
  feedback_3_benefit?: string
  feedback_3_expectation?: string
  created_at: Date
  updated_at: Date
  contact?: Contact
}

export interface PolicyValuation {
  id: string
  opportunity_id?: string
  contact_name?: string
  policy_owner?: string
  owner?: string
  product?: string
  policy_register_status?: string
  effective_date?: string
  received_commission?: number
  written_commission?: number
  premium_amount?: number
  advisor_name?: string // Independent Account Manager name
  policy_number?: string
  fund_history?: string
  status: string
  valuation_entity?: string
  valuation_date?: string
  valuation_amount?: number
  cash_account_amount?: number
  provider_name?: string
  provider_client_number?: string
  income_amount?: number
  income_to_date?: number
  workflow_status?: string
  email_link_sent?: boolean
  assigned_to?: string
  created_on: string
  updated_at: string
  opportunity?: Opportunity
  notes?: string
}


export enum SentimentAnalysis {
  Positive = 'positive',
  Neutral = 'neutral',
  Negative = 'negative'
}

export interface LeadSituation {
  id: number
  lead_id: string
  sentiment_analysis: SentimentAnalysis
  created_at: string
  last_update: string
  engagement_score: number
  summary: string
  intent: string
  next_steps: string
  advisor_notes?: string // Independent Account Manager notes
}

