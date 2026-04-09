import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    switch (type) {
      case 'industries':
        return NextResponse.json({
          industries: [
            'Technology',
            'Healthcare',
            'Finance',
            'Manufacturing',
            'Retail',
            'Education',
            'Construction',
            'Professional Services',
            'Real Estate',
            'Transportation',
            'Energy',
            'Government',
            'Non-Profit',
            'Other'
          ]
        });

      case 'company-sizes':
        return NextResponse.json({
          companySizes: [
            { value: 'startup', label: 'Startup (1-10 employees)' },
            { value: 'small', label: 'Small (11-50 employees)' },
            { value: 'medium', label: 'Medium (51-200 employees)' },
            { value: 'large', label: 'Large (201-1000 employees)' },
            { value: 'enterprise', label: 'Enterprise (1000+ employees)' }
          ]
        });

      case 'employee-bands':
        return NextResponse.json({
          employeeBands: [
            '1-10',
            '11-50',
            '51-200',
            '201-500',
            '501-1000',
            '1000+'
          ]
        });

      case 'turnover-bands':
        return NextResponse.json({
          turnoverBands: [
            'Under £100k',
            '£100k - £500k',
            '£500k - £1M',
            '£1M - £5M',
            'Over £5M'
          ]
        });

      case 'sic-codes':
        // This would typically connect to a SIC code database
        // For now, return a sample of common SIC codes
        const sicCodes = [
          { code: '62012', description: 'Business and domestic software development' },
          { code: '62020', description: 'Computer consultancy activities' },
          { code: '62030', description: 'Computer facilities management activities' },
          { code: '62090', description: 'Other information technology service activities' },
          { code: '63110', description: 'Data processing, hosting and related activities' },
          { code: '63120', description: 'Web portals' },
          { code: '63910', description: 'News agency activities' },
          { code: '63990', description: 'Other information service activities not elsewhere classified' },
          { code: '70100', description: 'Activities of head offices' },
          { code: '70210', description: 'Public relations and communications activities' },
          { code: '70220', description: 'Business and other management consultancy activities' },
          { code: '71110', description: 'Architectural activities' },
          { code: '71111', description: 'Architectural activities' },
          { code: '71112', description: 'Urban planning and landscape architectural activities' },
          { code: '71120', description: 'Engineering activities and related technical consultancy' },
          { code: '71200', description: 'Technical testing and analysis' },
          { code: '72110', description: 'Research and experimental development on biotechnology' },
          { code: '72190', description: 'Other research and experimental development on natural sciences and engineering' },
          { code: '72200', description: 'Research and experimental development on social sciences and humanities' },
          { code: '73100', description: 'Advertising' },
          { code: '73200', description: 'Market research and public opinion polling' },
          { code: '74100', description: 'Specialised design activities' },
          { code: '74200', description: 'Photographic activities' },
          { code: '74300', description: 'Translation and interpretation activities' },
          { code: '74901', description: 'Environmental consulting activities' },
          { code: '74902', description: 'Quantity surveying activities' },
          { code: '74909', description: 'Other professional, scientific and technical activities not elsewhere classified' },
          { code: '75000', description: 'Veterinary activities' },
          { code: '77110', description: 'Renting and leasing of cars and light motor vehicles' },
          { code: '77120', description: 'Renting and leasing of trucks' },
          { code: '77210', description: 'Renting and leasing of recreational and sports goods' },
          { code: '77220', description: 'Renting of video tapes and disks' },
          { code: '77291', description: 'Renting and leasing of media entertainment equipment' },
          { code: '77299', description: 'Renting and leasing of other personal and household goods' },
          { code: '77310', description: 'Renting and leasing of agricultural machinery and equipment' },
          { code: '77320', description: 'Renting and leasing of construction and civil engineering machinery and equipment' },
          { code: '77330', description: 'Renting and leasing of office machinery and equipment (including computers)' },
          { code: '77340', description: 'Renting and leasing of water transport equipment' },
          { code: '77350', description: 'Renting and leasing of air transport equipment' },
          { code: '77390', description: 'Renting and leasing of other machinery, equipment and tangible goods not elsewhere classified' },
          { code: '77400', description: 'Leasing of intellectual property and similar products, except copyrighted works' },
          { code: '78101', description: 'Motion picture, video and television programme production activities' },
          { code: '78102', description: 'Motion picture, video and television programme post-production activities' },
          { code: '78103', description: 'Motion picture, video and television programme distribution activities' },
          { code: '78109', description: 'Motion picture, video and television programme production activities not elsewhere classified' },
          { code: '78200', description: 'Sound recording and music publishing activities' },
          { code: '78300', description: 'Programming and broadcasting activities' },
          { code: '79110', description: 'Travel agency activities' },
          { code: '79120', description: 'Tour operator activities' },
          { code: '79901', description: 'Activities of tourist guides' },
          { code: '79909', description: 'Other reservation service activities not elsewhere classified' },
          { code: '80100', description: 'Private security activities' },
          { code: '80200', description: 'Security systems service activities' },
          { code: '80300', description: 'Investigation activities' },
          { code: '81100', description: 'Combined facilities support activities' },
          { code: '81210', description: 'General cleaning of buildings' },
          { code: '81221', description: 'Window cleaning services' },
          { code: '81222', description: 'Specialised cleaning services' },
          { code: '81223', description: 'Furnace and chimney cleaning services' },
          { code: '81229', description: 'Other building and industrial cleaning activities' },
          { code: '81291', description: 'Disinfecting and pest control services' },
          { code: '81299', description: 'Other cleaning services' },
          { code: '81300', description: 'Landscaping service activities' },
          { code: '82110', description: 'Combined office administrative activities' },
          { code: '82190', description: 'Photocopying, document preparation and other specialised office support activities' },
          { code: '82200', description: 'Activities of call centres' },
          { code: '82301', description: 'Activities of exhibition and fair organisers' },
          { code: '82302', description: 'Activities of conference organisers' },
          { code: '82910', description: 'Activities of collection agencies and credit bureaus' },
          { code: '82920', description: 'Packaging activities' },
          { code: '82990', description: 'Other business support service activities not elsewhere classified' },
          { code: '84110', description: 'General public administration activities' },
          { code: '84120', description: 'Regulation of the activities of providing health care, education, cultural services and other social services, excluding social security' },
          { code: '84130', description: 'Regulation of and contribution to more efficient operation of businesses' },
          { code: '84210', description: 'Foreign affairs' },
          { code: '84220', description: 'Defence activities' },
          { code: '84230', description: 'Justice and judicial activities' },
          { code: '84240', description: 'Public order and safety activities' },
          { code: '84250', description: 'Fire service activities' },
          { code: '84300', description: 'Compulsory social security activities' },
          { code: '85100', description: 'Pre-primary education' },
          { code: '85200', description: 'Primary education' },
          { code: '85310', description: 'General secondary education' },
          { code: '85320', description: 'Technical and vocational secondary education' },
          { code: '85410', description: 'Post-secondary non-tertiary education' },
          { code: '85421', description: 'First-degree level higher education' },
          { code: '85422', description: 'Post-graduate level higher education' },
          { code: '85510', description: 'Sports and recreation education' },
          { code: '85520', description: 'Cultural education' },
          { code: '85530', description: 'Driving school activities' },
          { code: '85590', description: 'Other education not elsewhere classified' },
          { code: '85600', description: 'Educational support activities' },
          { code: '86101', description: 'Hospital activities' },
          { code: '86102', description: 'Medical nursing home activities' },
          { code: '86210', description: 'General medical practice activities' },
          { code: '86220', description: 'Specialists medical practice activities' },
          { code: '86230', description: 'Dental practice activities' },
          { code: '86310', description: 'General medical practice activities' },
          { code: '86320', description: 'Specialists medical practice activities' },
          { code: '86330', description: 'Dental practice activities' },
          { code: '86400', description: 'Veterinary activities' },
          { code: '86500', description: 'Medical and dental practice activities' },
          { code: '86600', description: 'Other human health activities' },
          { code: '86900', description: 'Other human health activities' },
          { code: '87100', description: 'Residential nursing care activities' },
          { code: '87200', description: 'Residential care activities for mental retardation, mental health and substance abuse' },
          { code: '87300', description: 'Residential care activities for the elderly and disabled' },
          { code: '87900', description: 'Other residential care activities' },
          { code: '88100', description: 'Social work activities without accommodation for the elderly and disabled' },
          { code: '88910', description: 'Child day-care activities' },
          { code: '88990', description: 'Other social work activities without accommodation not elsewhere classified' },
          { code: '90010', description: 'Performing arts' },
          { code: '90020', description: 'Support activities to performing arts' },
          { code: '90030', description: 'Artistic creation' },
          { code: '90040', description: 'Operation of arts facilities' },
          { code: '91011', description: 'Library activities' },
          { code: '91012', description: 'Museums activities' },
          { code: '91020', description: 'Archives activities' },
          { code: '91030', description: 'Botanical and zoological gardens and nature reserves activities' },
          { code: '92000', description: 'Gambling and betting activities' },
          { code: '93110', description: 'Operation of sports facilities' },
          { code: '93120', description: 'Activities of sports clubs' },
          { code: '93130', description: 'Fitness facilities' },
          { code: '93191', description: 'Sports and recreation education' },
          { code: '93199', description: 'Other sports activities' },
          { code: '93210', description: 'Activities of amusement parks and theme parks' },
          { code: '93290', description: 'Other amusement and recreation activities' },
          { code: '94110', description: 'Activities of business and employers membership organisations' },
          { code: '94120', description: 'Activities of professional membership organisations' },
          { code: '94200', description: 'Activities of trade unions' },
          { code: '94910', description: 'Activities of religious organisations' },
          { code: '94920', description: 'Activities of political organisations' },
          { code: '94990', description: 'Activities of other membership organisations not elsewhere classified' },
          { code: '95110', description: 'Repair of computers and peripheral equipment' },
          { code: '95120', description: 'Repair of communication equipment' },
          { code: '95210', description: 'Repair of consumer electronics' },
          { code: '95220', description: 'Repair of household appliances and home and garden equipment' },
          { code: '95230', description: 'Repair of footwear and leather goods' },
          { code: '95240', description: 'Repair of furniture and home furnishings' },
          { code: '95250', description: 'Repair of watches, clocks and jewellery' },
          { code: '95290', description: 'Repair of other personal and household goods' },
          { code: '96010', description: 'Washing and (dry-)cleaning of textile and fur products' },
          { code: '96020', description: 'Hairdressing and other beauty treatment' },
          { code: '96030', description: 'Funeral and related activities' },
          { code: '96040', description: 'Physical well-being activities' },
          { code: '96090', description: 'Other service activities not elsewhere classified' }
        ];

        // Filter by search term if provided
        const filteredSicCodes = search 
          ? sicCodes.filter(item => 
              item.code.includes(search) || 
              item.description.toLowerCase().includes(search.toLowerCase())
            )
          : sicCodes;

        return NextResponse.json({
          sicCodes: filteredSicCodes.slice(0, 50) // Limit results
        });

      case 'titles':
        return NextResponse.json({
          titles: [
            'Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Prof', 'Sir', 'Dame'
          ]
        });

      default:
        return NextResponse.json(
          { error: 'Invalid lookup type' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error in B2B lookup API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

