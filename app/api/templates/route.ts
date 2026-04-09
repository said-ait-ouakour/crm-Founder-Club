import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const templates = [
      {
        id: "HX82e62eccd9a6c3a7fce4421ac1c1ed35",
        title: "Trainee IFA Follow-up",
        content: `Hi {{name}},

This is {{my_name}}  from Thornton & Baines.
You recently applied for our Trainee Independent Financial Adviser role, and we tried giving you a quick call today but couldn't get through.

We'd like to book in a call to explain the training programme and next steps.
What time works best for you this week?

Warm regards,
Thornton & Baines
30 St. Mary Axe
London EC3A 8BF`
      },
      {
        id: "HX6c60bbad60a7d3c7e5afcf61c93dc6f3",
        title: "Interview Reminder - Account Manager",
        content: `Dear {{1}} We would like to remind you about your interview for the Account Manager role today at  {{2}}.  Please join using the Teams link invite sent previously by email. Kind regards, {{3}},
Recruitment Team`
      },
      {
        id: "HX5ebc116c81f22fe3ce0c14bff91c5b61",
        title: "Reschedule Interview - Account Manager",
        content: `Dear {{1}}, We would like to reschedule the interview for the Account manager role, would {{2}} or {{3}} be suitable? Kind regards, Recruitment team.`
      },
      {
        id: "HX5b7a2763b197e10cd9bbcddfd2ca14e5",
        title: "Follow-up - Account Manager",
        content: `Dear {{1}}, We are following up on your application for the Account Manager role. Please let us know a convenient time for a quick call. Kind regards, {{2}} from Recruitment team`
      },
      {
        id: "HX4aa4e102a63607622bd4c90ff0e0652b",
        title: "Interview Reminder - Generic Role",
        content: `Dear {{1}}   We would like to remind you about your interview for the {{2}} role today at  {{3}}.  Please join using the Teams link invite sent previously by email.    Kind regards,  {{4}}, Recruitment Team`
      }
    ];

    return NextResponse.json({ data: templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}
