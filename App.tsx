import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProjectProvider } from './contexts/ProjectContext';
import Layout from './components/Layout';
import WelcomePage from './pages/WelcomePage';
import NewProjectPage from './pages/NewProjectPage';
import MainMenuPage from './pages/MainMenuPage';
import SceneCreatorPage from './pages/SceneCreatorPage';
import DirectoryPage from './pages/DirectoryPage';

const App: React.FC = () => {
  return (
    <ProjectProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<WelcomePage />} />
            <Route path="/new-project" element={<NewProjectPage />} />
            <Route path="/project/:projectId" element={<MainMenuPage />} />
            <Route path="/project/:projectId/scenes" element={<SceneCreatorPage />} />
            <Route path="/directory" element={<DirectoryPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Layout>
      </Router>
    </ProjectProvider>
  );
};

export default App;