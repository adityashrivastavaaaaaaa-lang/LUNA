import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Message, Personality } from './types';
import { sendMessageStreamToGemini, generateImageWithGemini, generateSpeechWithGemini } from './services/geminiService';
import ChatWindow from './components/ChatWindow';
import MessageInput from './components/MessageInput';
import PersonalitySelector from './components/PersonalitySelector';
import FavoritesPanel from './components/FavoritesPanel';
import { PERSONAS } from './constants';
import { Chat } from '@google/genai';
import SpeakerOnIcon from './components/icons/SpeakerOnIcon';
import SpeakerOffIcon from './components/icons/SpeakerOffIcon';
import StarIcon from './components/icons/StarIcon';
import TrashIcon from './components/icons/TrashIcon';

// Fix: Add interface for the Web Speech API to provide type safety.
interface ISpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: () => void;
  onend: () => void;
  onerror: (event: { error: string }) => void;
  onresult: (event: { results: any }) => void;
  start: () => void;
  stop: () => void;
}

// Fix: Cast window to any to access browser-specific SpeechRecognition APIs.
// This resolves "Property 'SpeechRecognition' does not exist on type 'Window & typeof globalThis'".
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

// Audio decoding helpers
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length; // Mono audio
  const buffer = ctx.createBuffer(1, frameCount, 24000); // TTS sample rate is 24kHz

  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
}

