# 🔍 Guia de Troubleshooting - Logs não aparecem no Grafana/Loki

## 🧪 Teste Rápido

### 1. Acesse a rota de teste
```
https://seu-dominio.vercel.app/api/test-loki-logs
```

Isso vai enviar 5 logs de teste para o Loki. Deves ver uma resposta JSON com:
```json
{
  "success": true,
  "message": "Test logs sent to Loki",
  "expected_logs": 5,
  "loki_url": "https://truenas-scale.fold-pence.ts.net/logs"
}
```

### 2. Verifica os logs da Vercel
```bash
vercel logs <deployment-url> --follow
```

Deves ver:
```
📤 Sending to Loki: { url: '...', labels: {...}, message: '...', level: '...' }
✅ Log sent to Loki successfully
```

Se vires:
```
❌ Loki rejected log: { status: 400, statusText: 'Bad Request', ... }
```
Então há problema no formato do payload.

Se vires:
```
❌ Error sending to Loki: { message: 'fetch failed', ... }
```
Então há problema de rede/conectividade.

### 3. Verifica no Grafana

No Grafana, usa esta query:
```logql
{app="cantolico"} |= "test"
```

Deves ver 5 logs com as tags:
- `test`, `loki-verification`
- `test`, `user-context`
- `test`, `error-simulation`
- `test`, `http-context`
- `test`, `domain-context`

## 🐛 Problemas Comuns

### Problema 1: Logs não aparecem no Grafana

**Causa:** Loki não está a receber os logs

**Debug:**
1. Verifica se o endpoint Loki está acessível:
```bash
curl https://truenas-scale.fold-pence.ts.net/logs/ready
# Deve retornar: ready
```

2. Testa enviar um log manualmente:
```bash
curl -X POST "https://truenas-scale.fold-pence.ts.net/logs/loki/api/v1/push" \
  -H "Content-Type: application/json" \
  -d '{
    "streams": [{
      "stream": {
        "app": "cantolico",
        "environment": "production"
      },
      "values": [
        ["'$(date +%s)000000000'", "manual test log"]
      ]
    }]
  }'
```

Se isto funcionar mas os logs da app não, então o problema está no código.

### Problema 2: Vercel não consegue conectar ao Loki

**Causa:** Firewall/Rede bloqueando Vercel

**Solução:**
1. Verifica se o teu TrueNAS está acessível publicamente
2. Verifica se há firewall bloqueando requests da Vercel
3. Testa com um serviço público como httpbin:

Temporariamente muda no `.env`:
```env
LOKI_URL=https://httpbin.org/post
```

Se os logs aparecerem no httpbin, então o problema é rede para o TrueNAS.

### Problema 3: Formato de payload incorreto

**Causa:** Loki está a rejeitar o payload

**Debug:**
Adiciona isto temporariamente em `src/lib/logger.ts` na função `sendToLoki`:
```typescript
console.log('📦 Payload being sent:', JSON.stringify(payload, null, 2));
```

Verifica se o payload tem este formato exato:
```json
{
  "streams": [{
    "stream": {
      "app": "cantolico",
      "service": "nextjs",
      "environment": "production",
      "level": "info",
      "category": "api"
    },
    "values": [
      ["1700000000000000000", "{\"timestamp\":\"...\",\"message\":\"...\"}"]
    ]
  }]
}
```

**Importante:**
- Timestamp deve ser string de nanosegundos (19 dígitos)
- Labels no `stream` devem ser todos strings
- O segundo elemento do array `values` é JSON stringificado

### Problema 4: Labels com tipos incorretos

**Causa:** Loki requer que todos os labels sejam strings

**Solução já aplicada em `extractLokiLabels`:**
```typescript
// Garantir que IDs são strings
if (event.domain?.song_id) {
  labels.song_id = String(event.domain.song_id); // ✅ Converter para string
}
```

### Problema 5: Timestamp incorreto

**Causa:** Loki requer timestamp em nanosegundos

**Verificação:**
```typescript
// Correto (19 dígitos)
"1700000000000000000"

// Incorreto (13 dígitos - milissegundos)
"1700000000000"
```

