'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Lead } from '@/lib/database';

interface LeadDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
}

export function LeadDetailsDialog({ open, onOpenChange, lead }: LeadDetailsDialogProps) {
  if (!lead) return null;

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '£0';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {lead.contact_first_name} {lead.contact_last_name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Personal Information */}
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <h3 className="text-lg font-semibold">Personal Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-medium">First Name:</span> {lead.contact_first_name || 'N/A'}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Last Name:</span> {lead.contact_last_name || 'N/A'}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Email:</span> {lead.contact_email || 'N/A'}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Phone:</span> {lead.business_telephone || 'N/A'}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-medium">Status:</span> {lead.current_status || 'N/A'}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Source:</span> {lead.lead_source || 'N/A'}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Created On:</span> {formatDate(lead.created_on)}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Company:</span> {lead.business_name || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Business Information */}
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <h3 className="text-lg font-semibold">Business Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-medium">Industry:</span> {lead.industry || 'N/A'}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Company Size:</span> {lead.company_size || 'N/A'}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Annual Revenue:</span> {formatCurrency(lead.annual_revenue)}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-medium">SIC Code:</span> {lead.sic_07_code || 'N/A'}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Website:</span> {lead.website ? (
                    <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {lead.website}
                    </a>
                  ) : 'N/A'}
                </p>
                <p className="text-sm">
                  <span className="font-medium">LinkedIn:</span> {lead.linkedin_company_url ? (
                    <a href={lead.linkedin_company_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      Company Profile
                    </a>
                  ) : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Goals & Budget */}
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <h3 className="text-lg font-semibold">Goals & Budget</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-medium">Goals:</span> {lead.goals || 'N/A'}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Budget:</span> {formatCurrency(lead.budget)}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Budget Frequency:</span> {lead.budget_frequency || 'N/A'}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-medium">Goal Term:</span> {lead.goal_term || 'N/A'}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Goal Year:</span> {lead.goal_year || 'N/A'}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Household Income:</span> {formatCurrency(lead.household_income)}
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {lead.notes && (
            <div className="col-span-full space-y-4 p-4 bg-muted/50 rounded-lg">
              <h3 className="text-lg font-semibold">Notes</h3>
              <p className="text-sm whitespace-pre-line">{lead.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
