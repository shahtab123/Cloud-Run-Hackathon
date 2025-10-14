import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import Card from '../components/Card';
import { BotIcon } from '../components/icons/BotIcon';
import { ImageIcon } from '../components/icons/ImageIcon';
import { FilmIcon } from '../components/icons/FilmIcon';
import { MicIcon } from '../components/icons/MicIcon';
import { ScissorsIcon } from '../components/icons/ScissorsIcon';
import { VideoIcon } from '../components/icons/VideoIcon';
import { FolderIcon } from '../components/icons/FolderIcon';


const MainMenuPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { activeProject, setActiveProjectById } = useProject();

  useEffect(() => {
    if (projectId) {
      setActiveProjectById(projectId);
    }
  }, [projectId, setActiveProjectById]);

  if (!activeProject) {
    return <div className="text-center py-10">Loading project...</div>;
  }
  
  const menuItems = [
    { title: 'Scene Creator', icon: BotIcon, path: `/project/${projectId}/scenes`, description: 'Write and plan your scenes.', disabled: false },
    { title: 'Image Generation', icon: ImageIcon, path: `/project/${projectId}/image-generation`, description: 'Generate images for each scene.', disabled: false },
    { title: 'Video Assembly', icon: FilmIcon, path: `/project/${projectId}/video-generation`, description: 'Combine images into a video.', disabled: false },
    { title: 'Voice Narration', icon: MicIcon, path: `/project/${projectId}/voice-narration`, description: 'Add AI-generated voiceovers.', disabled: false },
    { title: 'Final Edit', icon: ScissorsIcon, path: `/project/${projectId}/editor`, description: 'Edit and finalize your video.', disabled: false },
    { title: 'Publish', icon: VideoIcon, path: '#', description: 'Export your masterpiece.', disabled: true },
    { title: 'Directory', icon: FolderIcon, path: '/directory', description: 'View all project files.', disabled: false },
  ];

  return (
    <div className="animate-fade-in">
      <h1 className="text-4xl font-bold mb-2">Project: <span className="text-red-600">{activeProject.title}</span></h1>
      <p className="text-lg text-gray-600 mb-10">Choose a step to work on.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {menuItems.map((item, index) => (
          <Card
            key={item.title}
            onClick={() => !item.disabled && navigate(item.path)}
            disabled={item.disabled}
            className="p-6"
            style={{ animationDelay: `${100 + index * 100}ms` }}
          >
            <div className="flex items-center mb-4">
              <item.icon className="w-8 h-8 mr-4 text-red-600" />
              <h2 className="text-2xl font-bold">{item.title}</h2>
            </div>
            <p className="text-gray-600">{item.description}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MainMenuPage;