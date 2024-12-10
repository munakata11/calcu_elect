import OpenAI from 'openai';
import { NextResponse } from 'next/server';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not defined');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// モデル名のマッピング
const MODEL_MAPPING = {
  'GPT-4o mini': 'gpt-4o-mini-2024-07-18',
  'GPT-4o': 'chatgpt-4o-latest',
  'o1-preview': 'o1-preview'
} as const;

type ModelKey = keyof typeof MODEL_MAPPING;

export async function POST(req: Request) {
  try {
    const { messages, model, images } = await req.json();

    // モデルの検証
    const validModels = ['GPT-4o mini', 'GPT-4o', 'o1-preview'] as const;
    const selectedModel = validModels.includes(model) ? model : 'GPT-4o mini';
    
    const apiModel = MODEL_MAPPING[selectedModel as ModelKey];

    const modelConfig = {
      'GPT-4o mini': {
        temperature: 0.7,
        max_tokens: 500
      },
      'GPT-4o': {
        temperature: 0.5,
        max_tokens: 1000
      },
      'o1-preview': {
        temperature: 0.3,
        max_tokens: 2000
      }
    } as const;

    const config = modelConfig[selectedModel as ModelKey];

    // メッセージを準備（画像がある場合は画像URLを追加）
    const apiMessages = messages.map((msg: any) => {
      if (msg.role === 'user' && images?.length > 0) {
        return {
          role: msg.role,
          content: [
            { type: 'text', text: msg.content },
            ...images.map((image: string) => ({
              type: 'image_url',
              image_url: { url: image }
            }))
          ]
        };
      }
      return msg;
    });

    // システムメッセージを準備
    const systemMessage = {
      role: "system",
      content: images?.length > 0
        ? "あなたは計算のアシスタントです。数式の計算や数学的な質問に答えてください。ユーザーが添付した画像の内容も考慮して回答してください。"
        : "あなたは計算のアシスタントです。数式の計算や数学的な質問に答えてください。"
    };

    const response = await openai.chat.completions.create({
      model: apiModel,
      messages: [systemMessage, ...apiMessages],
      ...config,
      max_tokens: config.max_tokens
    });

    return NextResponse.json({
      content: response.choices[0].message.content,
      model: selectedModel
    });

  } catch (error) {
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}