# Deploy no Portainer com domínio próprio

## Pré-requisitos no servidor

- Docker + Portainer instalado
- Traefik rodando como reverse proxy (rede `traefik-public`)
- Domínio apontando para o IP do servidor

---

## Passo 1 — Copiar o projeto para o servidor

```bash
# No seu PC, gere o zip ou use git
git init && git add . && git commit -m "init"

# No servidor (via SSH)
git clone <seu-repo> /opt/roberto-venda
cd /opt/roberto-venda
```

---

## Passo 2 — Criar o arquivo .env no servidor

```bash
cp .env.production .env
nano .env   # preencha todos os valores
```

Valores obrigatórios:
```env
NEXT_PUBLIC_SUPABASE_URL=https://escdmjjdgshauujdiusf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
NEXTAUTH_SECRET=++IHX+ZrFicI6gSp2sBIoNunRUSznWLN7HhQaeLwTLE=
NEXTAUTH_URL=https://SEU_DOMINIO.com.br
DOMAIN=SEU_DOMINIO.com.br
WEBHOOK_SECRET=roberto_venda_secret_2026
```

---

## Passo 3 — Deploy via Portainer

### Opção A — Stack no Portainer (recomendado)

1. Acesse o Portainer → **Stacks → Add Stack**
2. Nome: `roberto-venda`
3. Cole o conteúdo do `docker-compose.yml`
4. Em **Environment variables**, adicione cada variável do `.env`
5. Clique em **Deploy the stack**

### Opção B — Terminal no servidor

```bash
cd /opt/roberto-venda
docker compose --env-file .env up -d --build
```

---

## Passo 4 — Verificar se subiu

```bash
docker logs roberto-venda-app --tail 50
```

Deve aparecer:
```
▲ Next.js 16.x.x
✓ Ready in Xms
```

Acesse: **https://SEU_DOMINIO.com.br**

---

## Passo 5 — Configurar Evolution API

No painel da sua Evolution API, adicione o webhook:

| Campo | Valor |
|---|---|
| URL | `https://SEU_DOMINIO.com.br/api/webhooks/whatsapp` |
| Header | `x-webhook-secret: roberto_venda_secret_2026` |
| Eventos | `messages.upsert` |

---

## Atualizar após mudanças no código

```bash
cd /opt/roberto-venda
git pull
docker compose --env-file .env up -d --build
```

Ou via Portainer → Stack → **Pull and redeploy**

---

## Traefik — se ainda não tiver configurado

Se não usa Traefik, remova os `labels` do `docker-compose.yml` e use Nginx:

```nginx
server {
    server_name SEU_DOMINIO.com.br;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
certbot --nginx -d SEU_DOMINIO.com.br
```
