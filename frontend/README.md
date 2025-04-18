# Flowterview Demo Agent by Layerpath

A NextJS application that combines an interactive visual layer with a voice agent powered by Daily.co, Deepgram STT, Elevenlabs/ Cartesia TTS, Gemini AI, and LlamaIndex.

## Features

- Interactive visual layer with particle animations
- Holographic voice agent button
- Speech-to-text and text-to-speech capabilities
- AI-powered responses using Gemini 2.0 Flash or any other LLM models (configurable)
- Information retrieval with LlamaIndex
- Modern UI built with Shadcn UI components

## Project Structure

```
frontend/
├── app/
│   ├── components/
│   │   ├── path-ai/
│   │   │   ├── path-ai-voice-agent.tsx  # Voice agent component
│   │   │   └── visual-layer.tsx      # Visual effects layer
│   │   └── ui/
│   │       ├── button.tsx            # Button component
│   │       └── dialog.tsx            # Dialog component
│   ├── lib/
│   │   ├── api/
│   │   │   ├── llama-index.ts        # LlamaIndex integration
│   │   │   └── voice-agent.ts        # Voice agent API
│   │   └── utils.ts                  # Utility functions
│   ├── globals.css                   # Global styles
│   ├── layout.tsx                    # Root layout
│   └── page.tsx                      # Main page
├── public/                           # Static assets
├── package.json                      # Project dependencies
└── tailwind.config.ts                # Tailwind configuration
```

## Technologies Used

- **Next.js**: React framework for server-rendered applications
- **React**: JavaScript library for building user interfaces
- **TypeScript**: Typed JavaScript
- **Zustand**: A small, fast Global State Manager
- **Tailwind CSS**: Utility-first CSS framework
- **Shadcn UI**: UI component library
- **Framer Motion**: Animation library
- **Daily.co**: Video and voice API platform
- **Google STT/TTS**: Speech-to-text and text-to-speech services
- **Gemini AI**: Google's AI model for generating responses
- **LlamaIndex**: Data framework for building LLM applications

## Getting Started

### Prerequisites

- Node.js 18.x or later
- pnpm package manager

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/layerpath/layerpath-v2.git
   cd layerpath-v2
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Run the development server:

   ```bash
   pnpm dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development

This project uses placeholder API calls for voice agent functionality, LlamaIndex integration, and AI responses. To implement real functionality, you'll need to:

1. Install and configure the required dependencies:

   ```bash
   pnpm add @daily-co/daily-js @llama-index/core @google-cloud/speech @google-cloud/text-to-speech @google/generative-ai
   ```

2. Update the API implementation in `app/lib/api/` with your API keys and configuration.

## License

This project is proprietary software of Flowterview. All rights reserved.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
