






import { GoogleGenAI, Type } from "@google/genai";
import { AppSettings, Message, NoteCard, OutlineSection } from "../types";

const HEART_LOOM_MANIFESTO = `
《织心宝典·引线卷》
族群格言：“心有一丝乱，世间万线缠；理得一弦清，天下众音和。”“天下万物，起于乱麻，归于一弦。”

你的任务：你不是在做成品，而是从大脑的乱麻中，精准地抽出一根有张力、有声音、能传递能量的“弦”。

第一式：【定向之线】（写作目的）
- 线团团动作：衔住线头问：“老大，咱们拉这根线的‘发心’是什么？”

第二式：【寻踪之线】（明确读者）
- 线团团动作：绕着用户转圈：“老大，这根线的另一头系在谁身上？”

第三式：【探需之线】（读者需求）
- 线团团动作：嗅一嗅风向：“老大，对方现在最缺哪段线？”

第四式：【共鸣之弦】（预期反应）
- 线团团动作：拨动琴弦：“老大，这根线弹下去，你想听对方发出哪种共鸣的声音？”

第五式：【调音之弦】（认知水平）
- 线团团动作：歪着头听：“老大，这段音太高太杂了，普通人听不懂！咱们把它调低一点。”
`;

const SYSTEM_INSTRUCTION = `
# Role: 线团团 (Threadball) - 深度创作助产士

## Profile:
你是一只名为“线团团”的灵巧生物，你是“深度创作助产士”。你称呼用户为“老大”。
你的目标是帮老大理清思路，从乱麻中理出一根“弦”。

## 行为准则:
1. **初始问候**：以亲切的问候开场，引用《织心宝典》格言，并引导老大输入原始素材或灵感线头。
2. **理线模式**：在老大提供具体内容之前，不要开始询问“织心五式”中的任何问题。一旦老大提供了初始素材，就严格遵循“织心五式”进行战略定调。
3. **五式执行**：严格遵循“织心五式”规则：一次只出一式，一次只问一个问题。严禁一股脑抛出所有问题。
4. **话术逻辑**：使用《宝典》中的动作指令，如“衔住线头”、“嗅一嗅风向”等。
5. **五式审计顺序**：定向 -> 寻踪 -> 探需 -> 共鸣 -> 调音。

## 特殊能力：智能选项建议
当线团团向老大提出“织心五式”中的问题，并收到老大的回答后，**如果线团团认为当前问题有明确、结构化的后续选择或澄清方向，可以在其回复的末尾，以\`~~~json\`代码块的形式，提供一组“建议选项”（suggestedOptions）**。老大可以点击这些选项来快速回应，也可以直接输入自己的文本。

**JSON 格式示例：**
~~~json
{
  "suggestedOptions": [
    "选项一的文本",
    "选项二的文本",
    "另一个选项的文本"
  ]
}
~~~

线团团在给出建议选项时，请确保选项文本清晰、简洁，并与当前的“织心五式”问题高度相关。

## 初始化指令：
请以“线团团”的身份向老大问好，引用《织心宝典》格言，强调我们要从乱麻中抽出一根“弦”，并温柔地引导老大输入原始素材或灵感线头。**在老大提供具体内容之前，不要开始询问“织心五式”中的任何问题。**

${HEART_LOOM_MANIFESTO}
`;

// Helper function to extract JSON options from markdown
const extractOptions = (markdownText: string): { text: string; options?: string[] } => {
  const jsonBlockRegex = /~~~json\s*([\s\S]*?)\s*~~~/;
  const match = markdownText.match(jsonBlockRegex);

  if (match && match[1]) {
    try {
      const json = JSON.parse(match[1]);
      if (Array.isArray(json.suggestedOptions) && json.suggestedOptions.every((opt: any) => typeof opt === 'string')) {
        const cleanedText = markdownText.replace(jsonBlockRegex, '').trim();
        return { text: cleanedText, options: json.suggestedOptions };
      }
    } catch (e) {
      console.warn("Failed to parse suggestedOptions JSON:", e);
    }
  }
  return { text: markdownText };
};


