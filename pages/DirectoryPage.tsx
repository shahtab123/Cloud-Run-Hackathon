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

    const handleDownloadContent = async (project: Project, type: 'scenes' | 'images' | 'videos') => {
        setDownloadingProjectId(`${project.id}-${type}`);
        try {
            const zip = new JSZip();
            const projectTitleSafe = project.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            
            if (type === 'scenes') {
                const scenesFolder = zip.folder('scenes');
                if (!scenesFolder) throw new Error("Could not create scenes folder");

                project.scenes.forEach((scene, sceneIndex) => {
                    scenesFolder.file(`scene_${sceneIndex + 1}.txt`, scene.description);
                    scene.subscenes.forEach((sub, subIndex) => {
                        scenesFolder.file(`scene_${sceneIndex + 1}_subscene_${subIndex + 1}.txt`, sub.description);
                    });
                });
                const zipBlob = await zip.generateAsync({ type: 'blob' });
                downloadZip(zipBlob, `${projectTitleSafe}_scenes.zip`);
            } else if (type === 'images') {
                const imagesFolder = zip.folder('images');
                if (!imagesFolder) throw new Error("Could not create images folder");

                project.images.forEach((image, index) => {
                    const base64Data = image.data.split(',')[1];
                    imagesFolder.file(`image_${index + 1}.jpg`, base64Data, { base64: true });
                });
                const zipBlob = await zip.generateAsync({ type: 'blob' });
                downloadZip(zipBlob, `${projectTitleSafe}_images.zip`);
            } else if (type === 'videos') {
                 const videosFolder = zip.folder('videos');
                if (!videosFolder) throw new Error("Could not create videos folder");
                
                (project.videos || []).forEach((video, index) => {
                    const base64Data = video.data.split(',')[1];
                    const videoType = video.data.match(/data:video\/(.+);/)?.[1] || 'mp4';
                    videosFolder.file(`video_${index + 1}.${videoType}`, base64Data, { base64: true });
                });
                const zipBlob = await zip.generateAsync({ type: 'blob' });
                downloadZip(zipBlob, `${projectTitleSafe}_videos.zip`);
            }

        } catch (error) {
            console.error("Failed to create zip file for download:", error);
            alert("Sorry, there was an error creating the download file.");
        } finally {
            setDownloadingProjectId(null);
        }
    };

    const downloadZip = (blob: Blob, filename: string) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
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
                                {/* Scenes */}
                                <div className="flex items-center justify-between pr-2">
                                    <div className="flex items-center">
                                        <FolderIcon className="w-5 h-5 mr-2 text-blue-500"/>
                                        <span className="font-mono text-gray-600">scenes/</span>
                                    </div>
                                    <button
                                        onClick={() => handleDownloadContent(project, 'scenes')}
                                        disabled={!!downloadingProjectId}
                                        className="p-1.5 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Download scenes as .txt files"
                                    >
                                        {downloadingProjectId === `${project.id}-scenes` ? (
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-500"></div>
                                        ) : (
                                            <DownloadIcon className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                                <div className="pl-8 text-gray-500 font-mono text-sm">
                                    - {project.scenes.length} scene(s)
                                </div>

                                {/* Images */}
                                <div className="flex items-center justify-between pr-2 mt-2">
                                    <div className="flex items-center">
                                        <FolderIcon className={`w-5 h-5 mr-2 ${project.images.length > 0 ? 'text-blue-500' : 'text-gray-400'}`}/>
                                        <span className={`font-mono ${project.images.length > 0 ? 'text-gray-600' : 'text-gray-400'}`}>images/</span>
                                    </div>
                                    {project.images.length > 0 && (
                                        <button
                                            onClick={() => handleDownloadContent(project, 'images')}
                                            disabled={!!downloadingProjectId}
                                            className="p-1.5 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Download all images"
                                        >
                                            {downloadingProjectId === `${project.id}-images` ? (
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-500"></div>
                                            ) : (
                                                <DownloadIcon className="w-5 h-5" />
                                            )}
                                        </button>
                                    )}
                                </div>
                                {project.images.length > 0 &&
                                    <div className="pl-8 text-gray-500 font-mono text-sm">
                                        - {project.images.length} image(s)
                                    </div>
                                }

                                {/* Videos */}
                                <div className="flex items-center justify-between pr-2 mt-2">
                                    <div className="flex items-center">
                                        <FolderIcon className={`w-5 h-5 mr-2 ${(project.videos || []).length > 0 ? 'text-blue-500' : 'text-gray-400'}`}/>
                                        <span className={`font-mono ${(project.videos || []).length > 0 ? 'text-gray-600' : 'text-gray-400'}`}>videos/</span>
                                    </div>
                                    {(project.videos || []).length > 0 && (
                                        <button
                                            onClick={() => handleDownloadContent(project, 'videos')}
                                            disabled={!!downloadingProjectId}
                                            className="p-1.5 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Download all videos"
                                        >
                                            {downloadingProjectId === `${project.id}-videos` ? (
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-500"></div>
                                            ) : (
                                                <DownloadIcon className="w-5 h-5" />
                                            )}
                                        </button>
                                    )}
                                </div>
                                {(project.videos || []).length > 0 &&
                                    <div className="pl-8 text-gray-500 font-mono text-sm">
                                        - {(project.videos || []).length} video(s)
                                    </div>
                                }
                            </div>
                        </div>
                    )) : <p className="font-mono text-gray-500">No projects found.</p>}
                </div>
            </div>
        </div>
    );
};

export default DirectoryPage;