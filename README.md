# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/449ba0d5-500c-4c12-8666-f3db4263c1b0

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/449ba0d5-500c-4c12-8666-f3db4263c1b0) and start prompting.

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

Simply open [Lovable](https://lovable.dev/projects/449ba0d5-500c-4c12-8666-f3db4263c1b0) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## Patch de Integração Supabase (gerado automaticamente)
Data (UTC): 2025-09-16T19:09:56.531075Z

- Adicionado `src/lib/supabaseClient.ts`
- Adicionado `src/types/supabase.ts` (tipos mínimos para `profiles` e `messages`)
- Adicionado `src/lib/chatService.ts` (funções `sendMessage` e `getConversation`)
- Garantido alias `@/*` no `tsconfig.json`
- Atualizado `.env.example` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`

### Como rodar
1. Crie `.env` baseado em `.env.example` e preencha as chaves do Supabase.
2. `npm i`
3. `npm run dev` para desenvolvimento ou `npm run build && npm run preview` para testar o build.


## Deploy notes (auto)
- Update marker: 2025-09-25 01:52:59 UTC-03:00-0300
- Change: Version bump + Netlify PWA fixes (public/pwa assets, SW path, SPA redirects).
