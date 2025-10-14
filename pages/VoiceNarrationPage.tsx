import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GoogleGenAI, Modality } from "@google/genai";
import { useProject } from '../contexts/ProjectContext';
import Button from '../components/Button';
import Card from '../components/Card';
import Textarea from '../components/Textarea';
import { ArrowLeftIcon } from '../components/icons/ArrowLeftIcon';
import { DownloadIcon } from '../components/icons/DownloadIcon';
import { SaveIcon } from '../components/icons/SaveIcon';
import { RedoIcon } from '../components/icons/RedoIcon';
import { CheckIcon } from '../components/icons/CheckIcon';
import { WaveformIcon } from '../components/icons/WaveformIcon';
import Input from '../components/Input';
import { SparklesIcon } from '../components/icons/SparklesIcon';

let ai: any = null;
const getAiClient = () => {
    if (!ai) ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    return ai;
};

const availableVoices = [
  { name: 'Kore', description: 'Female | Clear | US English' },
  { name: 'Puck', description: 'Male | Warm | US English' },
  { name: 'Zephyr', description: 'Male | Calm | US English' },
  { name: 'Charon', description: 'Male | Energetic | UK English (accent)' },
  { name: 'Fenrir', description: 'Male | Deep & Grave | US English' },
];


// --- Audio Utility Functions ---

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function bufferToWav(buffer: AudioBuffer): Blob {
    const numOfChan = buffer.numberOfChannels,
        len = buffer.length * numOfChan * 2 + 44,
        view = new DataView(new ArrayBuffer(len));
    let offset = 0,
        pos = 0;

    const writeString = (s: string) => {
        for (let i = 0; i < s.length; i++) {
            view.setUint8(offset + i, s.charCodeAt(i));
        }
    };

    writeString('RIFF'); offset += 4;
    view.setUint32(offset, 36 + buffer.length * numOfChan * 2, true); offset += 4;
    writeString('WAVE'); offset += 4;
    writeString('fmt '); offset += 4;
    view.setUint32(offset, 16, true); offset += 4;
    view.setUint16(offset, 1, true); offset += 2;
    view.setUint16(offset, numOfChan, true); offset += 2;
    view.setUint32(offset, buffer.sampleRate, true); offset += 4;
    view.setUint32(offset, buffer.sampleRate * 2 * numOfChan, true); offset += 4;
    view.setUint16(offset, numOfChan * 2, true); offset += 2;
    view.setUint16(offset, 16, true); offset += 2;
    writeString('data'); offset += 4;
    view.setUint32(offset, buffer.length * numOfChan * 2, true); offset += 4;

    for (let i = 0; i < buffer.numberOfChannels; i++) {
        const channelData = buffer.getChannelData(i);
        for (let j = 0; j < channelData.length; j++) {
            let sample = Math.max(-1, Math.min(1, channelData[j]));
            view.setInt16(offset + j * numOfChan * 2 + i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        }
    }
    return new Blob([view], { type: 'audio/wav' });
}


const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};


