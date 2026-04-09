-- Insert sample data for testing

-- Sample Leads
INSERT INTO leads (first_name, last_name, email, phone_number, owner, current_status, current_progress, goals, budget, household_income, property_value, lead_source, customer_type) VALUES
('John', 'Smith', 'john.smith@email.com', '+44 7700 900123', 'Terry Murphy', 'Open', 'Needs Analysis', 'Retirement planning and inheritance tax mitigation', 50000.00, 75000.00, 450000.00, 'Website', 'IFA Client'),
('Sarah', 'Johnson', 'sarah.johnson@email.com', '+44 7700 900124', 'Aidan Kelly', 'Open', 'Call', 'Investment portfolio review', 25000.00, 60000.00, 320000.00, 'Referral', 'Seminar Attendee'),
('Michael', 'Brown', 'michael.brown@email.com', '+44 7700 900125', 'Terry Murphy', 'Qualified', 'Convince', 'Estate planning for family business', 100000.00, 120000.00, 750000.00, 'T&B Partners', 'Business Owner');

-- Sample Contacts (converted from leads)
INSERT INTO contacts (first_name, last_name, email, mobile_phone, owner, status, originating_lead, property_value, savings_investments, occupation, risk_level) VALUES
('Emma', 'Wilson', 'emma.wilson@email.com', '+44 7700 900126', 'Terry Murphy', 'Active', (SELECT id FROM leads LIMIT 1), 380000.00, 45000.00, 'Teacher', 'Medium'),
('David', 'Taylor', 'david.taylor@email.com', '+44 7700 900127', 'Aidan Kelly', 'Active', NULL, 520000.00, 78000.00, 'Engineer', 'Low');

-- Sample Opportunities
INSERT INTO opportunities (contact_id, name, description, stage, probability, amount, expected_close_date, owner, type, priority) VALUES
((SELECT id FROM contacts WHERE first_name = 'Emma' LIMIT 1), 'Retirement Planning Package', 'Comprehensive retirement and investment planning', 'Proposal', 75, 15000.00, '2025-02-15', 'Terry Murphy', 'Investment', 'High'),
((SELECT id FROM contacts WHERE first_name = 'David' LIMIT 1), 'Estate Planning Review', 'Annual estate planning review and optimization', 'Negotiation', 60, 8500.00, '2025-01-30', 'Aidan Kelly', 'Planning', 'Medium');

-- Sample Policies and Valuations
INSERT INTO policies_valuations (opportunity_id, contact_name, policy_owner, owner, product, effective_date, written_commission, premium_amount, policy_number, status, valuation_entity, valuation_date, valuation_amount) VALUES
((SELECT id FROM opportunities LIMIT 1), 'Emma Wilson', 'Emma Wilson', 'Terry Murphy', 'Whole of Life Policy', '2024-12-01', 450.00, 45.00, 'POL-2024-001', 'Active', 'Tabifa Holdings', '2024-12-15', 167.00);
