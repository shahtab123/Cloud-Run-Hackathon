# 🎬 AI Animation Studio

A web application to create stunning animated YouTube videos with the power of AI, from scene planning to final video editing.

## How It Works

1.  **Write your scene plan**: Use AI to generate a list of scenes for your story.
2.  **Generate images**: Create visuals for each scene. (Coming Soon)
3.  **Generate video from images**: Assemble images into video clips. (Coming Soon)
4.  **Add AI-generated voice**: Narrate your story with AI voices. (Coming Soon)
5.  **Edit video and publish**: Finalize and export your animation. (Coming Soon)

## Technical Overview

This project is a modern, frontend-only web application built with:

-   **React**: For building the user interface.
-   **TypeScript**: For type-safe JavaScript.
-   **Tailwind CSS**: For styling the application.
-   **Gemini API**: For all AI-powered generation features.

### Data Persistence

**Important:** All project data, including scenes and prompts, is stored exclusively in your browser's **Local Storage**.

-   **Pros**: This allows the application to work offline and saves your progress instantly without needing to connect to a server.
-   **Cons**: The data is tied to the browser and device you are using. Clearing your browser's data or using a private/incognito window will erase your projects.

For data to be saved correctly, please ensure you are not in a private browsing session and that your browser settings allow websites to save data.

## Getting Started

To run this application, simply open the `index.html` file in a modern web browser. All dependencies are loaded via an import map from a CDN, so no local installation or build step is required.
