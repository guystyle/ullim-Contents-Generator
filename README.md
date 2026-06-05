# ullim Contents Generator

Instagram caption and hashtag generator for the **ullim** DJ collective, powered by Google Gemini AI.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example env file and add your Gemini API key:

```bash
cp .env.example .env.local
```

Edit `.env.local` and set your key:

```
GEMINI_API_KEY=your_actual_key_here
```

Get a free API key at [Google AI Studio](https://aistudio.google.com/app/apikey).

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Select the content type (이벤트/파티, DJ 믹스셋, 릴스/스토리, 일반 포스트)
2. Fill in the event/content details
3. Choose the output language (한국어 / English / 둘 다)
4. Click **Generate** to create captions and hashtags
5. Copy the caption or hashtags with the copy buttons
6. Click **Regenerate** to get a fresh variation

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Google Generative AI SDK** (`@google/generative-ai`)
- **Gemini 2.0 Flash** model

## Deploy

This app can be deployed to [Vercel](https://vercel.com) with zero configuration. Set the `GEMINI_API_KEY` environment variable in your Vercel project settings.
