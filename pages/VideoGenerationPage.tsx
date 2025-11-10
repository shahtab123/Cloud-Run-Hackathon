import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GoogleGenAI } from "@google/genai";
import { useProject } from '../contexts/ProjectContext';
import Button from '../components/Button';
import Card from '../components/Card';
import Textarea from '../components/Textarea';
import { ArrowLeftIcon } from '../components/icons/ArrowLeftIcon';
import { UploadIcon } from '../components/icons/UploadIcon';
import { DownloadIcon } from '../components/icons/DownloadIcon';
import { SaveIcon } from '../components/icons/SaveIcon';
import { FilmIcon } from '../components/icons/FilmIcon';
import { RedoIcon } from '../components/icons/RedoIcon';
import { CheckIcon } from '../components/icons/CheckIcon';
import { TrashIcon } from '../components/icons/TrashIcon';

let ai: any = null;
const getAiClient = () => {
    if (!ai) ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    return ai;
};

const loadingMessages = [
    'Crafting your cinematic vision...',
    'AI is animating the scenes...',
    'This can take a few minutes, please wait...',
    'Rendering final frames...',
    'Almost there...',
];

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const VideoGenerationPage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const { activeProject, setActiveProjectById, addVideo } = useProject();

    const [prompt, setPrompt] = useState('');
    const [selectedImage, setSelectedImage] = useState<{ data: string; type: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);
    const [generatedVideo, setGeneratedVideo] = useState<{ url: string; data: string } | null>(null);
    const [error, setError] = useState('');
    const [isSaved, setIsSaved] = useState(false);
    const loadingIntervalRef = useRef<number | null>(null);

    useEffect(() => {
        if (projectId && (!activeProject || activeProject.id !== projectId)) {
            setActiveProjectById(projectId);
        }
    }, [projectId, activeProject, setActiveProjectById]);

    useEffect(() => {
        if (isLoading) {
            loadingIntervalRef.current = window.setInterval(() => {
                setLoadingMessage(prev => {
                    const currentIndex = loadingMessages.indexOf(prev);
                    const nextIndex = (currentIndex + 1) % loadingMessages.length;
                    return loadingMessages[nextIndex];
                });
            }, 3000);
        } else if (loadingIntervalRef.current) {
            clearInterval(loadingIntervalRef.current);
            loadingIntervalRef.current = null;
        }
        return () => {
            if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
        };
    }, [isLoading]);

    const handleImageSelect = (imageData: string) => {
        const mimeType = imageData.substring(imageData.indexOf(':') + 1, imageData.indexOf(';'));
        const base64Data = imageData.split(',')[1];
        if (selectedImage?.data === base64Data) {
            setSelectedImage(null); // Deselect
        } else {
            setSelectedImage({ data: base64Data, type: mimeType });
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                const base64String = dataUrl.split(',')[1];
                setSelectedImage({ data: base64String, type: file.type });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerate = async () => {
        setIsLoading(true);
        setError('');
        setGeneratedVideo(null);
        setIsSaved(false);
        setLoadingMessage(loadingMessages[0]);

        try {
            if (typeof (window as any).aistudio !== 'undefined' && !(await (window as any).aistudio.hasSelectedApiKey())) {
                await (window as any).aistudio.openSelectKey();
            }

            const client = getAiClient();
            const generationConfig = {
                model: 'veo-3.1-fast-generate-preview',
                prompt,
                config: { numberOfVideos: 1 },
                ...(selectedImage && { image: { imageBytes: selectedImage.data, mimeType: selectedImage.type } })
            };

            let operation = await client.models.generateVideos(generationConfig);
            
            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                operation = await client.operations.getVideosOperation({ operation: operation });
            }

            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (!downloadLink) throw new Error("Video generation failed to produce a valid link.");

            const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
            if (!videoResponse.ok) {
                const errorBody = await videoResponse.text();
                console.error("Video download failed:", errorBody);
                if (videoResponse.status === 404 || errorBody.includes("Requested entity was not found")) {
                   throw new Error("Your API Key seems to be invalid or lacks permissions for the Veo model. Please select a valid API Key.");
                }
                throw new Error(`Failed to download the generated video. Status: ${videoResponse.status}`);
           }

            const videoBlob = await videoResponse.blob();
            const videoDataUrl = await blobToBase64(videoBlob);
            const videoUrl = URL.createObjectURL(videoBlob);
            setGeneratedVideo({ url: videoUrl, data: videoDataUrl });

        } catch (err) {
            console.error("Error generating video:", err);
            let errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            if (errorMessage.includes("Requested entity was not found")) {
                errorMessage = "Your API Key seems to be invalid or lacks permissions for the Veo model. Please select a valid API Key.";
           }
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSaveVideo = () => {
        if (!generatedVideo || !projectId) return;
        addVideo(projectId, {
            data: generatedVideo.data,
            prompt,
            sourceImage: selectedImage ? `data:${selectedImage.type};base64,${selectedImage.data}` : undefined,
        });
        setIsSaved(true);
    };

    const handleDownloadVideo = () => {
        if (!generatedVideo) return;
        const link = document.createElement('a');
        link.href = generatedVideo.url;
        link.download = `ai-studio-video-${Date.now()}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const isGenerateDisabled = !prompt.trim() || isLoading;

    return (
        <div className="p-4 md:p-8 animate-fade-in-up">
            <header className="flex items-center mb-8">
                <Button variant="secondary" onClick={() => navigate(`/project/${projectId}`)} className="mr-4 !px-4 py-2">
                    <ArrowLeftIcon className="w-6 h-6" />
                </Button>
                <h1 className="text-4xl font-bold text-gray-800">Video Generation</h1>
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-1 space-y-6 sticky top-8">
                    <Card className="p-6">
                        <h2 className="text-xl font-bold mb-4">1. Source Image (Optional)</h2>
                        
                        {/* Preview for custom uploaded image */}
                        {selectedImage && !activeProject?.images.some(img => img.data.split(',')[1] === selectedImage.data) && (
                            <div className="mb-4 animate-fade-in">
                                <p className="text-sm font-semibold text-gray-700 mb-2">Selected Custom Image:</p>
                                <div 
                                    className="border-4 border-red-500 rounded-md p-1 relative group cursor-pointer"
                                    onClick={() => setSelectedImage(null)}
                                >
                                    <img
                                        src={`data:${selectedImage.type};base64,${selectedImage.data}`}
                                        alt="Custom uploaded image"
                                        className="w-full h-auto object-cover rounded-sm"
                                    />
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <TrashIcon className="w-8 h-8 text-white"/>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeProject && activeProject.images.length > 0 ? (
                            <>
                                <p className="text-sm font-semibold text-gray-700 mb-2">Select from Project Images:</p>
                                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-2">
                                    {activeProject.images.map(img => (
                                        <img 
                                            key={img.id}
                                            src={img.data}
                                            alt="Project image"
                                            onClick={() => handleImageSelect(img.data)}
                                            className={`w-full h-full object-cover rounded-md cursor-pointer border-4 transition-all ${selectedImage?.data === img.data.split(',')[1] ? 'border-red-500' : 'border-transparent hover:border-red-200'}`}
                                        />
                                    ))}
                                </div>
                            </>
                        ) : (
                            !(selectedImage && !activeProject?.images.some(img => img.data.split(',')[1] === selectedImage.data)) &&
                            <p className="text-sm text-gray-500">No project images. You can upload one below.</p>
                        )}
                         <label htmlFor="image-upload" className="mt-4 w-full p-3 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors text-sm font-semibold text-gray-600">
                            <UploadIcon className="w-5 h-5 mr-2"/>
                            Upload Custom Image
                         </label>
                         <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </Card>
                    
                    <Card className="p-6">
                        <h2 className="text-xl font-bold mb-4">2. Text Prompt</h2>
                        <Textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="e.g., A cinematic 3D animation of a neon hologram of a cat driving at top speed." rows={6} />
                    </Card>

                    <Card className="p-6 opacity-60">
                        <h2 className="text-xl font-bold mb-4">3. Settings</h2>
                        <div className="space-y-4">
                            {[ "Resolution", "Duration (seconds)", "Frame Rate", "Style"].map(label => (
                                <div key={label}>
                                   <label className="font-semibold block mb-1 text-gray-600 flex justify-between items-center">{label} <span className="text-xs font-mono bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">Coming Soon</span></label>
                                   <div className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed text-gray-500">Default</div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Button onClick={handleGenerate} disabled={isGenerateDisabled} className="w-full hover-glow text-xl !py-4">
                        {isLoading ? 'Generating Video...' : 'Generate Video'}
                    </Button>
                </div>

                <div className="lg:col-span-2 bg-gray-50/50 border border-gray-200/80 rounded-2xl p-4 min-h-[70vh] flex flex-col items-center justify-center">
                    {isLoading && (
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-500 mx-auto"></div>
                            <p className="mt-6 text-lg font-semibold text-gray-700">{loadingMessage}</p>
                        </div>
                    )}
                    {!isLoading && error && (
                        <div className="text-center p-8">
                           <p className="text-red-500 font-semibold">{error}</p>
                           {error.includes("API Key") && typeof (window as any).aistudio !== 'undefined' && (
                                <Button variant="secondary" className="mt-4" onClick={() => (window as any).aistudio.openSelectKey()}>
                                    Select API Key
                                </Button>
                           )}
                        </div>
                    )}
                    {!isLoading && !error && !generatedVideo && (
                        <div className="text-center text-gray-500">
                            <FilmIcon className="w-16 h-16 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold">Your generated video will appear here</h3>
                            <p className="max-w-sm mx-auto mt-2">Use the controls on the left to describe the video you want to create.</p>
                        </div>
                    )}
                    {!isLoading && !error && generatedVideo && (
                        <div className="w-full animate-fade-in-up">
                            <video src={generatedVideo.url} controls className="w-full rounded-lg shadow-xl" />
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <Button onClick={handleDownloadVideo} variant="secondary" className="!text-base !font-semibold !py-2 !px-4"><DownloadIcon className="w-5 h-5 mr-2" />Download</Button>
                                <Button onClick={handleSaveVideo} disabled={isSaved} variant="secondary" className="!text-base !font-semibold !py-2 !px-4">
                                    {isSaved ? <><CheckIcon className="w-5 h-5 mr-2 text-green-500" />Saved!</> : <><SaveIcon className="w-5 h-5 mr-2" />Save to Project</>}
                                </Button>
                                <Button onClick={handleGenerate} variant="secondary" className="!text-base !font-semibold !py-2 !px-4"><RedoIcon className="w-5 h-5 mr-2" />Regenerate</Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VideoGenerationPage;