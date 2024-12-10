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
        ? `あなたは計算のアシスタントです。以下の指示に従って回答してください：
1. 数式の計算や数学的な質問に答えてください
2. ユーザーが添付した画像の内容も考慮して回答してください
3. 計算式は [ 1+1=2 ] のような形式で出力してください
4. 回答は適切な位置で改行を入れ、読みやすく整形してください
5. 重要な情報は改行で区切って表示してください
6. 大きな数値（10桁以上）は3桁ごとにカンマを入れて表示してください
   例: 1234567890 → 1,234,567,890`
        : `あなたは計算のアシスタントです。以下の指示に従って回答してください：
1. 数式の計算や数学的な質問に答えてください
2. 計算式は [ 1+1=2 ] のような形式で出力してください
3. 回答は適切な位置で改行を入れ、読みやすく整形してください
4. 重要な情報は改行で区切って表示してください
5. 大きな数値（10桁以上）は3桁ごとにカンマを入れて表示してください
   例: 1234567890 → 1,234,567,890`
    };

    const response = await openai.chat.completions.create({
      model: apiModel,
      messages: [systemMessage, ...apiMessages],
      ...config,
      max_tokens: config.max_tokens
    });

    // 応答から不要な記号を削除し、出力を整形
    let cleanedContent = response.choices[0].message.content || '';
    
    // バックスラッシュと改行の組み合わせを通常の改行に置換
    cleanedContent = cleanedContent.replace(/\\n/g, '\n');
    
    // 大きな数値（10桁以上）に3桁ごとにカンマを追加
    cleanedContent = cleanedContent.replace(/\b(\d{10,})\b/g, (match) => {
      return Number(match).toLocaleString();
    });
    
    // 行頭の不要な記号（ハイフンやバックスラッシュ）を削除
    cleanedContent = cleanedContent.split('\n')
      .map(line => line.trim().replace(/^[-\\]+\s*/, ''))
      .join('\n');
    
    // 連続する改行を1つの改行にまとめる
    cleanedContent = cleanedContent.replace(/\n\s*\n/g, '\n');

    return NextResponse.json({
      content: cleanedContent,
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