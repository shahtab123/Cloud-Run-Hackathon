import React, { createContext, useState, useContext, ReactNode } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';

// Types
export interface Subscene {
  id: string;
  description: string;
}

export interface Scene {
  id: string;
  description: string;
  image?: string; // base64 image data url
  narration?: string;
  subscenes: Subscene[];
}

export interface GeneratedImage {
  id: string;
  data: string; // base64 image data url
  prompt: string;
  model: 'imagen-4.0-generate-001' | 'gemini-2.5-flash-image';
  sceneId?: string;
}

export interface Video {
  id: string;
  data: string; // base64 video data url
  prompt: string;
  sourceImage?: string;
}

export interface Project {
  id: string;
  title: string;
  scenes: Scene[];
  systemPrompt?: string;
  images: GeneratedImage[];
  videos: Video[];
}

export const defaultSystemPrompt = `Create detailed 3D render prompts for a detective cold case documentary. Each prompt should follow this format:
'A highly stylized 3D render of a featureless human figure with no facial features, fully smooth and reflective material, in a [scene description with specific props and environment], the figure is positioned [specific pose/action], wearing [clothing details]. The scene is lit with [lighting description] casting [shadow details], and the background is [background description]. The figure's surface is perfectly seamless and ultra-polished, no lines, no seams, no joints, no cracks, no artifacts. Cinematic angle [camera angle]. Ultra-realistic 3D rendering.'
Make each scene relate to detective work and investigation.`;


interface ProjectContextType {
  projects: Project[];
  activeProject: Project | null;
  createProject: (title: string) => Project;
  updateProject: (updatedProject: Project) => void;
  addScene: (projectId: string, sceneDescription: string) => void;
  addScenes: (projectId: string, sceneDescriptions: string[]) => void;
  addSubscenes: (projectId: string, sceneId: string, subsceneDescriptions: string[]) => void;
  updateScene: (projectId: string, sceneId: string, sceneUpdate: Partial<Scene>) => void;
  getScene: (projectId: string, sceneId: string | undefined) => Scene | undefined;
  addImage: (projectId: string, image: Omit<GeneratedImage, 'id'>) => void;
  addVideo: (projectId: string, video: Omit<Video, 'id'>) => void;
  setActiveProjectById: (projectId: string | null) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useLocalStorage<Project[]>('animation-projects', []);
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  const createProject = (title: string): Project => {
    const newProject: Project = { id: crypto.randomUUID(), title, scenes: [], systemPrompt: defaultSystemPrompt, images: [], videos: [] };
    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
    setActiveProject(newProject);
    return newProject;
  };
  
  const setActiveProjectById = (projectId: string | null) => {
    if (projectId === null) {
      setActiveProject(null);
      return;
    }
    const project = projects.find(p => p.id === projectId);
    setActiveProject(project || null);
  };

  const updateProject = (updatedProject: Project) => {
    const updatedProjects = projects.map(p => (p.id === updatedProject.id ? updatedProject : p));
    setProjects(updatedProjects);
    if (activeProject?.id === updatedProject.id) {
      setActiveProject(updatedProject);
    }
  };

  const addScene = (projectId: string, sceneDescription: string) => {
    const projectToUpdate = projects.find(p => p.id === projectId);
    if (!projectToUpdate) return;
    
    const newScene: Scene = { id: crypto.randomUUID(), description: sceneDescription, subscenes: [] };
    const updatedProject = { ...projectToUpdate, scenes: [...projectToUpdate.scenes, newScene] };
    
    const updatedProjects = projects.map(p => (p.id === projectId ? updatedProject : p));
    setProjects(updatedProjects);
    setActiveProject(updatedProject);
  };

  const addScenes = (projectId: string, sceneDescriptions: string[]) => {
    const projectToUpdate = projects.find(p => p.id === projectId);
    if (!projectToUpdate) return;
    
    const newScenes: Scene[] = sceneDescriptions.map(desc => ({
      id: crypto.randomUUID(),
      description: desc,
      subscenes: [],
    }));

    const updatedProject = { ...projectToUpdate, scenes: [...projectToUpdate.scenes, ...newScenes] };
    
    const updatedProjects = projects.map(p => (p.id === projectId ? updatedProject : p));
    setProjects(updatedProjects);
    setActiveProject(updatedProject);
  };

  const addSubscenes = (projectId: string, sceneId: string, subsceneDescriptions: string[]) => {
    const projectToUpdate = projects.find(p => p.id === projectId);
    if (!projectToUpdate) return;

    const newSubscenes: Subscene[] = subsceneDescriptions.map(desc => ({
        id: crypto.randomUUID(),
        description: desc,
    }));

    const updatedScenes = projectToUpdate.scenes.map(scene => {
        if (scene.id === sceneId) {
            return { ...scene, subscenes: [...scene.subscenes, ...newSubscenes] };
        }
        return scene;
    });

    const updatedProject = { ...projectToUpdate, scenes: updatedScenes };

    const updatedProjects = projects.map(p => (p.id === projectId ? updatedProject : p));
    setProjects(updatedProjects);
    setActiveProject(updatedProject);
  };
  
  const updateScene = (projectId: string, sceneId: string, sceneUpdate: Partial<Scene>) => {
    const projectToUpdate = projects.find(p => p.id === projectId);
    if (!projectToUpdate) return;
    
    const updatedScenes = projectToUpdate.scenes.map(s => (s.id === sceneId ? { ...s, ...sceneUpdate } : s));
    const updatedProject = { ...projectToUpdate, scenes: updatedScenes };

    const updatedProjects = projects.map(p => (p.id === projectId ? updatedProject : p));
    setProjects(updatedProjects);
    setActiveProject(updatedProject);
  };

  const addImage = (projectId: string, image: Omit<GeneratedImage, 'id'>) => {
    const projectToUpdate = projects.find(p => p.id === projectId);
    if (!projectToUpdate) return;

    const newImage: GeneratedImage = { ...image, id: crypto.randomUUID() };
    const updatedProject = { ...projectToUpdate, images: [...projectToUpdate.images, newImage] };
    
    const updatedProjects = projects.map(p => (p.id === projectId ? updatedProject : p));
    setProjects(updatedProjects);
    if (activeProject?.id === updatedProject.id) {
        setActiveProject(updatedProject);
    }
  };

  const addVideo = (projectId: string, video: Omit<Video, 'id'>) => {
    const projectToUpdate = projects.find(p => p.id === projectId);
    if (!projectToUpdate) return;

    const newVideo: Video = { ...video, id: crypto.randomUUID() };
    const updatedProject = { ...projectToUpdate, videos: [...(projectToUpdate.videos || []), newVideo] };
    
    const updatedProjects = projects.map(p => (p.id === projectId ? updatedProject : p));
    setProjects(updatedProjects);
    if (activeProject?.id === updatedProject.id) {
        setActiveProject(updatedProject);
    }
  };
  
  const getScene = (projectId: string, sceneId: string | undefined): Scene | undefined => {
    if (!sceneId) return undefined;
    const project = projects.find(p => p.id === projectId);
    return project?.scenes.find(s => s.id === sceneId);
  };

  const contextValue: ProjectContextType = {
    projects,
    activeProject,
    createProject,
    updateProject,
    addScene,
    addScenes,
    addSubscenes,
    updateScene,
    getScene,
    addImage,
    addVideo,
    setActiveProjectById,
  };

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = (): ProjectContextType => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};