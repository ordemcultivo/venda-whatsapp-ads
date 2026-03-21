export type UserRole = 'ADMIN' | 'CLIENT'
export type LeadStatus = 'new' | 'qualified' | 'sold'
export type LeadPlatform = 'facebook' | 'instagram' | 'google' | 'organic' | 'unknown'

export interface User {
  id: string
  email: string
  name: string | null
  role: UserRole
  client_id: string | null
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  name: string
  slug: string
  meta_account_id: string | null
  google_ads_customer_id: string | null
  whatsapp_instance: string | null
  whatsapp_token: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface Lead {
  id: string
  client_id: string
  phone: string
  name: string | null
  last_name: string | null
  platform: LeadPlatform
  campaign_id: string | null
  campaign_name: string | null
  adset_id: string | null
  adset_name: string | null
  ad_id: string | null
  ad_name: string | null
  status: LeadStatus
  conversion_value: number | null
  currency: string
  meta_lead_id: string | null
  click_id: string | null
  contacted_at: string
  created_at: string
  updated_at: string
}

export interface LeadStatusHistory {
  id: string
  lead_id: string
  old_status: LeadStatus | null
  new_status: LeadStatus
  changed_by: string | null
  conversion_value: number | null
  notes: string | null
  created_at: string
}

export interface DashboardStats {
  total_leads: number
  new_leads: number
  qualified_leads: number
  sold_leads: number
  total_revenue: number
  conversion_rate: number
}

export interface LeadsByDay {
  date: string
  total: number
  facebook: number
  instagram: number
  google: number
  organic: number
  unknown: number
}
