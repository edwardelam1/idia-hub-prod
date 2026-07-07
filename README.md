
## Agent integrations (MCP)

The IDIA Hub exposes a Model Context Protocol server at
`https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/mcp`.

Tools:
- `echo` — public. Connectivity/health probe. No auth required.
- `whoami` — protected. Requires OAuth 2.1 (Supabase). Returns the calling
  user's `user_id`, `email`, and `client_id`.

Protected tools verify the caller's Supabase-issued JWT inside the edge
function (`@lovable.dev/mcp-js` resource-server auth, issuer
`https://<project-ref>.supabase.co/auth/v1`, audience `authenticated`). Any DB
access in a protected tool should build a per-request Supabase client with
`Authorization: Bearer ${ctx.getToken()}` so queries run under the caller's
Row Level Security (`auth.uid()`).

To add another protected tool, copy `src/lib/mcp/tools/whoami.ts`, register it
in `src/lib/mcp/index.ts`, run the MCP manifest extractor, and redeploy the
`mcp` edge function.
# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/d2e2d26e-3d17-4a6d-8470-701a6bb4da35

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/d2e2d26e-3d17-4a6d-8470-701a6bb4da35) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/d2e2d26e-3d17-4a6d-8470-701a6bb4da35) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
