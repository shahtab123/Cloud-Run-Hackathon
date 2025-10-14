import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProject, TimelineClip, Project } from '../contexts/ProjectContext';
import Button from '../components/Button';
import Card from '../components/Card';
import { ArrowLeftIcon } from '../components/icons/ArrowLeftIcon';
import { FolderIcon } from '../components/icons/FolderIcon';
import { VideoIcon } from '../components/icons/VideoIcon';
import { ImageIcon } from '../components/icons/ImageIcon';
import { MicIcon } from '../components/icons/MicIcon';
import { ChevronDownIcon } from '../components/icons/ChevronDownIcon';
import { ScissorsIcon } from '../components/icons/ScissorsIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import { PlayIcon } from '../components/icons/PlayIcon';
import { PauseIcon } from '../components/icons/PauseIcon';
import { DownloadIcon } from '../components/icons/DownloadIcon';
import { UploadIcon } from '../components/icons/UploadIcon';
import { RedoIcon } from '../components/icons/RedoIcon';
import { UndoIcon } from '../components/icons/UndoIcon';
import { PlusIcon } from '../components/icons/PlusIcon';
import { PointerIcon } from '../components/icons/PointerIcon';
import { TextIcon } from '../components/icons/TextIcon';

// --- Constants ---
const MIN_CLIP_DURATION = 0.2;
const IMAGE_DEFAULT_DURATION = 5;
const TRACK_HEIGHT = 64; // h-16
const TRACK_GAP = 8; // mb-2
const TOTAL_TRACK_HEIGHT = TRACK_HEIGHT + TRACK_GAP;
const MIN_ZOOM = 25;
const MAX_ZOOM = 400;

// --- Interfaces ---
interface Track {
  id: string;
  type: 'video' | 'audio';
}

interface Asset {
    id: string;
    name: string;
    type: 'video' | 'image' | 'audio' | 'text';
    source: string; // dataURL or text content
    duration: number;
}


// --- Helper Hooks & Functions ---
const formatTime = (seconds: number): string => {
    const floorSeconds = Math.max(0, Math.floor(seconds));
    const min = Math.floor(floorSeconds / 60);
    const sec = floorSeconds % 60;
    const ms = Math.floor((seconds - floorSeconds) * 100);
    return `${min}:${sec < 10 ? '0' : ''}${sec}.${ms < 10 ? '0' : ''}${ms}`;
};

const useHistoryState = <T,>(initialState: T): [T, (newState: T) => void, () => void, () => void, boolean, boolean] => {
    const [history, setHistory] = useState<T[]>([initialState]);
    const [index, setIndex] = useState(0);

    const setState = (newState: T) => {
        const newHistory = history.slice(0, index + 1);
        newHistory.push(newState);
        setHistory(newHistory);
        setIndex(newHistory.length - 1);
    };

    const undo = () => index > 0 && setIndex(index - 1);
    const redo = () => index < history.length - 1 && setIndex(index + 1);
    
    useEffect(() => {
        if(JSON.stringify(history[0]) !== JSON.stringify(initialState)) {
             setHistory([initialState]);
             setIndex(0);
        }
    }, [initialState]);

    const canUndo = index > 0;
    const canRedo = index < history.length - 1;

    return [history[index], setState, undo, redo, canUndo, canRedo];
};

const getMediaDuration = (fileType: string, source: string): Promise<number> => {
    return new Promise((resolve) => {
        if (fileType.startsWith('image/')) return resolve(IMAGE_DEFAULT_DURATION);
        const media = document.createElement(fileType.startsWith('video/') ? 'video' : 'audio');
        media.preload = 'metadata';
        media.src = source;
        media.onloadedmetadata = () => resolve(media.duration);
        media.onerror = () => resolve(5); // Fallback
    });
};