Nossa implementação já está correta:
```typescript
String(Date.now() * 1000000) // Multiplica ms por 1M para ns
```

## 🔧 Configuração do Loki

Verifica se o teu Loki aceita logs via HTTP:

### loki-config.yaml
```yaml
server:
  http_listen_port: 3100

ingester:
  lifecycler:
    ring:
      replication_factor: 1
  chunk_idle_period: 5m
  chunk_retain_period: 30s

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

limits_config:
  reject_old_samples: false
  reject_old_samples_max_age: 168h
  ingestion_rate_mb: 10
  ingestion_burst_size_mb: 20
```

### Verifica os logs do Loki
```bash
# Se estás a usar Docker
docker logs <loki-container-name> | tail -50

# Procura por:
# - Erros de parsing
# - Logs rejeitados
# - Problemas de timestamp
```

## 📊 Query no Grafana

### Queries úteis:

**Ver todos os logs da app:**
```logql
{app="cantolico"}
```

**Ver logs por nível:**
```logql
{app="cantolico", level="error"}
```

**Ver logs de um utilizador específico:**
```logql
{app="cantolico", user_email="user@example.com"}
```

**Ver logs de API errors:**
```logql
{app="cantolico", category="api"} |= "error"
```

**Ver logs com texto específico:**
```logql
{app="cantolico"} |= "login"
```

**Contar logs por minuto:**
```logql
rate({app="cantolico"}[1m])
```

## 🚨 Debug Avançado

### 1. Adicionar logs de debug temporários

Em `src/lib/logger.ts`, adiciona no início de `sendToLoki`:
```typescript
console.log('🔍 DEBUG - sendToLoki called:', {
  LOKI_URL,
  hasEvent: !!event,
  hasLabels: !!labels,
  eventMessage: event.message,
  labelCount: Object.keys(labels).length,
});
```

### 2. Verificar variáveis de ambiente

Cria uma rota temporária:
```typescript
// src/app/api/debug-env/route.ts
export async function GET() {
  return Response.json({
    LOKI_URL: process.env.LOKI_URL,
    APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NODE_ENV: process.env.NODE_ENV,
  });
}
```

Acede `/api/debug-env` e verifica se `LOKI_URL` está correto.

### 3. Testar com curl direto

```bash
# Timestamp atual em nanosegundos
TS=$(date +%s)000000000

curl -X POST "https://truenas-scale.fold-pence.ts.net/logs/loki/api/v1/push" \
  -H "Content-Type: application/json" \
  -d "{
    \"streams\": [{
      \"stream\": {
        \"app\": \"cantolico\",
        \"level\": \"info\",
        \"test\": \"curl\"
      },
      \"values\": [[\"$TS\", \"{\\\"message\\\": \\\"test from curl\\\"}\"]]
    }]
  }"
```

Se isto aparecer no Grafana mas os logs da app não, o problema está no código.

## ✅ Checklist Final

- [ ] `/api/test-loki-logs` retorna `success: true`
- [ ] Console da Vercel mostra `✅ Log sent to Loki successfully`
- [ ] `curl` para `/logs/ready` retorna `ready`
- [ ] `curl` manual para `/loki/api/v1/push` funciona
- [ ] Query `{app="cantolico"}` no Grafana retorna resultados
- [ ] Variáveis de ambiente estão corretas no Vercel
- [ ] Firewall permite tráfego da Vercel para TrueNAS

## 🎯 Solução Rápida

Se nada funcionar, testa com Grafana Cloud (grátis):
```env
LOKI_URL=https://logs-prod-XXX.grafana.net
LOKI_USERNAME=XXXXX
LOKI_PASSWORD=XXXXX
```

E atualiza `sendToLoki` para usar autenticação:
```typescript
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Basic ${Buffer.from(`${LOKI_USERNAME}:${LOKI_PASSWORD}`).toString('base64')}`,
},
```

---

**Próximo passo:** Acede `/api/test-loki-logs` e verifica os resultados!
