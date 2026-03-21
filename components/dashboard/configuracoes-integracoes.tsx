'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, MessageCircle, BarChart2, QrCode, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { saveWhatsappConfig, saveMetaConfig } from '@/lib/actions/configuracoes'

interface Props {
  client: {
    whatsapp_instance?: string | null
    whatsapp_token?: string | null
  } | null
  meta: {
    account_id?: string | null
    pixel_id?: string | null
    access_token?: string | null
  } | null
  webhookUrl: string
  webhookSecret: string
}

export function ConfiguracoesIntegracoes({ client, meta, webhookUrl, webhookSecret }: Props) {
  const [whatsapp, setWhatsapp] = useState({
    whatsapp_instance: client?.whatsapp_instance ?? '',
    whatsapp_token: client?.whatsapp_token ?? '',
    provider: 'evolution',
  })
  const [metaForm, setMetaForm] = useState({
    account_id: meta?.account_id ?? '',
    pixel_id: meta?.pixel_id ?? '',
    access_token: '',
  })
  const [loadingWpp, setLoadingWpp] = useState(false)
  const [loadingMeta, setLoadingMeta] = useState(false)
  const [savedWpp, setSavedWpp] = useState(false)
  const [savedMeta, setSavedMeta] = useState(false)
  const [errorWpp, setErrorWpp] = useState('')
  const [errorMeta, setErrorMeta] = useState('')

  // QR Code state
  const [qrcode, setQrcode] = useState<string | null>(null)
  const [qrStatus, setQrStatus] = useState<'idle' | 'loading' | 'connected' | 'error'>('idle')
  const [qrError, setQrError] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Para o polling
  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  // Inicia polling de status a cada 3s
  const startPolling = useCallback(() => {
    stopPolling()
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/whatsapp/status', { cache: 'no-store' })
        const data = await res.json()
        if (data.state === 'open') {
          setQrStatus('connected')
          setQrcode(null)
          stopPolling()
        }
      } catch {
        // ignora erros de polling
      }
    }, 3000)
  }, [stopPolling])

  // Limpa polling ao desmontar
  useEffect(() => () => stopPolling(), [stopPolling])

  async function handleWpp(e: React.FormEvent) {
    e.preventDefault()
    setLoadingWpp(true)
    setErrorWpp('')
    try {
      await saveWhatsappConfig(whatsapp)
      setSavedWpp(true)
      setTimeout(() => setSavedWpp(false), 3000)
    } catch (err: any) {
      setErrorWpp(err.message)
    } finally {
      setLoadingWpp(false)
    }
  }

  async function handleMeta(e: React.FormEvent) {
    e.preventDefault()
    setLoadingMeta(true)
    setErrorMeta('')
    try {
      await saveMetaConfig(metaForm)
      setSavedMeta(true)
      setMetaForm(p => ({ ...p, access_token: '' }))
      setTimeout(() => setSavedMeta(false), 3000)
    } catch (err: any) {
      setErrorMeta(err.message)
    } finally {
      setLoadingMeta(false)
    }
  }

  const fetchQrCode = useCallback(async () => {
    stopPolling()
    setQrStatus('loading')
    setQrError('')
    setQrcode(null)
    try {
      const res = await fetch('/api/whatsapp/qrcode', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao buscar QR code')
      if (data.status === 'open') {
        setQrStatus('connected')
        setQrcode(null)
      } else if (data.qrcode) {
        setQrcode(data.qrcode)
        setQrStatus('idle')
        startPolling() // inicia verificação automática de conexão
      } else {
        throw new Error('QR code não disponível')
      }
    } catch (err: any) {
      setQrStatus('error')
      setQrError(err.message)
    }
  }, [stopPolling, startPolling])

  const isInstanceConfigured = !!client?.whatsapp_instance && !!client?.whatsapp_token

  // Criar instância automática
  const [newInstanceName, setNewInstanceName] = useState('')
  const [creatingInstance, setCreatingInstance] = useState(false)
  const [createError, setCreateError] = useState('')

  async function handleCreateInstance() {
    if (!newInstanceName.trim()) return
    setCreatingInstance(true)
    setCreateError('')
    try {
      const res = await fetch('/api/whatsapp/create-instance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName: newInstanceName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao criar instância')
      // Atualiza form com dados gerados
      setWhatsapp(p => ({ ...p, whatsapp_instance: data.instanceName, whatsapp_token: data.token }))
      setNewInstanceName('')
      if (data.qrcode) {
        setQrcode(data.qrcode)
        startPolling()
      } else {
        // Busca QR code logo após criar
        setTimeout(fetchQrCode, 1500)
      }
    } catch (err: any) {
      setCreateError(err.message)
    } finally {
      setCreatingInstance(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* WhatsApp */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            WhatsApp
            {isInstanceConfigured && qrStatus !== 'connected' && (
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] h-5 ml-1">
                Configurado
              </Badge>
            )}
            {qrStatus === 'connected' && (
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] h-5 ml-1 gap-1">
                <Wifi className="w-2.5 h-2.5" /> Conectado
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Criar nova instância (se ainda não configurado) */}
          {!isInstanceConfigured && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4 space-y-3">
              <p className="text-xs font-medium text-emerald-400">Criar nova instância automaticamente</p>
              <p className="text-xs text-muted-foreground">Digite um nome e clique em Criar — a instância será criada na Evolution API e o QR code aparecerá para escanear.</p>
              <div className="flex gap-2">
                <Input
                  placeholder="ex: mmclean-whatsapp"
                  value={newInstanceName}
                  onChange={e => setNewInstanceName(e.target.value)}
                  className="h-8 text-sm flex-1"
                  onKeyDown={e => e.key === 'Enter' && handleCreateInstance()}
                />
                <Button
                  size="sm"
                  onClick={handleCreateInstance}
                  disabled={creatingInstance || !newInstanceName.trim()}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {creatingInstance ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <QrCode className="w-3.5 h-3.5" />}
                  {creatingInstance ? 'Criando...' : 'Criar e Conectar'}
                </Button>
              </div>
              {createError && <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded">{createError}</p>}
              <div className="border-t border-border/30 pt-3">
                <p className="text-xs text-muted-foreground">Ou configure manualmente abaixo:</p>
              </div>
            </div>
          )}

          <form onSubmit={handleWpp} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Provedor</Label>
                <div className="flex gap-2">
                  {['evolution', 'uazapi'].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setWhatsapp(prev => ({ ...prev, provider: p }))}
                      className={`flex-1 h-8 text-xs rounded-md border transition-colors ${
                        whatsapp.provider === p
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border/50 text-muted-foreground hover:border-border'
                      }`}
                    >
                      {p === 'evolution' ? 'Evolution API' : 'Uazapi'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nome da Instância</Label>
                <Input
                  placeholder="ex: minha-empresa"
                  value={whatsapp.whatsapp_instance}
                  onChange={e => setWhatsapp(p => ({ ...p, whatsapp_instance: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Token / API Key</Label>
              <Input
                placeholder="Token de autenticação da instância"
                type="password"
                value={whatsapp.whatsapp_token}
                onChange={e => setWhatsapp(p => ({ ...p, whatsapp_token: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>

            {/* URL do Webhook */}
            <div className="bg-secondary/40 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Configure este webhook no seu provedor:</p>
              <div className="font-mono text-xs break-all text-foreground bg-background/50 rounded p-2">{webhookUrl}</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Header:</span>
                <code className="bg-background/50 px-2 py-0.5 rounded text-[11px]">x-webhook-secret: {webhookSecret}</code>
              </div>
              <p className="text-xs text-muted-foreground">Evento: <code className="bg-background/50 px-1 rounded">messages.upsert</code></p>
            </div>

            {errorWpp && <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded">{errorWpp}</p>}
            <div className="flex justify-end gap-2">
              <Button type="submit" size="sm" disabled={loadingWpp} className="gap-2">
                {loadingWpp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedWpp ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                {savedWpp ? 'Salvo!' : 'Salvar'}
              </Button>
            </div>
          </form>

          {/* QR Code Section */}
          {isInstanceConfigured && (
            <div className="border-t border-border/50 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Conectar WhatsApp</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1.5"
                  onClick={fetchQrCode}
                  disabled={qrStatus === 'loading'}
                >
                  {qrStatus === 'loading'
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : qrcode
                    ? <RefreshCw className="w-3 h-3" />
                    : <QrCode className="w-3 h-3" />
                  }
                  {qrcode ? 'Atualizar QR' : 'Gerar QR Code'}
                </Button>
              </div>

              {qrStatus === 'connected' && (
                <div className="flex items-center gap-2 text-emerald-400 text-xs bg-emerald-500/10 rounded-lg px-3 py-2.5">
                  <Wifi className="w-4 h-4" />
                  <span>WhatsApp conectado com sucesso!</span>
                </div>
              )}

              {qrStatus === 'error' && (
                <div className="flex items-center gap-2 text-destructive text-xs bg-destructive/10 rounded-lg px-3 py-2.5">
                  <WifiOff className="w-4 h-4" />
                  <span>{qrError}</span>
                </div>
              )}

              {qrcode && qrStatus !== 'connected' && (
                <div className="flex flex-col items-center gap-2">
                  <div className="bg-white p-3 rounded-xl inline-block">
                    <img
                      src={qrcode}
                      alt="QR Code WhatsApp"
                      width={200}
                      height={200}
                      className="block"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Abra o WhatsApp → Dispositivos conectados → Conectar dispositivo
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs gap-1 text-muted-foreground"
                    onClick={fetchQrCode}
                  >
                    <RefreshCw className="w-3 h-3" /> Atualizar QR Code
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meta Ads */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-blue-400" />
            Meta Ads
            {meta?.account_id && (
              <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-[10px] h-5 ml-1">
                Configurado
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleMeta} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Meta Account ID</Label>
                <Input
                  placeholder="act_123456789"
                  value={metaForm.account_id}
                  onChange={e => setMetaForm(p => ({ ...p, account_id: e.target.value }))}
                  className="h-8 text-sm font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Pixel ID</Label>
                <Input
                  placeholder="123456789"
                  value={metaForm.pixel_id}
                  onChange={e => setMetaForm(p => ({ ...p, pixel_id: e.target.value }))}
                  className="h-8 text-sm font-mono"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Access Token{' '}
                {meta?.access_token && (
                  <span className="text-muted-foreground">(configurado — deixe em branco para manter)</span>
                )}
              </Label>
              <Input
                placeholder="EAABsbCS..."
                type="password"
                value={metaForm.access_token}
                onChange={e => setMetaForm(p => ({ ...p, access_token: e.target.value }))}
                className="h-8 text-sm font-mono"
              />
            </div>
            {errorMeta && <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded">{errorMeta}</p>}
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={loadingMeta} className="gap-2">
                {loadingMeta ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedMeta ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                {savedMeta ? 'Salvo!' : 'Salvar Meta Ads'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
