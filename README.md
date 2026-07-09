# VIBEGEN

VIBEGEN is an AI-powered wallpaper generator that creates unique images based on your described "vibe." Describe a mood, style, or concept, and the application will generate four distinct variations, optimized for phone backgrounds with a 9:16 aspect ratio. It leverages the Google Gemini API for image generation.

## Features

- **Vibe-to-Image Generation**: Describe your desired aesthetic in a text prompt to generate images.
- **Multiple Variations**: Get four unique image variations for every prompt.
- **Advanced Controls**: Fine-tune your results with filters for style, color palette, and negative prompts.
- **Image Remixing**: Use a previously generated image as a reference to create new, remixed compositions.
- **Personal Collection**: Save your favorite creations to a persistent local gallery.
- **Customizable Output**: Configure settings for aspect ratio (`1:1`, `3:4`, `4:3`, `9:16`, `16:9`), resolution (`1K`, `2K`, `4K`), and the underlying AI model.
- **Responsive Design**: A sleek and modern interface built with React, Tailwind CSS, and Motion.

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **AI Engine**: Google Gemini API (`@google/genai`)
- **Styling**: Tailwind CSS, `clsx`, `tailwind-merge`
- **Animation**: Motion
- **Server**: Express (for local development)

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- `npm` or a compatible package manager

### Installation & Setup

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/wl2saa/vibegen.git
    cd vibegen
    ```

2.  **Install dependencies:**
    ```sh
    npm install
    ```

3.  **Set up environment variables:**
    - Create a `.env` file in the root of the project by copying the example file:
      ```sh
      cp .env.example .env
      ```
    - Open the `.env` file and add your Google Gemini API key:
      ```
      GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
      ```

4.  **Run the development server:**
    ```sh
    npm run dev
    ```

The application will be available at `http://localhost:3000`.

## Environment Variables

- `GEMINI_API_KEY`: **Required**. Your API key for the Google Gemini service, used for all AI image generation calls.
- `APP_URL`: The URL where the application is hosted. This is used for self-referential links, OAuth callbacks, and API endpoints. Automatically injected in some deployment environments like AI Studio.
## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
