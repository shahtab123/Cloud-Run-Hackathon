import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import Card from '../components/Card';
import { BotIcon } from '../components/icons/BotIcon';
import { ImageIcon } from '../components/icons/ImageIcon';
import { FilmIcon } from '../components/icons/FilmIcon';
import { MicIcon } from '../components/icons/MicIcon';
import { FolderIcon } from '../components/icons/FolderIcon';
import Button from '../components/Button';
import { ScissorsIcon } from '../components/icons/ScissorsIcon';


const MainMenuPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { activeProject, setActiveProjectById } = useProject();

  useEffect(() => {
    if (projectId && (!activeProject || activeProject.id !== projectId)) {
      setActiveProjectById(projectId);
    }
  }, [projectId, activeProject, setActiveProjectById]);

  if (!activeProject) {
    return <div className="text-center py-10">Loading project...</div>;
  }
  
  const menuItems = [
    { title: 'Scene Creator', icon: BotIcon, path: `/project/${projectId}/scenes`, description: 'Write and plan your scenes.', disabled: false, external: false },
    { title: 'Image Generation', icon: ImageIcon, path: `/project/${projectId}/image-generation`, description: 'Generate images for each scene.', disabled: false, external: false },
    { title: 'Video Assembly', icon: FilmIcon, path: `/project/${projectId}/video-generation`, description: 'Combine images into a video.', disabled: false, external: false },
    { title: 'Voice Narration', icon: MicIcon, path: `/project/${projectId}/voice-narration`, description: 'Add AI-generated voiceovers.', disabled: false, external: false },
    { title: 'Free Video Editor', icon: ScissorsIcon, path: 'https://trykimu.com/', description: 'Use Kimu, a free & open-source tool to edit your videos.', disabled: false, external: true },
    { title: 'Directory', icon: FolderIcon, path: '/directory', description: 'View all project files.', disabled: false, external: false },
  ];

  return (
    <div className="animate-fade-in-up">
      <h1 className="text-4xl font-bold mb-2 text-gray-100">Project: <span className="text-red-500">{activeProject.title}</span></h1>
      <p className="text-lg text-gray-300 mb-10">Choose a step to work on.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {menuItems.map((item, index) => (
          <Card
            key={item.title}
            onClick={() => {
              if (item.disabled) return;
              if (item.external) {
                window.open(item.path, '_blank', 'noopener,noreferrer');
              } else {
                navigate(item.path);
              }
            }}
            disabled={item.disabled}
            className="p-6 !bg-gray-900/50 backdrop-blur-sm border border-red-500/20 !hover:border-red-400/80"
            style={{ animationDelay: `${100 + index * 100}ms` }}
          >
            <div>
              <div className="flex items-center mb-4">
                <item.icon className="w-8 h-8 mr-4 text-red-500" />
                <h2 className="text-2xl font-bold text-gray-100">{item.title}</h2>
                {item.external && (
                    <span className="ml-auto text-xs font-mono bg-gray-700 text-gray-200 px-2 py-0.5 rounded-full">EXTERNAL</span>
                )}
              </div>
              <p className="text-gray-300">{item.description}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-12 p-6 bg-gray-900/50 backdrop-blur-sm border border-red-500/20 rounded-2xl animate-fade-in-up" style={{ animationDelay: '800ms' }}>
        <div className="flex flex-col sm:flex-row items-center">
            <FolderIcon className="w-10 h-10 text-gray-400 mr-4 flex-shrink-0 mb-4 sm:mb-0" />
            <div className="flex-grow text-center sm:text-left">
                <h3 className="text-xl font-bold text-gray-100">Your Project Files</h3>
                <p className="text-gray-300 mt-1">
                    All project data is stored locally in your browser. View and download all your generated assets in the directory.
                </p>
            </div>
            <Button variant="secondary" onClick={() => navigate('/directory')} className="ml-auto mt-4 sm:mt-0 flex-shrink-0 !bg-transparent border !border-red-500/50 !text-red-300 hover:!bg-red-500/20">
                Open Directory
            </Button>
        </div>
      </div>
    </div>
  );
};

export default MainMenuPage;