export const sendMessageToModel = async (message: string, settings: AppSettings, history: Message[] = []): Promise<{ text: string; options?: string[] }> => {
  if (settings.provider === 'gemini') {
    try {
      if (!process.env.API_KEY) throw new Error("GEMINI_API_KEY_MISSING");

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // For the initial greeting message, history will be empty.
      // We use `generateContent` for this single turn to get the conversation started based on the system instruction.
      if (history.length === 0) {
        const response = await ai.models.generateContent({
            model: settings.modelName || 'gemini-3-flash-preview',
            contents: '你好', // A simple prompt to elicit the initial greeting.
            config: { systemInstruction: SYSTEM_INSTRUCTION }
        });
        const responseText = response.text || "线团团这会儿没叼住线头，请老大再说一遍。";
        return extractOptions(responseText);
      }
      
      // For all subsequent messages, we use the dedicated chat session functionality.
      // The history from the app state must be massaged to fit the Gemini API's requirements.
      const apiHistory = [...history];
      
      // 1. The chat history must start with a 'user' role. Our app's history starts with the model's greeting, so we remove it.
      if (apiHistory.length > 0 && apiHistory[0].role === 'model') {
        apiHistory.shift();
      }

      // 2. The `chat.sendMessage` method sends the *latest* message, while `ai.chats.create` takes the *preceding* history.
      // So, we pop the last user message from the history to send it separately.
      const lastUserMessage = apiHistory.pop();
      if (!lastUserMessage || lastUserMessage.role !== 'user') {
        // This is a safeguard; in the normal app flow, the last message should always be the user's.
        throw new Error("Invalid history state: The last message must be from the user.");
      }
      
      // 3. Convert our app's message format to the Gemini SDK's `Content` format for the history.
      const chatHistoryForCreate = apiHistory.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      
      const chat = ai.chats.create({
        model: settings.modelName || 'gemini-3-flash-preview',
        history: chatHistoryForCreate,
        config: { systemInstruction: SYSTEM_INSTRUCTION },
      });

      const response = await chat.sendMessage({ message: lastUserMessage.text });
      const responseText = response.text || "线团团这会儿没叼住线头，请老大再说一遍。";
      return extractOptions(responseText);

    } catch (error: any) {
      console.error("Gemini Error:", error);
      const errStr = error.message || JSON.stringify(error);
      if (errStr.includes("RESOURCE_EXHAUSTED") || errStr.includes("429")) {
        throw new Error("Gemini Error: 线团团累了，能源石（API Key）配额已耗尽，请稍后再试或检查您的计划。");
      }
      if (errStr.includes("GEMINI_API_KEY_MISSING") || errStr.includes("invalid api key") || errStr.includes("Requested entity was not found")) {
        throw new Error("Gemini Error: 老大，能源石（API Key）似乎失效或未配置。请在“线团元丹”中重新选择灵石。");
      }
      throw new Error(`Gemini Error: 线团遇到了乱麻: ${errStr}`);
    }
  } 

  if (settings.provider === 'openai') {
    if (!settings.apiKey) throw new Error("OpenAI-Compatible Error: 老大，没填‘能源密钥’（API Key），线团团动不了。");
    
    let messagesToSend: { role: string; content: string }[];

    if (history.length === 0) {
      // For the initial greeting, if history is empty, send system instruction + a dummy user message
      messagesToSend = [
        { role: 'system', content: SYSTEM_INSTRUCTION },
        { role: 'user', content: 'Hello' } // Dummy user message to trigger a response
      ];
    } else {
      // For subsequent messages, prepend the system instruction to the actual chat history
      messagesToSend = [
        { role: 'system', content: SYSTEM_INSTRUCTION },
        ...history.map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.text
        }))
      ];
    }

    const baseUrl = settings.apiBaseUrl.endsWith('/') ? settings.apiBaseUrl.slice(0, -1) : settings.apiBaseUrl;
    
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify({
          model: settings.modelName,
          messages: messagesToSend, // Use the prepared messagesToSend array
          temperature: 0.7,
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})); // Handle cases where response is not JSON
        const errorMessage = errorData.error?.message || `能源核心故障 (${response.status})`;
        
        if (response.status === 401) {
            throw new Error(`OpenAI-Compatible Error: 能源密钥无效或过期。请检查您的API Key。(${errorMessage})`);
        }
        if (response.status === 404) {
            throw new Error(`OpenAI-Compatible Error: 接入地址或模型名称有误。请检查“线团元丹”中的API地址和模型名称。(${errorMessage})`);
        }
        if (response.status === 429) {
            throw new Error(`OpenAI-Compatible Error: 配额已耗尽或请求过快。请检查您的计划或稍后再试。(${errorMessage})`);
        }
        throw new Error(`OpenAI-Compatible Error: ${errorMessage}`);
      }

      const data = await response.json();
      const responseText = data.choices?.[0]?.message?.content || "线团团这会儿没叼住线头，请老大再说一遍。";
      return extractOptions(responseText);

    } catch (e: any) {
      console.error("OpenAI-Compatible Error:", e);
      if (e.message === 'Failed to fetch') {
        throw new Error("OpenAI-Compatible Error: 无法连接到能源核心。请检查您的网络连接、API地址（Base URL）是否正确，或防火墙/VPN是否阻断了连接。");
      }
      // Re-throw the error with its original message if it's already a specific error,
      // otherwise, wrap generic errors.
      if (e.message.startsWith("OpenAI-Compatible Error:") || e.message.startsWith("Gemini Error:")) {
          throw e;
      }
      throw new Error(`OpenAI-Compatible Error: 线团遇到了乱麻: ${e.message || JSON.stringify(e)}`);
    }
  }
  
  throw new Error("无效的能源核心配置");
};

