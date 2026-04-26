# Venda WhatsApp Ads — Contexto do Projeto

## O que é
SaaS multi-tenant para rastreamento de leads via WhatsApp com atribuição de campanhas Meta Ads (Facebook/Instagram).
Clientes ativos: **MM Clean**, **Yas**, **Master San**.

## Stack
- **Next.js 16** App Router (TypeScript)
- **Supabase** PostgreSQL — projeto `escdmjjdgshauujdiusf.supabase.co`
- **Evolution API v2.3.7** (Baileys/WhatsApp Web) — instâncias: `mmclean`, `yas`, `mastersan`
- **Meta Conversions API (CAPI)** — tokens por cliente na tabela `meta_accounts`
- **Docker** no servidor `91.99.98.84:2277` (user: root, key: `~/.ssh/id_venda`)
- Webhook interno: `http://172.19.0.1:3000/api/webhooks/whatsapp`

## Como funciona
1. Lead clica no anúncio CTWA (Click-to-WhatsApp) no Meta Ads
2. Mensagem chega via Evolution API → webhook → `lib/webhooks/process-whatsapp.ts`
3. `extractAdsData()` extrai dados da campanha do payload e salva na tabela `leads`
4. CAPI dispara evento `Lead` (e `Purchase` quando vendido) de volta ao Meta

## Arquivos críticos
| Arquivo | Função |
|---------|--------|
| `lib/webhooks/process-whatsapp.ts` | Core do webhook — extrai CTWA, deduplica, cria leads |
| `lib/actions/leads.ts` | CRUD de leads, stats do dashboard, disparo CAPI |
| `.env` | Supabase URL, WEBHOOK_SECRET |
| `.deploy.env` | SSH_HOST, SSH_KEY, REMOTE_DIR (não commitado) |
| `deploy.sh` | Script de deploy: push GitHub + rebuild Docker no servidor |

## Lógica de atribuição CTWA (`extractAdsData`)
Verifica 4+1 prioridades no payload da Evolution API:
1. `data.message.*.contextInfo.externalAdReply` com `ctwaClid` (melhor caso — tem ad_id)
2. `data.contextInfo.externalAdReply` com `ctwaClid`
3. `data.contextInfo.externalAdReply` com `sourceId`
3.5. ⚡ **`data.contextInfo.conversionSource === 'FB_Ads'`** ← fix aplicado em 26/03/2026
   (Evolution API às vezes omite `externalAdReply` mas envia `conversionSource`)
4. Fallback: `externalAdReply` dentro da mensagem

## Deploy
```bash
# No Git Bash (Windows):
cd /c/Users/thali/claude/venda-whatsapp-ads
./deploy.sh
```
Se aparecer erro de lock: `rm -f .git/index.lock`

## Histórico de correções (26/03/2026)
- **Bug**: leads CTWA sendo salvos como `platform: "unknown"` em vez de `facebook`/`instagram`
  **Causa**: Evolution API manda `conversionSource: "FB_Ads"` sem `externalAdReply`; código só lia `externalAdReply`
  **Fix**: Prioridade 3.5 em `extractAdsData()` — checar `conversionSource` como fallback
  **Retroativo**: 2 leads corrigidos via SQL (Daiane/Yas→instagram, Leandro/MM Clean→facebook)

- **Bug**: Master San sem receber nenhum lead
  **Causa**: Webhook na Evolution API estava preenchido mas nunca foi salvo
  **Fix**: Abrir Evolution API Manager → instância `mastersan` → Webhook → clicar Save

## Pendências / próximas melhorias
- [ ] Verificar se leads do Master San começaram a chegar após ativação do webhook
- [ ] Monitorar primeiros leads pós-fix para confirmar atribuição correta
- [ ] Considerar salvar `ctwaClid` mesmo quando `externalAdReply` é parcial (só `conversionSource`)
- [ ] Dashboard: separar contagem de leads orgânicos vs Meta Ads por cliente
