import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const advisorId = searchParams.get('advisor_id');

    // Build base query
    let query = supabase
      .from('leads')
      .select('*');

    // Apply date filters
    if (dateFrom) {
      query = query.gte('created_on', dateFrom);
    }
    if (dateTo) {
      query = query.lte('created_on', dateTo);
    }

    // Apply advisor filter if provided
    if (advisorId) {
      // This would need to be implemented based on your user assignment logic
      // For now, we'll just filter by owner
      query = query.eq('owner', advisorId);
    }

    const { data: leads, error } = await query;

    if (error) {
      console.error('Error fetching leads for analytics:', error);
      return NextResponse.json(
        { error: 'Failed to fetch leads' },
        { status: 500 }
      );
    }

    // Calculate B2B analytics
    const analytics = {
      totalLeads: leads?.length || 0,
      
      // Industry distribution
      leadsByIndustry: leads?.reduce((acc, lead) => {
        const industry = lead.industry || 'Unknown';
        acc[industry] = (acc[industry] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {},
      
      // Company size distribution
      leadsByCompanySize: leads?.reduce((acc, lead) => {
        const size = lead.company_size || 'Unknown';
        acc[size] = (acc[size] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {},
      
      // Revenue distribution
      leadsByRevenue: leads?.reduce((acc, lead) => {
        const revenue = lead.annual_revenue || 0;
        let band = 'Unknown';
        if (revenue > 0) {
          if (revenue < 100000) band = 'Under £100k';
          else if (revenue < 500000) band = '£100k - £500k';
          else if (revenue < 1000000) band = '£500k - £1M';
          else if (revenue < 5000000) band = '£1M - £5M';
          else band = 'Over £5M';
        }
        acc[band] = (acc[band] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {},
      
      // Geographic distribution
      leadsByLocation: leads?.reduce((acc, lead) => {
        const city = lead.business_city || 'Unknown';
        acc[city] = (acc[city] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {},
      
      // Employee band distribution
      leadsByEmployeeBand: leads?.reduce((acc, lead) => {
        const band = lead.employees_band_desc || 'Unknown';
        acc[band] = (acc[band] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {},
      
      // Turnover band distribution
      leadsByTurnoverBand: leads?.reduce((acc, lead) => {
        const band = lead.modeled_turnover_band_desc || 'Unknown';
        acc[band] = (acc[band] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {},
      
      // Compliance status
      complianceStatus: {
        tpsChecked: leads?.filter(lead => lead.tps_checked).length || 0,
        ctpsChecked: leads?.filter(lead => lead.ctps_checked).length || 0,
        total: leads?.length || 0
      },
      
      // Decision tracking
      decisionTracking: {
        decisionMakerIdentified: leads?.filter(lead => lead.decision_maker_identified).length || 0,
        budgetApproved: leads?.filter(lead => lead.budget_approved).length || 0,
        timelineEstablished: leads?.filter(lead => lead.timeline_established).length || 0,
        total: leads?.length || 0
      },
      
      // Financial metrics
      financialMetrics: {
        totalRevenue: leads?.reduce((sum, lead) => sum + (lead.annual_revenue || 0), 0) || 0,
        averageRevenue: leads?.length > 0 
          ? leads.reduce((sum, lead) => sum + (lead.annual_revenue || 0), 0) / leads.length 
          : 0,
        medianRevenue: calculateMedian(leads?.map(lead => lead.annual_revenue || 0).filter(r => r > 0) || []),
        revenueRange: {
          min: Math.min(...(leads?.map(lead => lead.annual_revenue || 0).filter(r => r > 0) || [0])),
          max: Math.max(...(leads?.map(lead => lead.annual_revenue || 0).filter(r => r > 0) || [0]))
        }
      },
      
      // Top performers
      topIndustries: Object.entries(
        leads?.reduce((acc, lead) => {
          const industry = lead.industry || 'Unknown';
          acc[industry] = (acc[industry] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {}
      )
        .map(([industry, count]) => ({ industry, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      
      topCities: Object.entries(
        leads?.reduce((acc, lead) => {
          const city = lead.business_city || 'Unknown';
          acc[city] = (acc[city] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {}
      )
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      
      // Growth metrics (if date range provided)
      growthMetrics: dateFrom && dateTo ? {
        newLeads: leads?.length || 0,
        growthRate: 0, // This would need historical data to calculate
        trend: 'stable' // This would need historical data to calculate
      } : null,
      
      // Lead quality metrics
      leadQuality: {
        withContactInfo: leads?.filter(lead => lead.contact_email || lead.contact_first_name).length || 0,
        withBusinessInfo: leads?.filter(lead => lead.business_name && lead.industry).length || 0,
        withFinancialInfo: leads?.filter(lead => lead.annual_revenue && lead.annual_revenue > 0).length || 0,
        total: leads?.length || 0
      }
    };

    return NextResponse.json(analytics);

  } catch (error) {
    console.error('Error in B2B analytics API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  
  const sorted = numbers.sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  } else {
    return sorted[middle];
  }
}

