import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';
import { FolderIcon } from '../components/icons/FolderIcon';

const NewProjectPage: React.FC = () => {
  const [title, setTitle] = useState('');
  const { createProject, projects } = useProject();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      const newProject = createProject(title.trim());
      navigate(`/project/${newProject.id}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] py-10">
      <Card className="w-full max-w-lg p-8 md:p-12 animate-fade-in-up">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">Create a New Project</h1>
        <p className="text-gray-600 mb-8">Let's start with a title for your animation.</p>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <Input
              type="text"
              placeholder="e.g., The Adventures of Captain Coder"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="text-lg"
            />
          </div>
          <Button type="submit" disabled={!title.trim()} className="w-full">
            Create Project
          </Button>
        </form>
      </Card>
      
      {projects.length > 0 && (
        <div className="w-full max-w-lg mt-12 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <h2 className="text-2xl font-bold text-center text-gray-700 mb-6">Or open an existing project</h2>
          <div className="space-y-3">
            {projects.map(project => (
              <Card 
                key={project.id} 
                onClick={() => navigate(`/project/${project.id}`)} 
                className="p-4 flex items-center"
              >
                <FolderIcon className="w-6 h-6 mr-4 text-red-500" />
                <h3 className="font-semibold text-lg text-gray-800">{project.title}</h3>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NewProjectPage;