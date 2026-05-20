/**
 * Tester de conectividade para o stack de observabilidade Grafana Cloud.
 * Executa: npx tsx scripts/test-observability.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// ─── Carregar .env.local ──────────────────────────────────────────────────────

function loadEnv(): Record<string, string> {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌  .env.local não encontrado em', envPath);
    process.exit(1);
  }
  const env: Record<string, string> = {};
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq > 0) env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

const env = loadEnv();

function require_env(key: string): string {
  const val = env[key];
  if (!val || val.startsWith('YOUR_')) {
    console.log(`  ⚠️  ${key} não configurado — a saltar`);
    return '';
  }
  return val;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function result(name: string, ok: boolean, detail?: string) {
  const icon = ok ? '✅' : '❌';
  const msg  = ok ? 'OK' : 'FALHOU';
  console.log(`  ${icon}  ${name}: ${msg}${detail ? `  (${detail})` : ''}`);
}

// ─── Testes ───────────────────────────────────────────────────────────────────

async function testLoki() {
  console.log('\n📋  Loki (Logs)');
  const url      = require_env('LOKI_URL');
  const username = require_env('LOKI_USERNAME');
  const password = require_env('LOKI_PASSWORD');
  if (!url || !username || !password) return;

  const credentials = Buffer.from(`${username}:${password}`).toString('base64');
  const payload = {
    streams: [{
      stream: { app: 'cantolico', level: 'info', environment: 'test' },
      values: [[String(Date.now() * 1_000_000), JSON.stringify({ message: '🧪 test-observability.ts ping', timestamp: new Date().toISOString() })]],
    }],
  };

  try {
    const res = await fetch(`${url}/loki/api/v1/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${credentials}` },
      body: JSON.stringify(payload),
    });
    result('Push log', res.ok || res.status === 204, `HTTP ${res.status}`);
    if (!res.ok && res.status !== 204) console.log('    Detalhe:', await res.text());
  } catch (e: any) {
    result('Push log', false, e.message);
  }
}

async function testPrometheus() {
  console.log('\n📊  Prometheus / Mimir (Métricas)');
  const url      = require_env('PROMETHEUS_REMOTE_WRITE_URL');
  const username = require_env('PROMETHEUS_USERNAME');
  const password = require_env('PROMETHEUS_PASSWORD');
  if (!url || !username || !password) return;

  // Testar credenciais via query API (GET) em vez de remote write (requer protobuf)
  const queryUrl = url.replace('/api/prom/push', '/api/prom/api/v1/query');
  const credentials = Buffer.from(`${username}:${password}`).toString('base64');

  try {
    const res = await fetch(`${queryUrl}?query=up`, {
      headers: { Authorization: `Basic ${credentials}` },
    });
    result('Credenciais Prometheus', res.ok, `HTTP ${res.status}`);
    if (!res.ok) console.log('    Detalhe:', await res.text());
  } catch (e: any) {
    result('Credenciais Prometheus', false, e.message);
  }
}

async function testOTLP() {
  console.log('\n🔭  OTLP Gateway (Traces → Tempo + Métricas → Mimir)');
  const endpoint  = require_env('OTEL_EXPORTER_OTLP_ENDPOINT');
  const headersRaw = require_env('OTEL_EXPORTER_OTLP_HEADERS');
  if (!endpoint || !headersRaw) return;

  // Parsear o header Authorization
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  for (const entry of headersRaw.split(',')) {
    const eq = entry.indexOf('=');
    if (eq > 0) headers[entry.slice(0, eq).trim()] = entry.slice(eq + 1).trim();
  }

  // Enviar um trace OTLP mínimo (JSON format)
  const trace = {
    resourceSpans: [{
      resource: { attributes: [{ key: 'service.name', value: { stringValue: 'cantolico-test' } }] },
      scopeSpans: [{
        scope: { name: 'test-observability' },
        spans: [{
          traceId: '0af7651916cd43dd8448eb211c80319c',
          spanId: 'b7ad6b7169203331',
          name: 'test-ping',
          kind: 1,
          startTimeUnixNano: String(Date.now() * 1_000_000),
          endTimeUnixNano: String((Date.now() + 1) * 1_000_000),
          status: { code: 1 },
        }],
      }],
    }],
  };

  try {
    const res = await fetch(`${endpoint}/v1/traces`, {
      method: 'POST',
      headers,
      body: JSON.stringify(trace),
    });
    result('Push trace OTLP', res.ok || res.status === 200, `HTTP ${res.status}`);
    if (!res.ok) console.log('    Detalhe:', await res.text());
  } catch (e: any) {
    result('Push trace OTLP', false, e.message);
  }
}

async function testSupabase() {
  console.log('\n🗄️  Supabase (Base de Dados)');
  const supabaseUrl = require_env('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey    = require_env('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!supabaseUrl || !anonKey) return;

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/User?select=id&limit=1`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    });
    result('Query Supabase', res.ok, `HTTP ${res.status}`);
    if (!res.ok) console.log('    Detalhe:', await res.text());
  } catch (e: any) {
    result('Query Supabase', false, e.message);
  }
}

async function testHealth() {
  console.log('\n💚  Health Endpoint (/api/health)');
  const apiUrl = env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3000';

  try {
    const res = await fetch(`${apiUrl}/api/health`);
    const json = await res.json() as any;
    result('HTTP response', res.ok, `HTTP ${res.status}`);
    result('Status ok', json.status === 'ok', `status=${json.status}`);
    result('DB check',   json.checks?.database === 'ok', `db=${json.checks?.database}`);
  } catch (e: any) {
    result('/api/health', false, `${e.message} — corre pnpm dev primeiro`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔍  Cantólico — Observability Stack Tester');
  console.log('━'.repeat(50));

  await testLoki();
  await testPrometheus();
  await testOTLP();
  await testSupabase();
  await testHealth();

  console.log('\n' + '━'.repeat(50));
  console.log('Feito. Variáveis com YOUR_* foram saltadas — preenche no .env.local\n');
}

main().catch(console.error);
