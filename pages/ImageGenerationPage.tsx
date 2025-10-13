import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GoogleGenAI, Modality } from "@google/genai";
import { useProject } from '../contexts/ProjectContext';
import Button from '../components/Button';
import Card from '../components/Card';
import Textarea from '../components/Textarea';
import Dialog from '../components/Dialog';
import { ArrowLeftIcon } from '../components/icons/ArrowLeftIcon';
import { UploadIcon } from '../components/icons/UploadIcon';
import { DownloadIcon } from '../components/icons/DownloadIcon';
import { SaveIcon } from '../components/icons/SaveIcon';
import { ImageIcon } from '../components/icons/ImageIcon';
import { CheckIcon } from '../components/icons/CheckIcon';

let ai: any = null;
const getAiClient = () => {
    if (!ai) ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    return ai;
};

const ImageGenerationPage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const { activeProject, setActiveProjectById, addImage } = useProject();

    const [model, setModel] = useState<'imagen' | 'nano-banana'>('imagen');
    const [prompt, setPrompt] = useState('');
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [uploadedImageType, setUploadedImageType] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [numImages, setNumImages] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [generatedImages, setGeneratedImages] = useState<{data: string}[]>([]);
    const [error, setError] = useState('');
    const [selectedImageModal, setSelectedImageModal] = useState<string | null>(null);
    const [savedImages, setSavedImages] = useState<string[]>([]);

    useEffect(() => {
        if (projectId && (!activeProject || activeProject.id !== projectId)) {
            setActiveProjectById(projectId);
        }
    }, [projectId, activeProject, setActiveProjectById]);

    const scenesOptions = useMemo(() => {
        if (!activeProject) return [];
        const options: { value: string; label: string; description: string }[] = [{ value: '', label: 'Select a scene (optional)', description: '' }];
        activeProject.scenes.forEach((scene, sIndex) => {
            options.push({ value: `s_${scene.id}`, label: `Scene ${sIndex + 1}`, description: scene.description });
            scene.subscenes.forEach((sub, subIndex) => {
                options.push({ value: `sub_${scene.id}_${sub.id}`, label: `  - Subscene ${sIndex + 1}.${subIndex + 1}`, description: sub.description });
            });
        });
        return options;
    }, [activeProject]);

    const handleSceneSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedValue = e.target.value;
        if (!selectedValue) {
            setPrompt('');
            return;
        }
        const selectedOption = scenesOptions.find(opt => opt.value === selectedValue);
        if (selectedOption) {
            setPrompt(selectedOption.description);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = (reader.result as string).split(',')[1];
                setUploadedImage(base64String);
                setUploadedImageType(file.type);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerate = async () => {
        setIsLoading(true);
        setError('');
        setGeneratedImages([]);
        setSavedImages([]);
        const client = getAiClient();
        try {
            if (model === 'imagen') {
                const response = await client.models.generateImages({
                    model: 'imagen-4.0-generate-001',
                    prompt: prompt,
                    config: {
                      numberOfImages: numImages,
                      outputMimeType: 'image/jpeg',
                      aspectRatio: aspectRatio,
                    },
                });
                setGeneratedImages(response.generatedImages.map(img => ({data: `data:image/jpeg;base64,${img.image.imageBytes}`})));
            } else { // nano-banana
                if (!uploadedImage || !uploadedImageType) {
                    setError("Please upload an image for the Nano Banana model.");
                    return;
                }
                const response = await client.models.generateContent({
                  model: 'gemini-2.5-flash-image',
                  contents: {
                    parts: [
                      { inlineData: { data: uploadedImage, mimeType: uploadedImageType } },
                      { text: prompt },
                    ],
                  },
                  config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
                });

                const imageParts = response.candidates[0].content.parts.filter(part => part.inlineData);
                if (imageParts.length > 0) {
                    const base64Data = imageParts[0].inlineData.data;
                    const mimeType = imageParts[0].inlineData.mimeType;
                    setGeneratedImages([{data: `data:${mimeType};base64,${base64Data}`}]);
                } else {
                    setError("The model did not return an image. Please try a different prompt.");
                }
            }
        } catch (err) {
            console.error("Error generating images:", err);
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSaveImage = (imageData: string) => {
        if (savedImages.includes(imageData) || !projectId) return;
        
        addImage(projectId, { 
            data: imageData, 
            prompt, 
            model: model === 'imagen' ? 'imagen-4.0-generate-001' : 'gemini-2.5-flash-image'
        });
        setSavedImages(prev => [...prev, imageData]);
    };

    const handleDownloadImage = (imageData: string) => {
        const link = document.createElement('a');
        link.href = imageData;
        link.download = `ai-studio-image-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const isGenerateDisabled = (model === 'nano-banana' && !uploadedImage) || !prompt.trim() || isLoading;

    return (
        <div className="p-4 md:p-8 animate-fade-in-up">
            <header className="flex items-center mb-8">
                <Button variant="secondary" onClick={() => navigate(`/project/${projectId}`)} className="mr-4 !px-4 py-2">
                    <ArrowLeftIcon className="w-6 h-6" />
                </Button>
                <h1 className="text-4xl font-bold text-gray-800">Image Generation</h1>
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-1 space-y-6 sticky top-8">
                    <Card className="p-6">
                        <h2 className="text-xl font-bold mb-4">1. Select Model</h2>
                        <div className="flex space-x-4">
                            <button onClick={() => setModel('imagen')} className={`w-full p-4 rounded-lg text-center font-semibold border-2 transition-all ${model === 'imagen' ? 'bg-red-50 border-red-500 text-red-700 shadow-inner' : 'bg-gray-50 hover:border-gray-300'}`}>Imagen</button>
                            <button onClick={() => setModel('nano-banana')} className={`w-full p-4 rounded-lg text-center font-semibold border-2 transition-all ${model === 'nano-banana' ? 'bg-red-50 border-red-500 text-red-700 shadow-inner' : 'bg-gray-50 hover:border-gray-300'}`}>Nano Banana</button>
                        </div>
                    </Card>

                    {model === 'nano-banana' && (
                        <Card className="p-6 animate-fade-in">
                             <h2 className="text-xl font-bold mb-4">2. Upload Image</h2>
                             <label htmlFor="image-upload" className="w-full h-40 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                                {uploadedImage ? (
                                    <img src={`data:${uploadedImageType};base64,${uploadedImage}`} alt="Uploaded preview" className="max-h-full max-w-full rounded" />
                                ) : (
                                    <>
                                        <UploadIcon className="w-8 h-8 text-gray-400 mb-2"/>
                                        <p className="text-gray-600">Click to upload image</p>
                                    </>
                                )}
                             </label>
                             <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </Card>
                    )}
                    
                    <Card className="p-6">
                        <h2 className="text-xl font-bold mb-4">{model === 'nano-banana' ? '3. Describe Edits' : '2. Write Prompt'}</h2>
                        <select onChange={handleSceneSelect} className="w-full p-2 mb-3 border border-gray-300 rounded-md bg-white">
                            {scenesOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                        <Textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={model === 'imagen' ? 'e.g., A robot holding a red skateboard.' : 'e.g., Add a party hat to the character.'} rows={6} />
                    </Card>

                     <Card className="p-6">
                        <h2 className="text-xl font-bold mb-4">{model === 'nano-banana' ? '4. Generate' : '3. Settings & Generation'}</h2>
                        {model === 'imagen' && (
                          <div className="space-y-4 mb-6">
                            <div>
                               <label className="font-semibold block mb-2">Aspect Ratio</label>
                               <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white">
                                   {["1:1", "16:9", "9:16", "4:3", "3:4"].map(r => <option key={r} value={r}>{r}</option>)}
                               </select>
                            </div>
                            <div>
                                <label className="font-semibold block mb-2">Number of Images (1-4)</label>
                                <input type="range" min="1" max="4" value={numImages} onChange={e => setNumImages(parseInt(e.target.value))} className="w-full" />
                                <div className="text-center font-bold text-red-600">{numImages}</div>
                            </div>
                          </div>
                        )}
                        <Button onClick={handleGenerate} disabled={isGenerateDisabled} className="w-full hover-glow">
                            {isLoading ? 'Generating...' : 'Generate'}
                        </Button>
                    </Card>
                </div>

                <div className="lg:col-span-2 bg-gray-50/50 border border-gray-200/80 rounded-2xl p-4 min-h-[70vh] flex items-center justify-center">
                    {isLoading && <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-500"></div>}
                    {!isLoading && error && <p className="text-center text-red-500 p-8">{error}</p>}
                    {!isLoading && !error && generatedImages.length === 0 && (
                        <div className="text-center text-gray-500">
                            <ImageIcon className="w-16 h-16 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold">Your generated images will appear here</h3>
                        </div>
                    )}
                    {!isLoading && !error && generatedImages.length > 0 && (
                        <div className={`grid gap-4 w-full ${generatedImages.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {generatedImages.map((image, index) => (
                                <div key={index} className="group relative rounded-lg overflow-hidden shadow-lg">
                                    <img src={image.data} alt={`Generated image ${index + 1}`} className="w-full h-full object-cover cursor-pointer" onClick={() => setSelectedImageModal(image.data)} />
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button onClick={() => handleDownloadImage(image.data)} variant="secondary" className="!px-3 !py-1.5 !text-sm"><DownloadIcon className="w-4 h-4" /></Button>
                                        <Button onClick={() => handleSaveImage(image.data)} disabled={savedImages.includes(image.data)} variant="secondary" className="!px-3 !py-1.5 !text-sm">
                                            {savedImages.includes(image.data) ? <CheckIcon className="w-4 h-4 text-green-500"/> : <SaveIcon className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <Dialog isOpen={!!selectedImageModal} onClose={() => setSelectedImageModal(null)}>
                <img src={selectedImageModal!} alt="Generated image zoomed" className="w-full h-auto rounded-lg" />
            </Dialog>
        </div>
    );
};

export default ImageGenerationPage;