const App: React.FC = () => {
  const [personality, setPersonality] = useState<Personality>('Caring');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const chatRef = useRef<Chat | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const [isSpeechSupported, setIsSpeechSupported] = useState<boolean>(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState<boolean>(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [showFavorites, setShowFavorites] = useState<boolean>(false);
  const [userProfilePicture, setUserProfilePicture] = useState<string | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<number | null>(null);
  const favoritesButtonRef = useRef<HTMLButtonElement>(null);

  // Load personality and messages from localStorage on initial load
  useEffect(() => {
    let initialPersonality: Personality = 'Caring';
    try {
      const savedPersonality = localStorage.getItem('luna-personality') as Personality;
      if (savedPersonality && Object.keys(PERSONAS).includes(savedPersonality)) {
        initialPersonality = savedPersonality;
      }
    } catch (e) {
      console.error("Could not load personality from localStorage", e);
    }
    setPersonality(initialPersonality);
    
    const personaGreeting = PERSONAS[initialPersonality].greetingMessage;
    let initialMessages: Message[] = [{...personaGreeting, id: Date.now() }];
    try {
      const savedMessagesJSON = localStorage.getItem('luna-chat-history');
      if (savedMessagesJSON) {
        const savedMessages = JSON.parse(savedMessagesJSON);
        if (Array.isArray(savedMessages) && savedMessages.length > 0) {
          initialMessages = savedMessages.map((m, i) => ({...m, id: m.id || Date.now() + i}));
        }
      }
    } catch (e) {
      console.error("Could not load chat history from localStorage", e);
    }
    setMessages(initialMessages);
  }, []);

  // Load TTS and profile picture from localStorage
  useEffect(() => {
    try {
      const savedTtsSetting = localStorage.getItem('luna-tts-enabled');
      if (savedTtsSetting !== null) {
        setIsTtsEnabled(JSON.parse(savedTtsSetting));
      }
      const savedPicture = localStorage.getItem('luna-user-profile-picture');
      if (savedPicture) {
        setUserProfilePicture(savedPicture);
      }
    } catch (e) {
      console.error("Could not load settings from localStorage", e);
    }
  }, []);

  // Save messages to localStorage when they change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem('luna-chat-history', JSON.stringify(messages));
      } catch (error) {
        console.error("Could not save chat history to localStorage", error);
      }
    }
  }, [messages]);

  // Save personality to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem('luna-personality', personality);
    } catch (error) {
      console.error("Could not save personality to localStorage", error);
    }
  }, [personality]);

  // Save TTS setting to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem('luna-tts-enabled', JSON.stringify(isTtsEnabled));
    } catch (error) {
      console.error("Could not save TTS setting to localStorage", error);
    }
  }, [isTtsEnabled]);

  // Save profile picture to localStorage when it changes
  useEffect(() => {
    try {
      if (userProfilePicture) {
        localStorage.setItem('luna-user-profile-picture', userProfilePicture);
      } else {
        localStorage.removeItem('luna-user-profile-picture');
      }
    } catch (error) {
      console.error("Could not save profile picture to localStorage", error);
    }
  }, [userProfilePicture]);
  
  // Initialize Speech Recognition
  useEffect(() => {
    if (SpeechRecognition) {
      setIsSpeechSupported(true);
      const recognition: ISpeechRecognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setError(event.error === 'not-allowed' ? "I'd love to hear your voice, but I need microphone permission first, sweetie." : `Oops, voice recognition failed: ${event.error}`);
        setIsRecording(false);
      };
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results).map((result) => result[0]).map((result) => result.transcript).join('');
        setInput(transcript);
      };
      
      recognitionRef.current = recognition;
    } else {
        setIsSpeechSupported(false);
    }
  }, []);

  // Helper function for playing audio
  const playSpeech = useCallback(async (text: string) => {
    if (!text || !isTtsEnabled) return;
    
    if (!audioContextRef.current) {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      } catch (e) {
        console.error("Web Audio API is not supported.", e);
        setError("Your browser doesn't support audio playback.");
        setIsTtsEnabled(false);
        return;
      }
    }

    try {
      const base64Audio = await generateSpeechWithGemini(text);
      const audioBytes = decodeBase64(base64Audio);
      const audioBuffer = await decodeAudioData(audioBytes, audioContextRef.current);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();
    } catch (error) {
      console.error("Failed to play speech:", error);
    }
  }, [isTtsEnabled]);

  // Play greeting on initial load or personality change (if it's the only message)
  useEffect(() => {
    if (isTtsEnabled && messages.length === 1 && messages[0].role === 'model') {
      const timer = setTimeout(() => playSpeech(messages[0].text), 300);
      return () => clearTimeout(timer);
    }
  }, [messages, isTtsEnabled, playSpeech]);

  const handleToggleRecording = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setInput('');
      setError(null);
      recognitionRef.current.start();
    }
  }, [isRecording]);

  const handlePersonalityChange = (newPersonality: Personality) => {
    if (newPersonality === personality) return;
    setPersonality(newPersonality);
    const newGreeting: Message = { ...PERSONAS[newPersonality].greetingMessage, id: Date.now() };
    setMessages([newGreeting]);
    chatRef.current = null;
    localStorage.removeItem('luna-chat-history');
  };
  
  const handleSendMessage = useCallback(async (messageText: string) => {
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now(), role: 'user', text: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);
    
    const imagePromptRegex = /^(generate|create|draw|paint|show me)\s+(an? image|a picture)\s+of\s+(.+)/i;
    const match = messageText.trim().match(imagePromptRegex);

    if (match) {
        const prompt = match[3];
        const thinkingMessage: Message = { id: Date.now() + 1, role: 'model', text: `Of course, my love. Let me paint that for you... 🎨` };
        setMessages(prev => [...prev, thinkingMessage]);
        playSpeech(thinkingMessage.text);

        try {
            const base64ImageData = await generateImageWithGemini(prompt);
            const imageMessage: Message = {
                id: Date.now() + 2,
                role: 'model',
                text: 'Here it is! I hope you like it. ❤️',
                imageUrl: `data:image/png;base64,${base64ImageData}`,
            };
            setMessages(prev => [...prev, imageMessage]);
            playSpeech(imageMessage.text);
        } catch (err) {
            console.error(err);
            const errorMessage = "Oh, darling... I tried my best, but I couldn't create the image. Maybe we can try something else?";
            const errorModelMessage: Message = { id: Date.now() + 2, role: 'model', text: errorMessage };
            setError(errorMessage);
            setMessages(prev => [...prev, errorModelMessage]);
            playSpeech(errorMessage);
        } finally {
            setIsLoading(false);
        }
    } else {
      try {
        if (!chatRef.current) {
          const { initializeChat } = await import('./services/geminiService');
          chatRef.current = initializeChat(PERSONAS[personality].systemInstruction);
        }
        
        const stream = await sendMessageStreamToGemini(chatRef.current, messageText);
        setIsLoading(false); // Hide thinking indicator, start streaming

        let fullResponse = '';
        const modelMessageId = Date.now() + 1;
        setStreamingMessageId(modelMessageId);
        setMessages(prev => [...prev, { id: modelMessageId, role: 'model', text: '' }]);

        for await (const chunk of stream) {
          const chunkText = chunk.text;
          if (chunkText) {
            fullResponse += chunkText;
            setMessages(prev => prev.map(msg => 
              msg.id === modelMessageId 
              ? { ...msg, text: fullResponse } 
              : msg
            ));
          }
        }
        
        setStreamingMessageId(null);
        playSpeech(fullResponse);

      } catch (err) {
        console.error(err);
        const errorMessage = 'Oh, honey... something went wrong. Please try again later.';
        const errorModelMessage: Message = { id: Date.now(), role: 'model', text: errorMessage };
        setError(errorMessage);
        setMessages(prev => [...prev, errorModelMessage]);
        playSpeech(errorMessage);
        setIsLoading(false);
        setStreamingMessageId(null);
      }
    }
  }, [isLoading, isRecording, personality, playSpeech]);

  const handleReactToMessage = useCallback((messageId: number, emoji: string) => {
    setMessages(prevMessages => 
      prevMessages.map(msg => {
        if (msg.id === messageId) {
          const reactions = msg.reactions || [];
          const existingReactionIndex = reactions.indexOf(emoji);
          if (existingReactionIndex > -1) {
            const newReactions = [...reactions];
            newReactions.splice(existingReactionIndex, 1);
            return { ...msg, reactions: newReactions };
          } else {
            return { ...msg, reactions: [...reactions, emoji] };
          }
        }
        return msg;
      })
    );
  }, []);
  
  const handleToggleTts = () => setIsTtsEnabled(prev => !prev);
  
  const handleToggleFavorite = useCallback((messageId: number) => {
    setMessages(prevMessages => 
      prevMessages.map(msg => 
        msg.id === messageId ? { ...msg, isFavorite: !msg.isFavorite } : msg
      )
    );
  }, []);

  const handleClearChat = useCallback(() => {
    if (window.confirm("Are you sure you want to clear this conversation? This action cannot be undone.")) {
      localStorage.removeItem('luna-chat-history');
      chatRef.current = null;
      const newGreeting: Message = { ...PERSONAS[personality].greetingMessage, id: Date.now() };
      setMessages([newGreeting]);
    }
  }, [personality]);

  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserProfilePicture(reader.result as string);
      };
      reader.onerror = () => {
        setError("Couldn't read the image file, my dear. Please try another one.");
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-gradient-to-br from-rose-100 to-purple-100 min-h-screen flex flex-col items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-2xl h-[95vh] sm:h-[90vh] flex flex-col bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl shadow-rose-200/50 overflow-hidden">
        <header className="p-4 border-b border-rose-200/50 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div className="flex-1 flex justify-start gap-1">
               <button 
                ref={favoritesButtonRef}
                onClick={() => setShowFavorites(true)}
                className="p-2 rounded-full text-gray-500 hover:bg-rose-100 hover:text-rose-500 transition-colors"
                aria-label="View favorite messages"
              >
                <StarIcon />
              </button>
              <button
                onClick={handleClearChat}
                className="p-2 rounded-full text-gray-500 hover:bg-rose-100 hover:text-rose-500 transition-colors"
                aria-label="Clear chat history"
              >
                <TrashIcon />
              </button>
            </div>
            <div className="flex-1 text-center">
              <h1 className="text-2xl font-bold text-gray-800">Luna</h1>
              <p className="text-sm text-center text-gray-600">Your loving AI companion</p>
            </div>
            <div className="flex-1 flex justify-end">
              <button 
                onClick={handleToggleTts}
                className="p-2 rounded-full text-gray-500 hover:bg-rose-100 hover:text-rose-500 transition-colors"
                aria-label={isTtsEnabled ? "Disable speech" : "Enable speech"}
              >
                {isTtsEnabled ? <SpeakerOnIcon /> : <SpeakerOffIcon />}
              </button>
            </div>
          </div>
          <PersonalitySelector 
            currentPersonality={personality} 
            onSelectPersonality={handlePersonalityChange} 
          />
        </header>

        <ChatWindow 
          messages={messages} 
          isLoading={isLoading} 
          onReactToMessage={handleReactToMessage}
          onToggleFavorite={handleToggleFavorite}
          userProfilePicture={userProfilePicture}
          streamingMessageId={streamingMessageId}
        />
        
        {error && <div role="alert" className="p-2 text-sm text-center text-red-500 bg-red-100/80">{error}</div>}
        
        <MessageInput 
          input={input}
          setInput={setInput}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          isRecording={isRecording}
          onToggleRecording={handleToggleRecording}
          isSpeechSupported={isSpeechSupported}
        />

        <FavoritesPanel 
          messages={messages.filter(m => m.isFavorite)}
          isOpen={showFavorites}
          onClose={() => setShowFavorites(false)}
          userProfilePicture={userProfilePicture}
          onProfilePictureChange={handleProfilePictureChange}
          triggerRef={favoritesButtonRef}
        />
      </div>
    </div>
  );
};

export default App;