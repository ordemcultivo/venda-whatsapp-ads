# roberto_venda — Documento de Design do Projeto

> Sistema SaaS multi-tenant para rastreamento de conversas do WhatsApp com atribuição a campanhas de Meta Ads e Google Ads.

---

## 1. Visão Geral

**O que é**: Plataforma **multi-cliente** que conecta conversas do WhatsApp a campanhas de anúncios, identificando qual campanha, conjunto e anúncio gerou cada lead e venda — e devolvendo esses eventos ao Meta CAPI e Google Ads Offline Conversions para otimização automática dos algoritmos.

**Para quem**: Roberto gerencia múltiplas contas de clientes. Cada cliente tem sua própria conta Meta Ads, pixel, número de WhatsApp e dashboard isolado.

**Modelo**: Uso interno (self-hosted) + possível abertura futura como SaaS.

---

## 2. Funcionalidades do Sistema

### 2.1 Rastreamento de Leads
- Geração de **links rastreáveis** com UTMs para uso nos anúncios
- Captura automática de origem ao primeiro contato no WhatsApp:
  - `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`
  - `fbclid` (Facebook Click ID para Meta Ads)
  - `gclid` (Google Click ID para Google Ads)
  - Nome da Campanha, Conjunto e Anúncio (via parâmetros dinâmicos do Meta)
  - Plataforma: Facebook, Instagram, Google, Direto
- Associação do número de WhatsApp ao lead de origem

### 2.2 Jornada de Compra (Funil CRM)
- Etapas configuráveis por cliente:
  - **Novo Contato** — lead entrou em contato
  - **Qualificado** — lead foi qualificado pelo atendente
  - **Negociação** — proposta enviada
  - **Vendido** — venda confirmada (com valor R$)
- Avanço via interface ou via **keyword no WhatsApp** (ex.: `#venda`, `#qualificado`)
- Registro de valor de conversão em BRL

### 2.3 Disparo de Eventos (Meta CAPI)
- Ao classificar um lead, disparo automático via **Meta Conversions API**:
  - Novo Contato → evento `Contact`
  - Qualificado → evento `Lead`
  - Vendido → evento `Purchase` (com `value` e `currency: BRL`)
- Hash SHA256 obrigatório do telefone (`ph`)
- Suporte a `event_id` para deduplicação com Pixel client-side
- Fila de reenvio em caso de falha

### 2.4 Envio de Conversões ao Google Ads
- Ao marcar como Vendido, envio via **Google Ads Offline Conversion API**
- Associação por `gclid` capturado no link rastreável
- Valor e moeda da conversão

### 2.5 Dashboard Principal
- **Cards de KPIs**: Total de Leads, Vendas Realizadas, Valor Total Vendido
- **Gráfico de linha**: Leads ao longo do tempo (por dia)
- **Donut**: Status dos leads (Novos, Qualificados, Vendidos)
- **Tabela de leads**: Data, Nome, Sobrenome, ID do cliente (WhatsApp), Campanha, Conjunto, Anúncio, Valor da Conversão, Plataforma (ícone FB/IG/Google), Ações
- Filtro por cliente e período
- Botão **"Criar Link para Cliente"** — gerador de link rastreável

### 2.6 Dashboard de Conversas (por cliente)
- Total de conversas novas, rastreadas vs. não rastreadas
- Origem das conversas: Meta Ads / Google Ads / Outras / Não rastreada
- Gráfico de barras empilhadas por dia e por origem
- Funil da jornada de compra com %
- Vendas: total, taxa de conversão (%), faturamento total

### 2.7 Dash Meta (Métricas do Gerenciador)
- Métricas direto da **Meta Marketing API** (leitura):
  - Gastos, Impressões, Cliques no Link, Leads
  - Mensagens do Gerenciador, Compras, Valor de Conversão
  - ROAS, Ticket Médio, CPC, CPM, CTR
- Gráfico: Desempenho por Campanha (gastos vs. leads)
- Donut: Distribuição de gastos por campanha
- Filtro por conta de anúncio e período

