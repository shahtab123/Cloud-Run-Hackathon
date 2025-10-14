# 🎬 AI Animation Studio

A web application to create stunning animated YouTube videos with the power of AI, from scene planning to final video editing.

## Features

-   **📝 AI-Powered Scene & Script Generation**: Kickstart your project by generating a complete scene plan. Refine scenes, create sub-scenes, and even generate narration scripts directly from your scene descriptions.

-   **🎨 Advanced Image Generation**: Create stunning visuals for your scenes using text prompts with Google's Imagen model, or perform image-to-image edits with Gemini Nano Banana.

-   **🎥 AI Video Assembly**: Bring your images to life by generating dynamic video clips from text prompts and source images using the Veo model.

-   **🎤 AI Voice Narration**: Produce high-quality voiceovers for your scripts with a selection of professional AI voices and style prompts.

-   **✂️ Professional Video Editor**: A full-featured timeline editor to bring all your assets together.
    -   **Interactive Player**: Directly resize and reposition clips in the preview window.
    -   **Inspector Panel**: Fine-tune transforms (position, scale, rotation), opacity, volume, and fades.
    -   **Text Tool**: Add and customize text overlays.
    -   **Toolbar**: Includes Selection and Razor tools for precise edits.
    -   **Dynamic Tracks**: Add and remove video and audio tracks as needed.
    -   **Timeline Controls**: Zoom, clip snapping, and full undo/redo support.
    -   **Keyboard Shortcuts**: Work efficiently with common editing hotkeys.

-   **📂 Project Management**: All your projects and assets are saved locally in your browser. A dedicated directory allows you to view and download your generated content (scenes, images, videos, audio) at any time.

## Technical Overview

This project is a modern, frontend-only web application built with:

-   **React**: For building the user interface.
-   **TypeScript**: For type-safe JavaScript.
-   **Tailwind CSS**: For styling the application.
-   **Gemini API**: For all AI-powered generation features.

### Data Persistence

**Important:** All project data, including scenes, generated assets, and timeline edits, is stored exclusively in your browser's **Local Storage**.

-   **Pros**: This allows the application to work offline and saves your progress instantly without needing to connect to a server.
-   **Cons**: The data is tied to the browser and device you are using. Clearing your browser's data or using a private/incognito window will erase your projects.

For data to be saved correctly, please ensure you are not in a private browsing session and that your browser settings allow websites to save data.

## Getting Started

To run this application, simply open the `index.html` file in a modern web browser. All dependencies are loaded via an import map from a CDN, so no local installation or build step is required.