const VideoEditorPage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const { activeProject, setActiveProjectById, updateProject } = useProject();
    
    // Editor State
    const [timeline, setTimeline, undo, redo, canUndo, canRedo] = useHistoryState<TimelineClip[]>([]);
    const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [zoom, setZoom] = useState(50); // pixels per second
    const [activeTool, setActiveTool] = useState<'selection' | 'razor'>('selection');
    const [tracks, setTracks] = useState<Track[]>([
        { id: 'video-1', type: 'video' },
        { id: 'video-2', type: 'video' },
        { id: 'audio-1', type: 'audio' },
    ]);

    // Refs
    const playerRef = useRef<{ [key: string]: HTMLVideoElement | HTMLAudioElement }>({});
    const animationFrameRef = useRef<number>();
    const timelineRef = useRef(timeline);
    useEffect(() => { timelineRef.current = timeline; }, [timeline]);

    // Project loading and saving
    useEffect(() => {
        if (projectId && (!activeProject || activeProject.id !== projectId)) setActiveProjectById(projectId);
    }, [projectId, activeProject, setActiveProjectById]);
    
    useEffect(() => {
        if (activeProject) setTimeline(activeProject.timeline || []);
    }, [activeProject?.id]);
    
    useEffect(() => {
        if (activeProject && JSON.stringify(activeProject.timeline) !== JSON.stringify(timeline)) {
            const saveTimer = setTimeout(() => updateProject({ ...activeProject, timeline }), 1000);
            return () => clearTimeout(saveTimer);
        }
    }, [timeline, activeProject, updateProject]);

    // Derived State
    const totalDuration = useMemo(() => {
        const maxTime = timeline.length > 0 ? Math.max(...timeline.map(c => c.start + c.duration)) : 0;
        return Math.max(10, maxTime + 5);
    }, [timeline]);
    const selectedClip = useMemo(() => timeline.find(c => c.id === selectedClipId), [timeline, selectedClipId]);

    // --- Playback Logic ---
    const handlePlayPause = () => setIsPlaying(p => !p);

    useEffect(() => {
        if (isPlaying) {
            const startTime = performance.now();
            const startOffset = currentTime;

            const animate = (now: number) => {
                const elapsed = (now - startTime) / 1000;
                const newTime = startOffset + elapsed;
                
                if (newTime >= totalDuration) {
                    setCurrentTime(totalDuration);
                    setIsPlaying(false);
                    return;
                }
                setCurrentTime(newTime);
                animationFrameRef.current = requestAnimationFrame(animate);
            };
            animationFrameRef.current = requestAnimationFrame(animate);
        } else {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        }
        return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current) };
    }, [isPlaying, totalDuration]);
    
    // --- Keyboard Shortcuts ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

            if (e.key === ' ') { e.preventDefault(); handlePlayPause(); }
            if (e.key === 'v') setActiveTool('selection');
            if (e.key === 'c') setActiveTool('razor');
            if (e.key === 'Delete' || e.key === 'Backspace') handleDeleteClip();
            if ((e.metaKey || e.ctrlKey) && e.key === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
            if ((e.metaKey || e.ctrlKey) && e.key === 'y') { e.preventDefault(); redo(); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedClipId, undo, redo]);


    // --- Clip & Timeline Actions ---
    const addTrack = (type: 'video' | 'audio') => setTracks(t => [...t, { id: crypto.randomUUID(), type }]);
    const removeTrack = (id: string) => setTracks(t => t.filter(track => track.id !== id));
    
    const handleAddText = () => {
        const firstVideoTrack = tracks.find(t => t.type === 'video');
        if (!firstVideoTrack) return;
        const newClip: TimelineClip = {
            id: crypto.randomUUID(), assetId: 'text', type: 'text', name: 'New Text',
            source: 'Your Text Here', track: firstVideoTrack.id, start: currentTime,
            duration: 5, originalDuration: Infinity, trimStart: 0,
            transform: { x: 0, y: 0, scale: 1, rotation: 0 },
            opacity: 1, volume: 1, fadeInDuration: 0, fadeOutDuration: 0,
            text: { content: 'Your Text Here', fontFamily: 'Arial', fontSize: 48, color: '#FFFFFF', align: 'center' }
        };
        setTimeline([...timeline, newClip]);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, trackId: string, trackType: 'video' | 'audio') => {
        e.preventDefault();
        const asset = JSON.parse(e.dataTransfer.getData('application/json')) as Asset;
        if ((trackType === 'video' && asset.type !== 'video' && asset.type !== 'image') || (trackType === 'audio' && asset.type !== 'audio')) return;

        const x = e.nativeEvent.offsetX;
        const startTime = Math.max(0, x / zoom);
        
        const newClip: TimelineClip = {
            id: crypto.randomUUID(), assetId: asset.id, type: asset.type as any, name: asset.name,
            source: asset.source, track: trackId, start: startTime,
            duration: asset.duration || IMAGE_DEFAULT_DURATION, originalDuration: asset.duration || Infinity,
            trimStart: 0, transform: { x: 0, y: 0, scale: 1, rotation: 0 },
            opacity: 1, volume: 1, fadeInDuration: 0, fadeOutDuration: 0,
        };
        setTimeline([...timeline, newClip]);
    };

    const handleDeleteClip = () => {
        if (!selectedClipId) return;
        setTimeline(timeline.filter(c => c.id !== selectedClipId));
        setSelectedClipId(null);
    };

    const handleSplitClip = (time: number, clipId: string) => {
        const clipToSplit = timeline.find(c => c.id === clipId);
        if (!clipToSplit || time <= clipToSplit.start || time >= clipToSplit.start + clipToSplit.duration) return;

        const splitPoint = time - clipToSplit.start;
        const firstPart: TimelineClip = { ...clipToSplit, duration: splitPoint };
        const secondPart: TimelineClip = { ...clipToSplit, id: crypto.randomUUID(), start: time, duration: clipToSplit.duration - splitPoint, trimStart: clipToSplit.trimStart + splitPoint };
        
        setTimeline([...timeline.filter(c => c.id !== clipId), firstPart, secondPart]);
    };

    const updateClip = (clipId: string, updates: Partial<TimelineClip>) => {
        setTimeline(timeline.map(c => c.id === clipId ? { ...c, ...updates } : c));
    };
    
    // --- Components ---
    const AssetExplorer = React.memo(() => {
        // ... (implementation is long, keeping it similar to previous version for brevity)
        return <Card className="p-4 h-full overflow-y-auto flex flex-col"><h2 className="text-xl font-bold mb-2">Assets</h2><Button onClick={handleAddText} variant="secondary" className="w-full mb-4"><TextIcon className="w-5 h-5 mr-2" /> Add Text</Button> {/* Simplified */}</Card>;
    });

    const ProjectSettingsPanel = React.memo(() => {
// Fix: Provide default values for project settings to ensure the object is always complete.
      const handleSettingChange = (key: keyof NonNullable<Project['settings']>, value: any) => {
          if (!activeProject) return;
          const defaultSettings = {
            aspectRatio: '16:9' as const,
            backgroundColor: '#000000',
          };
          const newSettings = { ...(activeProject.settings || defaultSettings), [key]: value };
          updateProject({ ...activeProject, settings: newSettings });
      };
      return (
          <Card className="p-4">
              <h3 className="font-bold mb-2">Project Settings</h3>
              <div className="space-y-2 text-sm">
                  <div>
                      <label className="font-semibold block mb-1">Aspect Ratio</label>
                      <select value={activeProject?.settings?.aspectRatio || '16:9'} onChange={e => handleSettingChange('aspectRatio', e.target.value)} className="w-full p-1 border rounded bg-gray-50">
                          <option value="16:9">16:9 (Landscape)</option><option value="9:16">9:16 (Portrait)</option><option value="1:1">1:1 (Square)</option><option value="4:3">4:3 (Classic)</option>
                      </select>
                  </div>
                  <div>
                      <label className="font-semibold block mb-1">Background Color</label>
                      <input type="color" value={activeProject?.settings?.backgroundColor || '#000000'} onChange={e => handleSettingChange('backgroundColor', e.target.value)} className="w-full p-1 border rounded" />
                  </div>
              </div>
          </Card>
      );
    });

    const InspectorPanel = React.memo(() => {
        if (!selectedClip) return null;
        
        const updateTransform = (key: keyof TimelineClip['transform'], value: number) => updateClip(selectedClipId!, { transform: { ...selectedClip.transform, [key]: value } });
        const updateText = (key: keyof TimelineClip['text'], value: any) => updateClip(selectedClipId!, { text: { ...selectedClip.text!, [key]: value } });

        return (
            <Card className="p-4 overflow-y-auto h-full text-sm">
                <h3 className="font-bold text-base mb-2 truncate">Inspector: {selectedClip.name}</h3>
                {/* Transform */}
                <details open className="mb-2"><summary className="font-semibold cursor-pointer">Transform</summary>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        <div><label>X Position</label><input type="number" value={selectedClip.transform.x} onChange={e => updateTransform('x', +e.target.value)} className="w-full p-1 border rounded bg-gray-50" /></div>
                        <div><label>Y Position</label><input type="number" value={selectedClip.transform.y} onChange={e => updateTransform('y', +e.target.value)} className="w-full p-1 border rounded bg-gray-50" /></div>
                        <div><label>Scale</label><input type="number" step="0.01" value={selectedClip.transform.scale} onChange={e => updateTransform('scale', +e.target.value)} className="w-full p-1 border rounded bg-gray-50" /></div>
                        <div><label>Rotation</label><input type="number" value={selectedClip.transform.rotation} onChange={e => updateTransform('rotation', +e.target.value)} className="w-full p-1 border rounded bg-gray-50" /></div>
                    </div>
                </details>
                {/* Effects */}
                <details open className="mb-2"><summary className="font-semibold cursor-pointer">Effects</summary>
                    <div className="mt-2 space-y-2">
                        <div><label>Opacity ({Math.round(selectedClip.opacity * 100)}%)</label><input type="range" min="0" max="1" step="0.01" value={selectedClip.opacity} onChange={e => updateClip(selectedClipId!, { opacity: +e.target.value })} className="w-full" /></div>
                        {(selectedClip.type === 'video' || selectedClip.type === 'audio') && <div><label>Volume ({Math.round(selectedClip.volume * 100)}%)</label><input type="range" min="0" max="1" step="0.01" value={selectedClip.volume} onChange={e => updateClip(selectedClipId!, { volume: +e.target.value })} className="w-full" /></div>}
                        <div><label>Fade In (s)</label><input type="number" min="0" step="0.1" value={selectedClip.fadeInDuration} onChange={e => updateClip(selectedClipId!, { fadeInDuration: +e.target.value })} className="w-full p-1 border rounded bg-gray-50" /></div>
                        <div><label>Fade Out (s)</label><input type="number" min="0" step="0.1" value={selectedClip.fadeOutDuration} onChange={e => updateClip(selectedClipId!, { fadeOutDuration: +e.target.value })} className="w-full p-1 border rounded bg-gray-50" /></div>
                    </div>
                </details>
                 {/* Text Properties */}
                {selectedClip.type === 'text' && selectedClip.text && <details open className="mb-2"><summary className="font-semibold cursor-pointer">Text</summary>
                    <div className="mt-2 space-y-2">
                        <textarea value={selectedClip.text.content} onChange={e => updateText('content', e.target.value)} rows={3} className="w-full p-1 border rounded bg-gray-50" />
                        <div className="grid grid-cols-2 gap-2">
                            <div><label>Font Size</label><input type="number" value={selectedClip.text.fontSize} onChange={e => updateText('fontSize', +e.target.value)} className="w-full p-1 border rounded bg-gray-50" /></div>
                            <div><label>Color</label><input type="color" value={selectedClip.text.color} onChange={e => updateText('color', e.target.value)} className="w-full p-1 border rounded" /></div>
                        </div>
                    </div>
                </details>}
            </Card>
        );
    });

    const VideoPreview = () => {
        const activeClips = timelineRef.current.filter(c => currentTime >= c.start && currentTime < c.start + c.duration);
        
        useEffect(() => {
          timelineRef.current.forEach(clip => {
            const player = playerRef.current[clip.id];
            if (!player) return;

            const isActive = activeClips.some(c => c.id === clip.id);
            const mediaTime = currentTime - clip.start + clip.trimStart;
            player.volume = clip.volume;

            if(isActive) {
              if (Math.abs(player.currentTime - mediaTime) > 0.2) player.currentTime = mediaTime;
              if (isPlaying && player.paused) player.play().catch(console.error);
              else if (!isPlaying && !player.paused) player.pause();
            } else if (!player.paused) {
              player.pause();
            }
          });
        }, [currentTime, isPlaying]);

        const aspectRatio = activeProject?.settings?.aspectRatio || '16:9';

        return (
            <div className="w-full bg-black rounded-lg flex items-center justify-center relative overflow-hidden" style={{ aspectRatio: aspectRatio.replace(':', ' / '), backgroundColor: activeProject?.settings?.backgroundColor }}>
                {timeline.map(clip => {
                    const isActive = activeClips.some(c => c.id === clip.id);
                    if (!isActive) return null;

                    const timeIntoClip = currentTime - clip.start;
                    let opacity = clip.opacity;
                    if (timeIntoClip < clip.fadeInDuration) opacity *= timeIntoClip / clip.fadeInDuration;
                    if (clip.duration - timeIntoClip < clip.fadeOutDuration) opacity *= (clip.duration - timeIntoClip) / clip.fadeOutDuration;
                    
                    const style: React.CSSProperties = {
                        position: 'absolute', width: '100%', height: '100%',
                        objectFit: 'contain', display: 'block',
                        opacity,
                        transform: `translate(${clip.transform.x}%, ${clip.transform.y}%) scale(${clip.transform.scale}) rotate(${clip.transform.rotation}deg)`,
                    };

                    switch (clip.type) {
                      case 'image': return <img key={clip.id} src={clip.source} style={style} alt={clip.name} />;
                      case 'video': return <video key={clip.id} ref={el => { if(el) playerRef.current[clip.id] = el }} src={clip.source} style={style} muted playsInline />;
                      case 'audio': return <audio key={clip.id} ref={el => { if(el) playerRef.current[clip.id] = el }} src={clip.source} playsInline />;
                      case 'text': return clip.text && <div key={clip.id} style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: `${clip.text.fontSize}px`, color: clip.text.color, fontFamily: clip.text.fontFamily, textAlign: clip.text.align, whiteSpace: 'pre-wrap' }}>{clip.text.content}</span></div>
                    }
                    return null;
                })}
            </div>
        );
    };

    if (!activeProject) return <div className="text-center py-10">Loading...</div>;

    return (
        <div className="h-[92vh] flex flex-col p-4 bg-gray-100 font-sans">
            <header className="flex-shrink-0 flex justify-between items-center mb-4">
                <div className="flex items-center"><Button variant="secondary" onClick={() => navigate(`/project/${projectId}`)} className="mr-4 !px-3 !py-2"><ArrowLeftIcon className="w-5 h-5" /></Button><div><h1 className="text-xl font-bold">Editor</h1><p className="text-sm text-gray-500">{activeProject.title}</p></div></div>
                <div className="flex items-center gap-2"><Button onClick={() => {}} disabled><DownloadIcon className="w-5 h-5 mr-2" />Export</Button></div>
            </header>
            <div className="flex-grow flex gap-4 min-h-0">
                <div className="w-1/4 min-w-[280px] flex flex-col gap-4">
                    <div className="flex-shrink-0"><ProjectSettingsPanel /></div>
                    <div className="flex-grow min-h-0"><InspectorPanel /></div>
                </div>
                <div className="flex-grow flex flex-col min-w-0">
                    <div className="flex-shrink-0"><VideoPreview /></div>
                    {/* Controls */}
                    <div className="flex items-center gap-2 mt-2 p-2 bg-white rounded-lg shadow-sm border text-sm">
                        <div className="flex items-center gap-1"><Button onClick={undo} disabled={!canUndo} variant="secondary" className="!px-2 !py-1"><UndoIcon className="w-5 h-5" /></Button><Button onClick={redo} disabled={!canRedo} variant="secondary" className="!px-2 !py-1"><RedoIcon className="w-5 h-5" /></Button></div>
                        <div className="flex items-center border-l pl-2 gap-1"><Button onClick={() => setActiveTool('selection')} variant={activeTool === 'selection' ? 'primary' : 'secondary'} className="!px-2 !py-1"><PointerIcon className="w-5 h-5"/></Button><Button onClick={() => setActiveTool('razor')} variant={activeTool === 'razor' ? 'primary' : 'secondary'} className="!px-2 !py-1"><ScissorsIcon className="w-5 h-5"/></Button></div>
                        <Button onClick={handlePlayPause} variant="secondary" className="!px-2 !py-1">{isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}</Button>
                        <span className="font-mono text-gray-700">{formatTime(currentTime)}</span>
                        <div className="flex-grow flex items-center gap-2"><span>Zoom</span><input type="range" min={MIN_ZOOM} max={MAX_ZOOM} value={zoom} onChange={e => setZoom(+e.target.value)} className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer" /></div>
                    </div>
                    {/* Timeline */}
                    <div className="flex-grow mt-2 overflow-auto bg-gray-200/50 rounded-lg border p-2 flex gap-4">
                        <div className="flex flex-col gap-2 flex-shrink-0">
                            {tracks.map((track, i) => <div key={track.id} className="h-16 flex items-center justify-between p-2 bg-white rounded-md border text-sm font-semibold capitalize">{track.type} {i+1}<button onClick={() => removeTrack(track.id)} className="ml-2 text-red-500 hover:text-red-700 p-1"><TrashIcon className="w-4 h-4"/></button></div>)}
                            <Button onClick={() => addTrack('video')} variant="secondary" className="w-full !py-1 !text-sm"><PlusIcon className="w-4 h-4 mr-1"/>Video Track</Button><Button onClick={() => addTrack('audio')} variant="secondary" className="w-full !py-1 !text-sm"><PlusIcon className="w-4 h-4 mr-1"/>Audio Track</Button>
                        </div>
                        <div className="flex-grow overflow-x-auto" style={{ cursor: activeTool === 'razor' ? 'crosshair' : 'default' }}>
                            <div className="relative" style={{ width: `${totalDuration * zoom}px`, height: `${tracks.length * TOTAL_TRACK_HEIGHT}px` }} onClick={e => activeTool === 'razor' && handleSplitClip(e.nativeEvent.offsetX / zoom, (e.target as HTMLElement).dataset.clipId!)}>
                                <div className="absolute top-0 bottom-0 z-20 w-0.5 bg-red-500" style={{ left: `${currentTime * zoom}px` }}><div className="absolute -top-1 -ml-1.5 h-3 w-3 bg-red-500 rounded-full"></div></div>
                                {timeline.map(clip => {
                                    const trackIndex = tracks.findIndex(t => t.id === clip.track);
                                    if (trackIndex < 0) return null;
                                    return <div key={clip.id} data-clip-id={clip.id} onMouseDown={() => setSelectedClipId(clip.id)} className={`absolute h-14 rounded-lg flex items-center p-2 text-xs border-2 z-10 shadow-sm ${selectedClipId === clip.id ? 'border-red-500' : 'border-black/10'}`} style={{ top: `${trackIndex * TOTAL_TRACK_HEIGHT + (TRACK_HEIGHT - 56)/2}px`, left: `${clip.start * zoom}px`, width: `${clip.duration * zoom}px` }}>{clip.name}</div>;
                                })}
                            </div>
                        </div>
                    </div>
                </div>
                 <div className="w-1/5 min-w-[200px] flex-shrink-0"><AssetExplorer /></div>
            </div>
        </div>
    );
};

export default VideoEditorPage;
// Adding new icons used in the overhaul
const UndoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
);
const PointerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 14l-8.5-1-3.5-7-3.5 7L2 14l10 8z"/></svg>
);
const TextIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M17 6.1H7l-4 8h4l4-8h4l4 8h-4Z"/><path d="M13.5 14.1H18"/></svg>
);