export const generateOutline = async (templateSections: OutlineSection[], noteCards: NoteCard[], settings: AppSettings): Promise<OutlineSection[]> => {
  const noteCardsContent = noteCards.map(note => `Q: ${note.question}\nA: ${note.answer}`).join('\n\n---\n\n');
  const templateContent = JSON.stringify(templateSections.map(({ id, title }) => ({ id, title, content: "..." })), null, 2);

  const GENERATE_OUTLINE_PROMPT = `
You are an expert content strategist named "线团团". Your task is to populate a given content outline structure using key information from a question-and-answer session.

**The Goal Outline Structure is:**
${templateContent}

**The User's Core Ideas (from Q&A) are:**
${noteCardsContent}

**Your Task:**
1.  Carefully read the user's core ideas.
2.  Fill in the 'content' field for each section in the outline. Use the user's original answers from the Q&A as much as possible, placing the relevant answer(s) into the most appropriate section. You can lightly edit them for flow or combine answers if necessary, but prioritize preserving the user's original phrasing.
3.  The 'id' and 'title' of each section MUST remain exactly the same as in the provided structure.
4.  You MUST return your response as a single, valid JSON object that is an array of sections, matching the goal structure perfectly. Do not include any other text, explanations, or markdown formatting like \`\`\`json.
`;

  if (settings.provider === 'gemini') {
    if (!process.env.API_KEY) throw new Error("GEMINI_API_KEY_MISSING");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const outlineSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                content: { type: Type.STRING },
            },
            required: ['id', 'title', 'content'],
        },
    };

    const response = await ai.models.generateContent({
      model: settings.modelName || 'gemini-3-flash-preview',
      contents: GENERATE_OUTLINE_PROMPT,
      config: {
        responseMimeType: "application/json",
        responseSchema: outlineSchema,
      }
    });

    try {
      const jsonText = response.text.trim();
      const newOutline = JSON.parse(jsonText);
      return newOutline;
    } catch (e) {
      console.error("Failed to parse outline JSON from Gemini:", e);
      throw new Error("线团团理线时打结了，无法解析生成的大纲结构。");
    }
  }

  if (settings.provider === 'openai') {
     if (!settings.apiKey) throw new Error("OpenAI-Compatible Error: 老大，没填‘能源密钥’（API Key），线团团动不了。");
     const baseUrl = settings.apiBaseUrl.endsWith('/') ? settings.apiBaseUrl.slice(0, -1) : settings.apiBaseUrl;

    try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.apiKey}`
            },
            body: JSON.stringify({
            model: settings.modelName,
            messages: [{ role: 'user', content: GENERATE_OUTLINE_PROMPT }],
            temperature: 0.5,
            response_format: { type: "json_object" },
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI-Compatible Error: 能源核心生成大纲失败 (${response.status}) - ${errorText}`);
        }
        
        const data = await response.json();
        const responseText = data.choices?.[0]?.message?.content;

        if (!responseText) {
            throw new Error("线团团理线时打结了，未能收到有效的大纲结构。");
        }

        const newOutline = JSON.parse(responseText);
        const foundArray = Object.values(newOutline).find(val => Array.isArray(val));
        if (foundArray && Array.isArray(foundArray)) {
            return foundArray as OutlineSection[];
        }
        return newOutline as OutlineSection[];

    } catch (e: any) {
        console.error("Failed to parse outline JSON from OpenAI-compatible API:", e);
        throw new Error(`线团团理线时打结了: ${e.message}`);
    }
  }

  throw new Error("无效的能源核心配置");
};

