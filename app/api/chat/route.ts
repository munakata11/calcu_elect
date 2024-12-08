import OpenAI from 'openai';
import { NextResponse } from 'next/server';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not defined');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages, model } = await req.json();

    // モデルの検証
    const validModels = ['gpt-3.5-turbo', 'gpt-3.5-turbo-16k', 'gpt-4'];
    const selectedModel = validModels.includes(model) ? model : 'gpt-3.5-turbo';

    const response = await openai.chat.completions.create({
      model: selectedModel,  // 検証済みのモデルを使用
      messages: [
        {
          role: "system",
          content: "あなたは計算のアシスタントです。数式の計算や数学的な質問に答えてください。"
        },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return NextResponse.json({
      content: response.choices[0].message.content,
      model: selectedModel  // 使用されたモデルを返す
    });

  } catch (error) {
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}