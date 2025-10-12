import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject, Project } from '../contexts/ProjectContext';
import Button from '../components/Button';
import { FolderIcon } from '../components/icons/FolderIcon';
import { DownloadIcon } from '../components/icons/DownloadIcon';
import JSZip from 'jszip';

const DirectoryPage: React.FC = () => {
    const { projects } = useProject();
    const navigate = useNavigate();
    const [downloadingProjectId, setDownloadingProjectId] = useState<string | null>(null);

    const handleDownloadProject = async (project: Project) => {
        setDownloadingProjectId(project.id);
        try {
            const zip = new JSZip();
            const chatsFolder = zip.folder('scenes');
            if (!chatsFolder) {
                throw new Error("Could not create zip folder");
            }

            project.scenes.forEach((scene, sceneIndex) => {
                const sceneFileName = `scene_${sceneIndex + 1}.txt`;
                chatsFolder.file(sceneFileName, scene.description);

                scene.subscenes.forEach((subscene, subsceneIndex) => {
                    const subsceneFileName = `scene_${sceneIndex + 1}_subscene_${subsceneIndex + 1}.txt`;
                    chatsFolder.file(subsceneFileName, subscene.description);
                });
            });

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(zipBlob);
            const projectTitleSafe = project.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            link.download = `${projectTitleSafe}_scenes.zip`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

        } catch (error) {
            console.error("Failed to create zip file for download:", error);
            alert("Sorry, there was an error creating the download file.");
        } finally {
            setDownloadingProjectId(null);
        }
    };


    return (
        <div className="max-w-4xl mx-auto animate-fade-in">
            <Button variant="secondary" onClick={() => navigate(-1)} className="mb-8">
                &larr; Back
            </Button>
            <h1 className="text-4xl font-bold mb-8">Project Directory</h1>
            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200/80">
                <div className="flex items-center mb-4 pb-2 border-b">
                    <FolderIcon className="w-6 h-6 mr-3 text-gray-500"/>
                    <span className="font-mono text-lg text-gray-700">/projects/</span>
                </div>
                <div className="pl-6">
                    {projects.length > 0 ? projects.map(project => (
                        <div key={project.id} className="mb-4">
                            <div className="flex items-center mb-2">
                                <FolderIcon className="w-5 h-5 mr-2 text-red-500"/>
                                <button onClick={() => navigate(`/project/${project.id}`)} className="font-mono font-semibold text-gray-800 hover:underline">{project.title.replace(/\s+/g, '_')}/</button>
                            </div>
                            <div className="pl-6 border-l-2 border-gray-200 ml-2 space-y-2">
                                <div className="flex items-center justify-between pr-2">
                                    <div className="flex items-center">
                                        <FolderIcon className="w-5 h-5 mr-2 text-blue-500"/>
                                        <span className="font-mono text-gray-600">chats/</span>
                                    </div>
                                    <button
                                        onClick={() => handleDownloadProject(project)}
                                        disabled={!!downloadingProjectId}
                                        className="p-1.5 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Download scenes as .txt files"
                                    >
                                        {downloadingProjectId === project.id ? (
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-500"></div>
                                        ) : (
                                            <DownloadIcon className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                                <div className="pl-8 text-gray-500 font-mono text-sm">
                                    - {project.scenes.length} scene(s)
                                </div>
                                 <div className="flex items-center mt-2">
                                    <FolderIcon className="w-5 h-5 mr-2 text-gray-400"/>
                                    <span className="font-mono text-gray-400">images/</span>
                                </div>
                                <div className="flex items-center mt-2">
                                    <FolderIcon className="w-5 h-5 mr-2 text-gray-400"/>
                                    <span className="font-mono text-gray-400">videos/</span>
                                </div>
                            </div>
                        </div>
                    )) : <p className="font-mono text-gray-500">No projects found.</p>}
                </div>
            </div>
        </div>
    );
};

export default DirectoryPage;