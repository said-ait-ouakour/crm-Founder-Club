import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // B2B specific filters
    const businessName = searchParams.get('business_name');
    const companyEmail = searchParams.get('company_email');
    const industry = searchParams.get('industry');
    const companySize = searchParams.get('company_size');
    const sicCode = searchParams.get('sic_07_code');
    const majorSector = searchParams.get('major_sector_desc');
    const businessPostCode = searchParams.get('business_post_code');
    const businessCity = searchParams.get('business_city');
    const contactFirstName = searchParams.get('contact_first_name');
    const contactLastName = searchParams.get('contact_last_name');
    const contactEmail = searchParams.get('contact_email');
    const contactPosition = searchParams.get('contact_position');
    const tpsChecked = searchParams.get('tps_checked');
    const ctpsChecked = searchParams.get('ctps_checked');
    const employeesBand = searchParams.get('employees_band_desc');
    const turnoverBand = searchParams.get('modeled_turnover_band_desc');
    const decisionMakerIdentified = searchParams.get('decision_maker_identified');
    const budgetApproved = searchParams.get('budget_approved');
    const timelineEstablished = searchParams.get('timeline_established');
    const leadType = searchParams.get('lead_type');
    const annualRevenueMin = searchParams.get('annual_revenue_min');
    const annualRevenueMax = searchParams.get('annual_revenue_max');
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '20');
    const offset = (page - 1) * pageSize;
    
    // Sorting
    const sortBy = searchParams.get('sort_by') || 'created_on';
    const sortDirection = searchParams.get('sort_direction') || 'desc';

    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' });

    // Apply B2B filters
    if (businessName) {
      query = query.ilike('business_name', `%${businessName}%`);
    }
    
    if (companyEmail) {
      query = query.ilike('company_email', `%${companyEmail}%`);
    }
    
    if (industry) {
      query = query.eq('industry', industry);
    }
    
    if (companySize) {
      query = query.eq('company_size', companySize);
    }
    
    if (sicCode) {
      query = query.eq('sic_07_code', sicCode);
    }
    
    if (majorSector) {
      query = query.ilike('major_sector_desc', `%${majorSector}%`);
    }
    
    if (businessPostCode) {
      query = query.ilike('business_post_code', `%${businessPostCode}%`);
    }
    
    if (businessCity) {
      query = query.ilike('business_city', `%${businessCity}%`);
    }
    
    if (contactFirstName) {
      query = query.ilike('contact_first_name', `%${contactFirstName}%`);
    }
    
    if (contactLastName) {
      query = query.ilike('contact_last_name', `%${contactLastName}%`);
    }
    
    if (contactEmail) {
      query = query.ilike('contact_email', `%${contactEmail}%`);
    }
    
    if (contactPosition) {
      query = query.ilike('contact_position', `%${contactPosition}%`);
    }
    
    if (tpsChecked !== null) {
      query = query.eq('tps_checked', tpsChecked === 'true');
    }
    
    if (ctpsChecked !== null) {
      query = query.eq('ctps_checked', ctpsChecked === 'true');
    }
    
    if (employeesBand) {
      query = query.eq('employees_band_desc', employeesBand);
    }
    
    if (turnoverBand) {
      query = query.eq('modeled_turnover_band_desc', turnoverBand);
    }
    
    if (leadType) {
      query = query.eq('lead_type', leadType);
    }
    
    if (annualRevenueMin) {
      query = query.gte('annual_revenue', annualRevenueMin);
    }
    
    if (annualRevenueMax) {
      query = query.lte('annual_revenue', annualRevenueMax);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortDirection === 'asc' });
    
    // Apply pagination
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching B2B leads:', error);
      return NextResponse.json(
        { error: 'Failed to fetch B2B leads' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      leads: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    });

  } catch (error) {
    console.error('Error in B2B leads API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required B2B fields
    if (!body.business_name) {
      return NextResponse.json(
        { error: 'Business name is required' },
        { status: 400 }
      );
    }

    // Prepare B2B lead data
    const b2bLeadData = {
      // Business Information
      business_name: body.business_name,
      business_address_1: body.business_address_1,
      business_address_2: body.business_address_2,
      business_address_3: body.business_address_3,
      business_city: body.business_city,
      business_county: body.business_county,
      business_post_code: body.business_post_code,
      business_telephone: body.business_telephone,
      company_email: body.company_email,
      website: body.website,
      linkedin_company_url: body.linkedin_company_url,
      
      // Industry Classification
      industry: body.industry,
      major_sector_desc: body.major_sector_desc,
      sic_07_code: body.sic_07_code,
      sic_07_description: body.sic_07_description,
      
      // Company Metrics
      company_size: body.company_size,
      annual_revenue: body.annual_revenue,
      employees_band_desc: body.employees_band_desc,
      national_employees_band_desc: body.national_employees_band_desc,
      modeled_turnover_band_desc: body.modeled_turnover_band_desc,
      
      // Contact Person
      contact_title: body.contact_title,
      contact_first_name: body.contact_first_name,
      contact_last_name: body.contact_last_name,
      contact_position: body.contact_position,
      contact_email: body.contact_email,
      
      // Compliance
      tps_checked: body.tps_checked || false,
      ctps_checked: body.ctps_checked || false,
      
      // Additional B2B Fields
      contact_urn: body.contact_urn,
      lead_type: body.lead_type || 'B2B',
      
      // Standard lead fields (if provided)
      first_name: body.first_name,
      last_name: body.last_name,
      email: body.email,
      phone_number: body.phone_number,
      owner: body.owner,
      current_status: body.current_status || 'Open',
      lead_source: body.lead_source,
      notes: body.notes,
    };

    const { data, error } = await supabase
      .from('leads')
      .insert([b2bLeadData])
      .select()
      .single();

    if (error) {
      console.error('Error creating B2B lead:', error);
      return NextResponse.json(
        { error: 'Failed to create B2B lead' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      lead: data,
      message: 'B2B lead created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error in B2B lead creation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

