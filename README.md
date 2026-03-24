This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deployment

### Docker Deployment (Production Server)

This project is deployed via Docker on a VPS server.

**Prerequisites:**
- SSH access to the server
- GitHub SSH key configured on the server

**Automatic Deployment:**
```bash
./deploy.sh [message]
```

This script will:
1. Commit changes locally with your message
2. Push to GitHub (`main` branch)
3. Connect to the server via SSH
4. Pull the latest code
5. Rebuild and restart Docker containers

**Manual Deployment:**
```bash
# On the server:
cd /root/venda-whatsapp-ads
git pull origin main
docker compose up --build -d --remove-orphans
docker compose logs -f
```

**Configuration:**
Create `.deploy.env` with your server details:
```env
SSH_HOST=91.99.98.84
SSH_PORT=2277
SSH_USER=root
SSH_KEY=~/.ssh/id_venda
REMOTE_DIR=/root/venda-whatsapp-ads
GIT_BRANCH=main
```

### Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
"# venda-whatsapp-ads" 