### 2.8 Relatórios
- KPIs consolidados: Total de Leads, Vendas, Leads Qualificados, Taxa de Conversão, Valor Total
- Anúncios que mais trouxeram leads (donut + lista ranqueada)
- Plataformas que mais trouxeram leads (Facebook vs. Instagram vs. Google)
- Anúncios que mais geraram vendas
- Plataformas que mais geraram vendas
- Filtro por cliente e período

### 2.9 Autenticação e Controle de Acesso

O sistema tem **dois tipos de usuário**, com experiências completamente diferentes:

#### Perfil ADMIN — Roberto
- Login único com e-mail e senha próprios
- Acesso a **todos os clientes**
- Seletor de cliente no topo do dashboard (dropdown) para alternar sem relogin
- Pode **criar, editar e excluir** clientes
- Pode **criar login e senha** para cada cliente
- Vê painel Admin: lista de todos os clientes, status das conexões
- Únicas telas que o ADMIN tem a mais: `/admin`, troca de cliente no header

#### Perfil CLIENT — cada cliente
- Login com e-mail e senha **criados pelo Roberto**
- Ao fazer login, vai direto para o próprio dashboard
- **Vê APENAS os próprios dados** — sem seletor de cliente, sem acesso a outros
- Não enxerga configurações de outros clientes nem dados de outros leads
- Não pode criar/editar configurações — somente visualizar
- Telas disponíveis: Dashboard, Relatórios, Dash Meta (leitura)

#### Fluxo de criação de acesso para cliente
```
Roberto (ADMIN) → /admin/clientes/novo
  → Preenche: nome, e-mail do cliente, senha temporária
  → Sistema cria Client + User com role=CLIENT vinculado
  → Roberto envia login/senha para o cliente
  → Cliente acessa /login → vê apenas seus dados
```

#### Isolamento garantido em todas as queries
```typescript
// Toda query no sistema passa por este filtro:
// Se role === CLIENT → WHERE clientId = session.clientId (hardcoded)
// Se role === ADMIN  → WHERE clientId = selectedClientId (dropdown)
// Nunca há acesso cruzado entre clientes
```

### 2.10 Integrações WhatsApp
- **Evolution API** (self-hosted) — primária
- **Uazapi API** — alternativa
- **API Premium** — para volume alto
- Configuração por cliente: qual API + instância

### 2.11 Configurações e Admin
- Conectar conta Meta Ads (OAuth)
- Gerenciar instâncias WhatsApp
- Gerenciar usuários e permissões
- Área Admin: ver todos os clientes, gerenciar planos/ofertas

---

## 3. Arquitetura Técnica

