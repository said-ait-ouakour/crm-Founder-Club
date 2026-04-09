"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  TrendingUp, 
  Users, 
  DollarSign, 
  MapPin, 
  BarChart3,
  PieChart,
  Target
} from "lucide-react";

interface B2BDashboardProps {
  leads: any[];
  metrics?: {
    totalLeads: number;
    leadsByIndustry: Record<string, number>;
    leadsByCompanySize: Record<string, number>;
    leadsByRevenue: Record<string, number>;
    leadsByLocation: Record<string, number>;
    averageRevenue: number;
    topIndustries: Array<{ industry: string; count: number }>;
    conversionRate: number;
  };
}

export function B2BDashboard({ leads, metrics }: B2BDashboardProps) {
  // Calculate metrics if not provided
  const calculatedMetrics = metrics || {
    totalLeads: leads.length,
    leadsByIndustry: leads.reduce((acc, lead) => {
      const industry = lead.industry || 'Unknown';
      acc[industry] = (acc[industry] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    leadsByCompanySize: leads.reduce((acc, lead) => {
      const size = lead.company_size || 'Unknown';
      acc[size] = (acc[size] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    leadsByRevenue: leads.reduce((acc, lead) => {
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
    }, {} as Record<string, number>),
    leadsByLocation: leads.reduce((acc, lead) => {
      const city = lead.business_city || 'Unknown';
      acc[city] = (acc[city] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    averageRevenue: leads.reduce((sum, lead) => sum + (lead.annual_revenue || 0), 0) / leads.length || 0,
    topIndustries: Object.entries(leads.reduce((acc, lead) => {
      const industry = lead.industry || 'Unknown';
      acc[industry] = (acc[industry] || 0) + 1;
      return acc;
    }, {} as Record<string, number>))
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    conversionRate: 0 // This would need to be calculated based on your conversion logic
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getIndustryColor = (industry: string) => {
    const colors = {
      Technology: "bg-blue-100 text-blue-800",
      Healthcare: "bg-green-100 text-green-800",
      Finance: "bg-purple-100 text-purple-800",
      Manufacturing: "bg-orange-100 text-orange-800",
      Retail: "bg-pink-100 text-pink-800",
      Education: "bg-indigo-100 text-indigo-800",
      Construction: "bg-yellow-100 text-yellow-800",
      "Professional Services": "bg-gray-100 text-gray-800"
    };
    return colors[industry as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getCompanySizeColor = (size: string) => {
    const colors = {
      startup: "bg-green-100 text-green-800",
      small: "bg-blue-100 text-blue-800",
      medium: "bg-yellow-100 text-yellow-800",
      large: "bg-orange-100 text-orange-800",
      enterprise: "bg-red-100 text-red-800"
    };
    return colors[size as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total B2B Leads</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{calculatedMetrics.totalLeads}</div>
            <p className="text-xs text-muted-foreground">
              Business leads in pipeline
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(calculatedMetrics.averageRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Per lead annual revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Industry</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {calculatedMetrics.topIndustries[0]?.industry || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {calculatedMetrics.topIndustries[0]?.count || 0} leads
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {calculatedMetrics.conversionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              B2B lead conversion
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads by Industry */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Leads by Industry
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {calculatedMetrics.topIndustries.map(({ industry, count }) => (
                <div key={industry} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={getIndustryColor(industry)}>
                      {industry}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{count}</span>
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ 
                          width: `${(count / calculatedMetrics.totalLeads) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Leads by Company Size */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Leads by Company Size
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(calculatedMetrics.leadsByCompanySize)
                .sort(([,a], [,b]) => b - a)
                .map(([size, count]) => (
                <div key={size} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={getCompanySizeColor(size)}>
                      {size.charAt(0).toUpperCase() + size.slice(1)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{count}</span>
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ 
                          width: `${(count / calculatedMetrics.totalLeads) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Revenue Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(calculatedMetrics.leadsByRevenue)
                .sort(([,a], [,b]) => b - a)
                .map(([band, count]) => (
                <div key={band} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{band}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{count}</span>
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full" 
                        style={{ 
                          width: `${(count / calculatedMetrics.totalLeads) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Geographic Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Geographic Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(calculatedMetrics.leadsByLocation)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([city, count]) => (
                <div key={city} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{city}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{count}</span>
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ 
                          width: `${(count / calculatedMetrics.totalLeads) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent B2B Leads */}
      <Card>
        <CardHeader>
          <CardTitle>Recent B2B Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {leads.slice(0, 5).map((lead) => (
              <div key={lead.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">{lead.business_name}</p>
                    <p className="text-sm text-gray-500">
                      {lead.contact_first_name} {lead.contact_last_name}
                      {lead.contact_position && ` • ${lead.contact_position}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {lead.industry && (
                    <Badge className={getIndustryColor(lead.industry)}>
                      {lead.industry}
                    </Badge>
                  )}
                  {lead.company_size && (
                    <Badge className={getCompanySizeColor(lead.company_size)}>
                      {lead.company_size}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