const VoiceNarrationPage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const { activeProject, setActiveProjectById, addNarration } = useProject();

    const [source, setSource] = useState<'custom' | 'scene'>('custom');
    const [script, setScript] = useState('');
    const [voice, setVoice] = useState('Kore');
    const [stylePrompt, setStylePrompt] = useState('clearly and calmly');
    
    const [isLoadingScript, setIsLoadingScript] = useState(false);
    const [isLoadingVoice, setIsLoadingVoice] = useState(false);
    
    const [generatedAudio, setGeneratedAudio] = useState<{ buffer: AudioBuffer; blob: Blob; url: string; } | null>(null);
    const [error, setError] = useState('');
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        if (projectId && (!activeProject || activeProject.id !== projectId)) {
            setActiveProjectById(projectId);
        }
    }, [projectId, activeProject, setActiveProjectById]);

    const scenesOptions = useMemo(() => {
        if (!activeProject) return [];
        const options: { value: string; label: string; description: string }[] = [{ value: '', label: 'Select a scene to generate script', description: '' }];
        activeProject.scenes.forEach((scene, sIndex) => {
            options.push({ value: `s_${scene.id}`, label: `Scene ${sIndex + 1}`, description: scene.description });
            scene.subscenes.forEach((sub, subIndex) => {
                options.push({ value: `sub_${scene.id}_${sub.id}`, label: `  - Subscene ${sIndex + 1}.${subIndex + 1}`, description: sub.description });
            });
        });
        return options;
    }, [activeProject]);

    const handleSceneSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedValue = e.target.value;
        const selectedOption = scenesOptions.find(opt => opt.value === selectedValue);
        if (!selectedOption || !selectedOption.description) {
            setScript('');
            return;
        }

        setIsLoadingScript(true);
        setError('');
        setScript('Generating script...');
        try {
            const prompt = `Write a natural, expressive voiceover narration for this scene that matches its mood, visuals, and context. Scene:\n\n"${selectedOption.description}"`;
            const client = getAiClient();
            const response = await client.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            setScript(response.text.trim());
        } catch (err) {
            console.error("Error generating script:", err);
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
            setScript('');
        } finally {
            setIsLoadingScript(false);
        }
    };

    const handleGenerateVoice = async () => {
        setIsLoadingVoice(true);
        setError('');
        setGeneratedAudio(null);
        setIsSaved(false);

        try {
            const client = getAiClient();
            const prompt = `Say it ${stylePrompt}: ${script}`;

            const response = await client.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: prompt }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
                    },
                },
            });
            
            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!base64Audio) throw new Error("Audio data not found in response.");

            const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
            const decodedBytes = decode(base64Audio);
            const audioBuffer = await decodeAudioData(decodedBytes, outputAudioContext, 24000, 1);
            const wavBlob = bufferToWav(audioBuffer);
            const audioUrl = URL.createObjectURL(wavBlob);

            setGeneratedAudio({ buffer: audioBuffer, blob: wavBlob, url: audioUrl });

        } catch (err) {
            console.error("Error generating voice:", err);
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoadingVoice(false);
        }
    };
    
    const handleSaveVideo = async () => {
        if (!generatedAudio || !projectId) return;
        const dataUrl = await blobToBase64(generatedAudio.blob);
        addNarration(projectId, { data: dataUrl, script, voice });
        setIsSaved(true);
    };

    const handleDownloadVideo = () => {
        if (!generatedAudio) return;
        const link = document.createElement('a');
        link.href = generatedAudio.url;
        link.download = `ai-studio-narration-${Date.now()}.wav`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const isGenerateDisabled = !script.trim() || isLoadingScript || isLoadingVoice;

    return (
        <div className="p-4 md:p-8 animate-fade-in-up">
            <header className="flex items-center mb-8">
                <Button variant="secondary" onClick={() => navigate(`/project/${projectId}`)} className="mr-4 !px-4 py-2">
                    <ArrowLeftIcon className="w-6 h-6" />
                </Button>
                <h1 className="text-4xl font-bold text-gray-800">🎤 Voice Narration</h1>
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-1 space-y-6 sticky top-8">
                    <Card className="p-6">
                        <h2 className="text-xl font-bold mb-4">1. Narration Script</h2>
                         <div className="flex space-x-2 bg-gray-100 rounded-lg p-1 mb-4">
                            <button onClick={() => setSource('custom')} className={`w-full p-2 rounded-md text-center font-semibold transition-all ${source === 'custom' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}>Custom Text</button>
                            <button onClick={() => setSource('scene')} className={`w-full p-2 rounded-md text-center font-semibold transition-all ${source === 'scene' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}>From Scene</button>
                        </div>
                        {source === 'scene' && (
                            <div className="relative">
                                <select onChange={handleSceneSelect} disabled={isLoadingScript} className="w-full p-2 mb-3 border border-gray-300 rounded-md bg-white appearance-none">
                                    {scenesOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                                {isLoadingScript && <div className="absolute top-2.5 right-3 animate-spin rounded-full h-5 w-5 border-b-2 border-red-500"></div>}
                            </div>
                        )}
                        <Textarea value={script} onChange={e => setScript(e.target.value)} placeholder="Enter narration text here..." rows={8} />
                    </Card>

                     <Card className="p-6">
                        <h2 className="text-xl font-bold mb-4">2. Voice Settings</h2>
                        <div className="space-y-4">
                            <div>
                               <label className="font-semibold block mb-2">Voice</label>
                               <select value={voice} onChange={e => setVoice(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white">
                                   {availableVoices.map(v => <option key={v.name} value={v.name}>{v.name} ({v.description})</option>)}
                               </select>
                            </div>
                             <div>
                               <label className="font-semibold block mb-1 text-gray-600 flex justify-between items-center">Language/Accent <span className="text-xs font-mono bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">Coming Soon</span></label>
                               <select disabled className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed text-gray-500">
                                   <option>English (US)</option>
                                   <option>English (UK)</option>
                                   <option>Spanish</option>
                                   <option>Hindi</option>
                               </select>
                            </div>
                             <div>
                               <label className="font-semibold block mb-1 text-gray-600 flex justify-between items-center">Speed <span className="text-xs font-mono bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">Coming Soon</span></label>
                               <select disabled className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed text-gray-500">
                                   <option>Slow</option>
                                   <option>Normal</option>
                                   <option>Fast</option>
                               </select>
                            </div>
                             <div>
                               <label className="font-semibold block mb-1 text-gray-600 flex justify-between items-center">Pitch <span className="text-xs font-mono bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">Coming Soon</span></label>
                               <select disabled className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed text-gray-500">
                                   <option>Low</option>
                                   <option>Normal</option>
                                   <option>High</option>
                               </select>
                            </div>
                             <div>
                               <label className="font-semibold block mb-2">Style Prompt</label>
                               <div className="flex items-center gap-2">
                                <span className="text-gray-500 font-mono">Say it</span>
                                <Input value={stylePrompt} onChange={e => setStylePrompt(e.target.value)} placeholder="e.g., excitedly" className="flex-grow" />
                                <span className="text-gray-500 font-mono">:</span>
                               </div>
                            </div>
                        </div>
                    </Card>
                    <Button onClick={handleGenerateVoice} disabled={isGenerateDisabled} className="w-full hover-glow text-xl !py-4">
                        {isLoadingVoice ? 'Generating...' : 'Generate Voice'}
                    </Button>
                </div>

                <div className="lg:col-span-2 bg-gray-50/50 border border-gray-200/80 rounded-2xl p-4 min-h-[70vh] flex flex-col items-center justify-center">
                    {isLoadingVoice && <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-500"></div>}
                    {!isLoadingVoice && error && <p className="text-center text-red-500 p-8 font-semibold">{error}</p>}
                    {!isLoadingVoice && !error && !generatedAudio && (
                        <div className="text-center text-gray-500">
                            <WaveformIcon className="w-16 h-16 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold">Your generated audio will appear here</h3>
                        </div>
                    )}
                    {!isLoadingVoice && !error && generatedAudio && (
                        <div className="w-full animate-fade-in-up flex flex-col items-center">
                            <div className="w-full max-w-md h-24 flex justify-center items-center gap-1 bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-lg shadow-inner">
                                {Array.from({ length: 50 }).map((_, i) => (
                                    <div key={i} className="w-1 bg-red-400 rounded-full" style={{ height: `${Math.random() * 80 + 10}%` }}></div>
                                ))}
                            </div>
                            <audio src={generatedAudio.url} controls className="w-full max-w-md mt-6" />
                            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-md">
                                <Button onClick={handleDownloadVideo} variant="secondary" className="!text-base !font-semibold !py-2 !px-4"><DownloadIcon className="w-5 h-5 mr-2" />Download</Button>
                                <Button onClick={handleSaveVideo} disabled={isSaved} variant="secondary" className="!text-base !font-semibold !py-2 !px-4">
                                    {isSaved ? <><CheckIcon className="w-5 h-5 mr-2 text-green-500" />Saved!</> : <><SaveIcon className="w-5 h-5 mr-2" />Save</>}
                                </Button>
                                <Button onClick={handleGenerateVoice} variant="secondary" className="!text-base !font-semibold !py-2 !px-4"><RedoIcon className="w-5 h-5 mr-2" />Regenerate</Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VoiceNarrationPage;