### 3.1 Stack

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Frontend | Next.js 16 (App Router) | SSR, Server Actions, streaming |
| UI | shadcn/ui + Tailwind CSS | Componentes prontos, dark mode |
| Gráficos | Recharts | Lightweight, compatível com React |
| Banco de dados | PostgreSQL 16 | Relacional, suporte a JSONB |
| Cache / filas | Redis 7 | Cache de sessão, fila de eventos CAPI |
| Auth | NextAuth.js v5 (Auth.js) | JWT + sessions, fácil extensão |
| ORM | Prisma | Type-safe, migrations |
| Reverse proxy | Nginx Proxy Manager | UI visual, SSL automático (Let's Encrypt) |
| Containerização | Docker + Docker Compose | Deploy consistente |
| Gerenciamento | Portainer CE | UI de containers |
| Filas (opcional) | BullMQ + Redis | Reenvio de eventos CAPI com retry |

### 3.2 Diagrama de Arquitetura

```
Internet
    │
    ▼
┌──────────────────────┐
│  Nginx Proxy Manager │  (SSL, domínio, roteamento)
└──────────┬───────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌────────┐   ┌─────────┐
│Next.js │   │Evolution│
│  App   │   │  API    │
│:3000   │   │:8080    │
└───┬────┘   └────┬────┘
    │              │
    │  webhooks    │
    │◄─────────────┘
    │
    ├──► PostgreSQL :5432
    ├──► Redis :6379
    └──► Meta CAPI (https://graph.facebook.com)
         Google Ads API
         Meta Marketing API
```

### 3.3 Estrutura do Projeto Next.js

```
roberto-venda/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx          # Login único para ADMIN e CLIENT
│   ├── (admin)/                    # Só acessível por role=ADMIN
│   │   ├── layout.tsx              # Sidebar com seletor de cliente
│   │   ├── admin/
│   │   │   ├── page.tsx            # Lista todos os clientes
│   │   │   └── clientes/
│   │   │       ├── novo/page.tsx   # Criar cliente + login/senha
│   │   │       └── [id]/page.tsx   # Editar cliente
│   │   ├── dashboard/page.tsx      # Dashboard (com seletor de cliente)
│   │   ├── relatorios/page.tsx
│   │   ├── meta-ads/page.tsx
│   │   ├── google-ads/page.tsx
│   │   └── configuracoes/page.tsx
│   ├── (cliente)/                  # Só acessível por role=CLIENT
│   │   ├── layout.tsx              # Sidebar SEM seletor (cliente fixo)
│   │   ├── dashboard/page.tsx      # Vê apenas próprios dados
│   │   ├── relatorios/page.tsx
│   │   └── meta-ads/page.tsx
│   └── api/
│       ├── auth/[...nextauth]/route.ts  # NextAuth
│       ├── webhook/
│       │   ├── evolution/route.ts       # Público — recebe eventos
│       │   └── uazapi/route.ts
│       ├── leads/route.ts               # Protegido — filtra por clientId
│       ├── conversao/route.ts
│       ├── links/route.ts
│       ├── clientes/route.ts            # Só ADMIN
│       ├── meta/
│       │   ├── capi/route.ts
│       │   └── insights/route.ts
│       └── google/
│           └── conversions/route.ts
├── middleware.ts                    # Guarda rotas + redireciona por role
├── lib/
│   ├── auth.ts                     # Config NextAuth + helpers de role
│   ├── prisma.ts
│   ├── redis.ts
│   ├── meta-capi.ts
│   ├── meta-marketing.ts
│   ├── google-ads.ts
│   └── tracking.ts
├── prisma/schema.prisma
├── docker-compose.yml
├── docker-compose.prod.yml
├── Dockerfile
└── .env.example
```

---

## 4. Banco de Dados (Schema Prisma)

```prisma
enum Role {
  ADMIN   // Roberto — acessa todos os clientes
  CLIENT  // Cada cliente — acessa apenas seus dados
}

// Usuário do sistema
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  name         String?
  passwordHash String
  role         Role     @default(CLIENT)
  // Se role=CLIENT, este campo aponta para o cliente vinculado
  clientId     String?  @unique
  client       Client?  @relation("UserClient", fields: [clientId], references: [id])
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

// Cliente gerenciado por Roberto
model Client {
  id              String   @id @default(cuid())
  // Usuário CLIENT vinculado (login do próprio cliente)
  user            User?    @relation("UserClient")
  name            String
  slug            String   @unique  // identificador único (ex: mtp-pecas)
  whatsappNumber  String?
  whatsappApi     String   @default("evolution") // evolution | uazapi | premium
  whatsappApiKey  String?
  metaPixelId     String?
  metaAccessToken String?
  metaAdAccountId String?
  googleAdsId     String?
  createdAt       DateTime @default(now())
  leads           Lead[]
  trackingLinks   TrackingLink[]
}

// Link rastreável gerado para os anúncios
model TrackingLink {
  id          String   @id @default(cuid())
  clientId    String
  client      Client   @relation(fields: [clientId], references: [id])
  name        String   // nome amigável ex: "Camp. Junho - Stories"
  utmSource   String?
  utmMedium   String?
  utmCampaign String?
  utmContent  String?
  utmTerm     String?
  shortCode   String   @unique  // código curto para o link
  whatsappUrl String   // URL final do WhatsApp com UTMs
  clicks      Int      @default(0)
  createdAt   DateTime @default(now())
  leads       Lead[]
}

// Lead/contato capturado
model Lead {
  id               String    @id @default(cuid())
  clientId         String
  client           Client    @relation(fields: [clientId], references: [id])
  trackingLinkId   String?
  trackingLink     TrackingLink? @relation(fields: [trackingLinkId], references: [id])

  // Dados do contato
  phone            String    // número WhatsApp (ex: 5511999999999)
  phoneHashed      String    // SHA256 para CAPI
  firstName        String?
  lastName         String?

  // Origem / Atribuição
  platform         String?   // facebook | instagram | google | direct
  utmSource        String?
  utmMedium        String?
  utmCampaign      String?
  utmContent       String?
  utmTerm          String?
  fbclid           String?   // Facebook Click ID
  gclid            String?   // Google Click ID
  campaignName     String?   // nome da campanha Meta
  adsetName        String?   // nome do conjunto
  adName           String?   // nome do anúncio

  // Funil
  status           LeadStatus @default(NOVO)
  conversionValue  Float?    // valor da venda em BRL
  currency         String    @default("BRL")

  // Meta CAPI
  capiContactSent  Boolean   @default(false)
  capiLeadSent     Boolean   @default(false)
  capiPurchaseSent Boolean   @default(false)

  // Google Ads
  googleConvSent   Boolean   @default(false)

  contactedAt      DateTime  @default(now())
  qualifiedAt      DateTime?
  soldAt           DateTime?
  updatedAt        DateTime  @updatedAt
  events           LeadEvent[]
}

enum LeadStatus {
  NOVO
  QUALIFICADO
  NEGOCIACAO
  VENDIDO
  PERDIDO
}

// Histórico de eventos do lead
model LeadEvent {
  id        String   @id @default(cuid())
  leadId    String
  lead      Lead     @relation(fields: [leadId], references: [id])
  type      String   // STATUS_CHANGE | CAPI_SENT | CAPI_ERROR | NOTE
  payload   Json?
  createdAt DateTime @default(now())
}
```

---

## 5. Fluxo de Rastreamento

### 5.1 Quando um lead entra pelo WhatsApp

```
1. Anúncio tem link com UTMs:
   wa.me/5511999999999?text=Olá!&utm_source=facebook&utm_campaign=junho25&...

2. Usuário clica → abre WhatsApp → envia mensagem

3. Evolution API recebe o evento e dispara webhook para:
   POST /api/webhook/evolution

4. Next.js processa:
   - Extrai número de telefone (remoteJid)
   - Busca cliente pelo número de destino
   - Recupera UTMs do banco (associados ao número de destino)
   - Cria Lead no banco com status NOVO
   - Dispara evento Contact para Meta CAPI (assíncrono via fila Redis)

5. Lead aparece no dashboard em tempo real
```

### 5.2 Quando o atendente digita #venda

```
1. Evolution API detecta mensagem com fromMe: true + texto contém "#venda"

2. Webhook chega em POST /api/webhook/evolution

3. Next.js:
   - Localiza lead pelo telefone do remoteJid
   - Muda status para VENDIDO
   - Salva valor se vier junto: "#venda 1500" → conversionValue: 1500
   - Envia evento Purchase para Meta CAPI
   - Envia Offline Conversion para Google Ads (se tiver gclid)

4. Dashboard atualiza os KPIs
```

### 5.3 Keywords disponíveis (configuráveis)
| Keyword | Ação | Evento CAPI |
|---|---|---|
| `#novo` | Status → NOVO | Contact |
| `#qualificado` | Status → QUALIFICADO | Lead |
| `#negociacao` | Status → NEGOCIAÇÃO | — |
| `#venda [valor]` | Status → VENDIDO | Purchase |
| `#perdido` | Status → PERDIDO | — |

---

## 6. Infraestrutura Docker

### 6.1 docker-compose.yml (desenvolvimento)

```yaml
version: '3.8'

services:
  app:
    build: .
    container_name: roberto-venda-app
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/roberto_venda
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next

  db:
    image: postgres:16-alpine
    container_name: roberto-venda-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: roberto_venda
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    container_name: roberto-venda-redis
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

volumes:
  postgres_data:
  redis_data:
```

### 6.2 docker-compose.prod.yml (produção com Portainer)

```yaml
version: '3.8'

services:
  app:
    image: roberto-venda:latest
    container_name: roberto-venda-app
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=https://${DOMAIN}
      - META_APP_ID=${META_APP_ID}
      - META_APP_SECRET=${META_APP_SECRET}
    networks:
      - proxy
      - internal
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.roberto-venda.rule=Host(`${DOMAIN}`)"
      - "traefik.http.routers.roberto-venda.tls.certresolver=letsencrypt"

  db:
    image: postgres:16-alpine
    container_name: roberto-venda-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: roberto_venda
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - internal

  redis:
    image: redis:7-alpine
    container_name: roberto-venda-redis
    restart: unless-stopped
    volumes:
      - redis_data:/data
    networks:
      - internal

  nginx-proxy-manager:
    image: jc21/nginx-proxy-manager:latest
    container_name: nginx-proxy-manager
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "81:81"   # UI do NPM
    volumes:
      - npm_data:/data
      - npm_letsencrypt:/etc/letsencrypt
    networks:
      - proxy

  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: unless-stopped
    ports:
      - "9000:9000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    networks:
      - proxy

networks:
  proxy:
    external: true
  internal:

volumes:
  postgres_data:
  redis_data:
  npm_data:
  npm_letsencrypt:
  portainer_data:
```

### 6.3 Dockerfile

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## 7. Variáveis de Ambiente

```env
# App
NEXTAUTH_SECRET=sua_chave_secreta_aqui
NEXTAUTH_URL=https://seudominio.com
NODE_ENV=production

# Database
DATABASE_URL=postgresql://usuario:senha@db:5432/roberto_venda

# Redis
REDIS_URL=redis://redis:6379

# Meta (Facebook)
META_APP_ID=seu_app_id
META_APP_SECRET=seu_app_secret
META_VERIFY_TOKEN=token_verificacao_webhook

# Evolution API
EVOLUTION_API_URL=https://evolution.seudominio.com
EVOLUTION_API_KEY=sua_chave_evolution

# Google Ads (futuro)
GOOGLE_ADS_DEVELOPER_TOKEN=
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=
```

---

## 8. Telas / Rotas da Aplicação

| Rota | Tela | Acesso |
|---|---|---|
| `/login` | Login | Público |
| `/dashboard` | Dashboard | ADMIN + CLIENT (dados filtrados) |
| `/relatorios` | Relatórios | ADMIN + CLIENT |
| `/meta-ads` | Dash Meta | ADMIN + CLIENT |
| `/google-ads` | Google Ads (futuro) | ADMIN + CLIENT |
| `/configuracoes` | Configurações | ADMIN + CLIENT |
| `/admin` | Lista todos os clientes | Só ADMIN |
| `/admin/clientes/novo` | Criar cliente + login | Só ADMIN |
| `/admin/clientes/[id]` | Editar cliente | Só ADMIN |
| `/r/[shortCode]` | Redirect rastreável → WhatsApp | Público |

**Comportamento do middleware por role:**
- `ADMIN` → acessa tudo + vê seletor de cliente no header
- `CLIENT` → acessa somente suas páginas, clientId fixo na sessão, sem `/admin`
- Não autenticado → redireciona para `/login`

---

## 9. Roadmap de Desenvolvimento

### Fase 1 — MVP (Meta Ads) ✅ Prioridade
- [ ] Setup do projeto Next.js 16 + shadcn/ui + Prisma
- [ ] Auth (login, register, sessão)
- [ ] CRUD de clientes (workspaces)
- [ ] Geração de links rastreáveis + redirect tracker
- [ ] Webhook Evolution API → captura de leads + UTMs
- [ ] Dashboard principal (tabela de leads + KPIs + gráficos)
- [ ] Classificação manual de leads (Qualificado / Vendido)
- [ ] Keywords automáticas (#venda, #qualificado)
- [ ] Meta CAPI — envio de eventos Contact, Lead, Purchase
- [ ] Dashboard de conversas (origem, funil, vendas)
- [ ] Docker Compose + deploy no servidor

### Fase 2 — Meta Ads Completo
- [ ] Dash Meta (Meta Marketing API — leitura de métricas)
- [ ] Conexão OAuth com conta Meta Ads
- [ ] Relatórios de atribuição (anúncio → leads → vendas)
- [ ] Dashboard compartilhável para o cliente
- [ ] Filas BullMQ para reenvio de eventos CAPI com retry

### Fase 3 — Google Ads
- [ ] Webhook Uazapi API
- [ ] Captura de `gclid` nos links rastreáveis
- [ ] Google Ads Offline Conversions API
- [ ] Dash Google Ads (métricas do Google)

### Fase 4 — Escala / SaaS
- [ ] Multi-tenant completo com planos
- [ ] Cobrança com Stripe
- [ ] API Premium (volume alto)
- [ ] Alertas e notificações
- [ ] Exportação CSV/Excel

---

## 10. Integração com n8n (existente)

O arquivo `evolution-meta-capi.json` já existente serve como **fallback manual** e pode coexistir com o sistema.

O sistema substituirá gradualmente o n8n para o fluxo principal:

| Função | n8n (atual) | roberto_venda (novo) |
|---|---|---|
| Receber webhook Evolution | ✅ via n8n Webhook | ✅ via `/api/webhook/evolution` |
| Filtrar por keyword `#venda` | ✅ nó IF | ✅ lógica no route handler |
| Hash SHA256 do telefone | ✅ nó Code | ✅ `lib/meta-capi.ts` |
| Enviar para Meta CAPI | ✅ HTTP Request | ✅ com retry via Redis queue |
| Salvar lead no banco | ❌ não tem | ✅ PostgreSQL |
| Dashboard de atribuição | ❌ não tem | ✅ Next.js |
| Dash Meta (métricas) | ❌ não tem | ✅ Meta Marketing API |

---

## 11. Passos para Deploy no Servidor

```bash
# 1. No servidor, criar a rede proxy compartilhada
docker network create proxy

# 2. Clonar o repositório
git clone https://github.com/seu-usuario/roberto-venda.git
cd roberto-venda

# 3. Copiar e preencher as variáveis de ambiente
cp .env.example .env.production
nano .env.production

# 4. Buildar a imagem
docker build -t roberto-venda:latest .

# 5. Subir todos os serviços
docker compose -f docker-compose.prod.yml up -d

# 6. Rodar migrations do banco
docker exec roberto-venda-app npx prisma migrate deploy

# 7. Acessar Nginx Proxy Manager em:
#    http://SEU_IP:81
#    → Adicionar proxy host: seudominio.com → roberto-venda-app:3000
#    → Ativar SSL com Let's Encrypt

# 8. Acessar Portainer em:
#    http://SEU_IP:9000
```

---

## 12. Design Visual

- **Modo**: Dark mode como padrão (conforme screenshots do roberto_venda)
- **Cores**:
  - Background: `zinc-900` / `zinc-950`
  - Cards: `zinc-800`
  - Acento: azul `#3B82F6` (leads) + verde `#22C55E` (vendas)
  - Texto primário: `zinc-100`
  - Texto secundário: `zinc-400`
- **Fonte**: Geist Sans (Vercel) para UI, Geist Mono para IDs e números
- **Gráficos**: Recharts com tema escuro
- **Sidebar**: fixa, colapsável, ícones + labels
- **Tabela de leads**: striped, com badges coloridos por status