export const summarizeForNoteCard = async (question: string, answer: string, settings: AppSettings): Promise<{ qSummary: string, aSummary: string }> => {
  const SUMMARY_PROMPT = `
You are a summarization expert. Your task is to provide a very concise summary for a given question and its corresponding answer.
The user is a creator trying to organize their thoughts. The summaries should capture the essence of the exchange for quick reference.

**Question:**
"""
${question}
"""

**Answer:**
"""
${answer}
"""

**Your Task:**
Respond with a single, valid JSON object with two keys: "questionSummary" and "answerSummary".
- "questionSummary": A very short summary of the question's core intent (e.g., "写作目的", "目标用户").
- "answerSummary": A very short summary of the key information in the answer (e.g., "帮助初学者建立自信", "一篇关于个人成长的博客文章").
- The summaries should be in Chinese.
- Do not include any other text, explanations, or markdown formatting like \`\`\`json.
`;

  if (settings.provider === 'gemini') {
      if (!process.env.API_KEY) throw new Error("GEMINI_API_KEY_MISSING");
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const summarySchema = {
          type: Type.OBJECT,
          properties: {
              questionSummary: { type: Type.STRING },
              answerSummary: { type: Type.STRING },
          },
          required: ['questionSummary', 'answerSummary'],
      };
      const response = await ai.models.generateContent({
          model: settings.modelName || 'gemini-3-flash-preview',
          contents: SUMMARY_PROMPT,
          config: {
              responseMimeType: "application/json",
              responseSchema: summarySchema,
          }
      });
      try {
          const jsonText = response.text.trim();
          const summary = JSON.parse(jsonText);
          return { qSummary: summary.questionSummary, aSummary: summary.answerSummary };
      } catch (e) {
          console.error("Failed to parse summary JSON from Gemini:", e);
          throw new Error("线团团总结卡片时打结了。");
      }
  }

  if (settings.provider === 'openai') {
      if (!settings.apiKey) throw new Error("OpenAI-Compatible Error: 老大，没填‘能源密钥’（API Key），线团团动不了。");
      const baseUrl = settings.apiBaseUrl.endsWith('/') ? settings.apiBaseUrl.slice(0, -1) : settings.apiBaseUrl;
      try {
          const response = await fetch(`${baseUrl}/chat/completions`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${settings.apiKey}`
              },
              body: JSON.stringify({
                  model: settings.modelName,
                  messages: [{ role: 'user', content: SUMMARY_PROMPT }],
                  temperature: 0.2,
                  response_format: { type: "json_object" },
              })
          });
          if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`OpenAI-Compatible Error: 能源核心总结卡片失败 (${response.status}) - ${errorText}`);
          }
          const data = await response.json();
          const responseText = data.choices?.[0]?.message?.content;
          if (!responseText) throw new Error("线团团总结卡片时未能收到有效回应。");
          const summary = JSON.parse(responseText);
          return { qSummary: summary.questionSummary, aSummary: summary.answerSummary };
      } catch (e: any) {
          console.error("Failed to parse summary JSON from OpenAI-compatible API:", e);
          throw new Error(`线团团总结卡片时打结了: ${e.message}`);
      }
  }

  throw new Error("无效的能源核心配置");
};


export const startSession = async (settings: AppSettings): Promise<{ text: string; options?: string[] }> => {
  // For the initial greeting, the `SYSTEM_INSTRUCTION` will drive the model's first response.
  // We pass an empty message and an empty history `[]`. The `sendMessageToModel`'s `message`
  // parameter is effectively ignored when history is empty, and the model generates
  // a response based purely on the `SYSTEM_INSTRUCTION`.
  return sendMessageToModel("", settings, []); 
};