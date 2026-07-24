# Northstar Ops

A small, production-ready Next.js landing page built as a junior developer deployment exercise.

cow 
## Requirements

- Node.js 24 LTS
- npm

The application does not need environment variables or external services.

## Local setup

Install the locked dependencies:

```bash
npm ci
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The application uses port `3000`.

## Development commands

```bash
npm run dev        # Start the development server
npm run lint       # Run ESLint
npm run typecheck  # Check TypeScript types
npm run build      # Create a production build
npm run start      # Start the production server after a build
```

## Production build

Validate and build the application:

```bash
npm run lint
npm run typecheck
npm run build
npm run start
```

The production server is available at [http://localhost:3000](http://localhost:3000).

## Docker

Build the image:

```bash
docker build -t northstar-ops .
```

Run the container:

```bash
docker run --rm -p 3000:3000 northstar-ops
```

Then open [http://localhost:3000](http://localhost:3000). The container includes a health check at [http://localhost:3000/api/health](http://localhost:3000/api/health).

The multi-stage `Dockerfile` runs the standalone Next.js server as a non-root user and is suitable for deployment through Coolify. Configure Coolify to expose container port `3000`.

## Change the landing-page content

- Edit `app/page.tsx` to change navigation, headings, descriptions, steps, or footer text.
- Edit `app/globals.css` for the small set of global styles.
- Edit `app/layout.tsx` to change the browser title and page description.

Most page styling uses Tailwind CSS utility classes directly in `app/page.tsx`, so a small content-only pull request usually needs to change just that file.
