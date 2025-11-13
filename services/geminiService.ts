import { GoogleGenAI, Chat, Modality, GenerateContentResponse } from "@google/genai";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export function initializeChat(systemInstruction: string): Chat {
    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config: { systemInstruction },
    });
}

export const sendMessageStreamToGemini = async (chat: Chat, message: string): Promise<AsyncGenerator<GenerateContentResponse>> => {
    try {
        const response = await chat.sendMessageStream({ message });
        return response;
    } catch (error) {
        console.error("Error sending message to Gemini:", error);
        throw new Error("Failed to get response from AI.");
    }
};

export const generateImageWithGemini = async (prompt: string): Promise<string> => {
    try {
        const enhancedPrompt = `A high-quality, artistic image. Prioritize any specified visual styles (e.g., 'photorealistic', 'cartoon', 'oil painting') from the following description: "${prompt}"`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: enhancedPrompt }],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
        throw new Error("No image data found in the response.");

    } catch (error) {
        console.error("Error generating image with Gemini:", error);
        throw new Error("Failed to generate image from AI.");
    }
};

export const generateSpeechWithGemini = async (text: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `Say it in a warm, friendly, and caring tone: ${text}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' }, // A warm, female voice
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error("No audio data found in the TTS response.");
        }
        return base64Audio;
    } catch (error) {
        console.error("Error generating speech with Gemini:", error);
        throw new Error("Failed to generate speech from AI.");
    }
};
