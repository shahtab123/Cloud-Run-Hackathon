import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GoogleGenAI } from "@google/genai";
import { useProject, Scene, Subscene, defaultSystemPrompt } from '../contexts/ProjectContext';
import Button from '../components/Button';
import Input from '../components/Input';
import Dialog from '../components/Dialog';
import Textarea from '../components/Textarea';
import { FolderIcon } from '../components/icons/FolderIcon';
import { CopyIcon } from '../components/icons/CopyIcon';
import { EditIcon } from '../components/icons/EditIcon';
import { PlusIcon } from '../components/icons/PlusIcon';
import { SparklesIcon } from '../components/icons/SparklesIcon';

let ai: any = null;
const getAiClient = () => {
    if (!ai) ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    return ai;
};

const SceneCreatorPage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const { activeProject, setActiveProjectById, addScenes, updateScene, addSubscenes, updateProject } = useProject();

    const [numScenes, setNumScenes] = useState(5);
    const [isLoading, setIsLoading] = useState(false);
    const [systemPrompt, setSystemPrompt] = useState(defaultSystemPrompt);
    const [activeAction, setActiveAction] = useState<{ type: string; id: string } | null>(null);
    const [modalState, setModalState] = useState<{ type: 'customRewrite' | 'createSubscene'; scene: Scene | null, subscene?: Subscene | null }>({ type: 'customRewrite', scene: null });
    const [customPrompt, setCustomPrompt] = useState('');
    const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved');
    const bottomOfChatRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (projectId && (!activeProject || activeProject.id !== projectId)) {
            setActiveProjectById(projectId);
        }
    }, [projectId, activeProject, setActiveProjectById]);

    useEffect(() => {
        if (activeProject) {
            setSystemPrompt(activeProject.systemPrompt || defaultSystemPrompt);
            setSaveState('saving');
            const timer = setTimeout(() => setSaveState('saved'), 1000);
            return () => clearTimeout(timer);
        }
    }, [activeProject]);
    
    useEffect(() => {
        // Debounced save for system prompt
        if (activeProject && systemPrompt !== (activeProject.systemPrompt || defaultSystemPrompt)) {
            const handler = setTimeout(() => {
                updateProject({ ...activeProject, systemPrompt });
            }, 500);

            return () => {
                clearTimeout(handler);
            };
        }
    }, [systemPrompt, activeProject, updateProject]);

    useEffect(() => {
      bottomOfChatRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeProject?.scenes]);

    const handleGenerate = async () => {
        setIsLoading(true);
        try {
            const prompt = `Based on this instruction:\n\n${systemPrompt}\n\nGenerate ${numScenes} unique scene descriptions. Do not number them. Separate each description with '|||'.`;
            const client = getAiClient();
            const response = await client.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            const sceneDescriptions = response.text.split('|||').map(s => s.trim()).filter(Boolean);
            if (projectId) addScenes(projectId, sceneDescriptions);
        } catch (error) {
            console.error("Error generating scenes:", error);
            alert("Failed to generate scenes.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleRewrite = async (scene: Scene, isCustom: boolean = false, subscene: Subscene | null = null) => {
      const actionId = subscene ? subscene.id : scene.id;
      setActiveAction({ type: isCustom ? 'customRewrite' : 'rewrite', id: actionId });
      try {
        let prompt = `Based on this instruction:\n\n${systemPrompt}\n\n`;
        if (isCustom) {
            prompt += `Rewrite the following scene description with this modification: "${customPrompt}"\n\nOriginal Scene: "${subscene ? subscene.description : scene.description}"`;
        } else {
            prompt += `Rewrite the following scene description to be different but on the same theme:\n\nOriginal Scene: "${subscene ? subscene.description : scene.description}"`;
        }
        
        const client = getAiClient();
        const response = await client.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        const newDescription = response.text.trim();
        
        if (projectId) {
          if (subscene) {
            const updatedSubscenes = scene.subscenes.map(s => s.id === subscene.id ? { ...s, description: newDescription } : s);
            updateScene(projectId, scene.id, { ...scene, subscenes: updatedSubscenes });
          } else {
            updateScene(projectId, scene.id, { ...scene, description: newDescription });
          }
        }
      } catch (error) {
        console.error("Error rewriting scene:", error);
        alert("Failed to rewrite scene.");
      } finally {
        setActiveAction(null);
        setModalState({ type: 'customRewrite', scene: null });
        setCustomPrompt('');
      }
    };

    const handleCreateSubscenes = async () => {
      if (!modalState.scene) return;
      setActiveAction({ type: 'subscene', id: modalState.scene.id });
      try {
        const prompt = `Based on this main scene:\n\n"${modalState.scene.description}"\n\nAnd this instruction:\n\n"${systemPrompt}"\n\nCreate a few new scene descriptions from different perspectives or angles based on this idea: "${customPrompt}". Separate each description with '|||'.`;
        const client = getAiClient();
        const response = await client.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        const subsceneDescriptions = response.text.split('|||').map(s => s.trim()).filter(Boolean);
        if (projectId) addSubscenes(projectId, modalState.scene.id, subsceneDescriptions);
      } catch (error) {
        console.error("Error creating subscenes:", error);
        alert("Failed to create subscenes.");
      } finally {
        setActiveAction(null);
        setModalState({ type: 'createSubscene', scene: null });
        setCustomPrompt('');
      }
    };

    if (!activeProject) return <div className="text-center py-10">Loading project...</div>;

    const IconButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, className, ...props }) => (
        <button className={`p-1.5 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`} {...props}>
            {children}
        </button>
    );

    const renderSceneBubble = (scene: Scene, index: number, subscene: Subscene | null = null) => {
      const isSub = !!subscene;
      const content = subscene || scene;
      const isLoadingAction = activeAction?.id === content.id;
      
      return (
        <div key={content.id} className={`w-full flex animate-fade-in-up ${isSub ? 'justify-start' : (index % 2 === 0 ? 'justify-start' : 'justify-end')}`}>
          <div className={`max-w-xl p-4 rounded-2xl shadow-md ${isSub ? 'bg-white border' : 'bg-red-50'}`}>
            <p className="text-gray-800 whitespace-pre-wrap">{content.description}</p>
            <div className="flex items-center justify-end gap-1 mt-2">
              {isLoadingAction && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500 mr-2"></div>}
              <IconButton onClick={() => navigator.clipboard.writeText(content.description)} title="Copy" disabled={isLoadingAction}><CopyIcon className="w-4 h-4" /></IconButton>
              <IconButton onClick={() => handleRewrite(scene, false, subscene)} title="Rewrite" disabled={isLoadingAction}><SparklesIcon className="w-4 h-4" /></IconButton>
              <IconButton onClick={() => setModalState({ type: 'customRewrite', scene, subscene: subscene || undefined })} title="Rewrite with prompt" disabled={isLoadingAction}><EditIcon className="w-4 h-4" /></IconButton>
              {!isSub && <IconButton onClick={() => setModalState({ type: 'createSubscene', scene })} title="Create Subscene" disabled={isLoadingAction}><PlusIcon className="w-4 h-4" /></IconButton>}
            </div>
          </div>
        </div>
      );
    }

    return (
        <div className="flex flex-col h-[90vh]">
            <header className="flex-shrink-0 p-4 border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold">Project: <span className="text-red-600">{activeProject.title}</span></h1>
                        <div className={`text-sm ${saveState === 'saved' ? 'text-green-600' : 'text-gray-500'}`}>
                            {saveState === 'saved' ? '💾 All changes saved' : 'Saving...'}
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button variant="secondary" onClick={() => navigate(`/project/${projectId}`)}>Back to Menu</Button>
                        <Button variant="secondary" onClick={() => navigate('/directory')}><FolderIcon className="w-5 h-5 mr-2 inline-block"/> Directory</Button>
                    </div>
                </div>
            </header>
            
            <main className="flex-grow overflow-y-auto p-4 md:p-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="p-4 rounded-2xl bg-gray-100 border border-gray-200">
                        <Textarea
                            className="w-full p-0 bg-transparent border-0 focus:ring-0 resize-none font-mono text-sm text-gray-600"
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            rows={10}
                        />
                    </div>

                    {activeProject.scenes.map((scene, index) => (
                        <div key={scene.id}>
                            {renderSceneBubble(scene, index)}
                            {scene.subscenes.length > 0 && (
                                <div className="ml-8 mt-4 pl-8 border-l-2 border-red-200 space-y-4">
                                    {scene.subscenes.map(sub => renderSceneBubble(scene, index, sub))}
                                </div>
                            )}
                        </div>
                    ))}
                    <div ref={bottomOfChatRef} />
                </div>
            </main>

            <footer className="flex-shrink-0 p-4 border-t bg-white">
                <div className="max-w-4xl mx-auto">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="flex items-center gap-2">
                            <label htmlFor="num-scenes" className="font-semibold text-gray-700">Scenes:</label>
                            <Input
                                id="num-scenes"
                                type="number"
                                min="1"
                                max="20"
                                value={numScenes}
                                onChange={(e) => setNumScenes(Math.min(20, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                                className="w-20 text-center"
                                disabled={isLoading}
                            />
                        </div>
                        <Button onClick={handleGenerate} disabled={isLoading} className="w-full sm:w-auto">
                            {isLoading ? 'Generating...' : 'Generate Scenes'}
                        </Button>
                    </div>
                </div>
            </footer>
            
            <Dialog isOpen={!!modalState.scene} onClose={() => setModalState({ type: 'customRewrite', scene: null })} title={modalState.type === 'customRewrite' ? 'Rewrite with Custom Prompt' : 'Create Subscenes'}>
                <p className="text-gray-600 mb-4">
                  {modalState.type === 'customRewrite' ? 'Enter a prompt to modify the scene.' : 'Enter a prompt to generate related subscenes.'}
                </p>
                <Textarea 
                    placeholder={modalState.type === 'customRewrite' ? "e.g., make it a rainy night" : "e.g., show a close-up of the evidence"}
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={4}
                    autoFocus
                />
                <Button 
                    className="w-full mt-4" 
                    onClick={() => modalState.type === 'customRewrite' ? handleRewrite(modalState.scene!, true, modalState.subscene || null) : handleCreateSubscenes()}
                    disabled={!customPrompt.trim()}
                >
                    Generate
                </Button>
            </Dialog>
        </div>
    );
};

export default SceneCreatorPage;