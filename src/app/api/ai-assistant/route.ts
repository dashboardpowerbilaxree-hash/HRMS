import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const { message, context } = await request.json();

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are an AI HR Assistant for a futuristic HR & Salary Management Dashboard called NeoHRMS. You help HR teams with:
- Employee management queries
- Attendance and leave policies
- Payroll calculations and explanations
- Overtime rules and regulations
- Company policy questions
- HR best practices
- Workforce analytics insights

Be concise, professional, and helpful. Use Indian workplace context when relevant. If asked about specific employee data, suggest they check the relevant dashboard module. Format responses with markdown for readability.

Current dashboard context: ${context || 'General HR queries'}`
        },
        { role: 'user', content: message }
      ],
    });

    const reply = completion.choices[0]?.message?.content || 'I apologize, I could not process your request. Please try again.';
    return NextResponse.json({ reply });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
