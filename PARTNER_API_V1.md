# API de parceiros v1

A API v1 é a interface servidor-a-servidor do Can♱ólico. Foi pensada para um agente como o Hermes consultar o catálogo com uma chave própria, sem depender das rotas usadas pelo site.

## Configuração

Definir no ambiente de produção:

```dotenv
# Uma chave longa, aleatória, partilhada apenas com o Hermes.
# As chaves simples só têm o scope songs:read.
CANTOLICO_API_KEY=trocar-por-uma-chave-aleatoria-de-pelo-menos-32-caracteres

# Para controlo administrativo e rotação, usar uma lista JSON com scopes.
CANTOLICO_API_KEYS=[{"name":"hermes","key":"chave-leitura","scopes":["songs:read"]},{"name":"backoffice","key":"chave-admin","scopes":["songs:write","songs:delete"]}]

# Conta ADMIN do Can♱ólico a registar como autora das mutações feitas pela API.
CANTOLICO_API_ACTOR_USER_ID=123

# Opcional; por defeito são 120 pedidos por minuto por chave.
# CANTOLICO_API_RATE_LIMIT=120
```

Se nenhuma chave estiver configurada, a API responde `503 api_not_configured`; isto impede que o catálogo fique exposto acidentalmente quando a aplicação é publicada. JSON inválido ou um `CANTOLICO_API_ACTOR_USER_ID` que não seja uma conta ADMIN também bloqueia as mutações com `503`.

O Hermes deve enviar uma das formas abaixo em todas as chamadas:

```http
Authorization: Bearer <CANTOLICO_API_KEY>
```

```http
X-API-Key: <CANTOLICO_API_KEY>
```

As respostas incluem `X-RateLimit-Limit`, `X-RateLimit-Remaining` e `X-RateLimit-Reset`. A limitação é uma proteção leve por instância; para um limite distribuído entre instâncias, ligar um armazenamento partilhado antes de aumentar o tráfego.

## Endpoints

| Método | Rota | Uso |
| --- | --- | --- |
| `GET` | `/api/v1` | Descoberta da API e dos recursos disponíveis. |
| `GET` | `/api/v1/songs` | Pesquisa e lista paginada do catálogo. |
| `GET` | `/api/v1/songs/{id_or_slug}` | Metadados, letra e acordes da versão atual de uma música. |
| `GET` | `/api/v1/admin/songs` | Lista de administração, requer `songs:write`. |
| `POST` | `/api/v1/admin/songs` | Cria música e primeira versão, requer `songs:write`. |
| `PATCH` | `/api/v1/admin/songs/{id}` | Altera metadados e/ou versão atual, requer `songs:write`. |
| `DELETE` | `/api/v1/admin/songs/{id}?confirm=true` | Elimina música, requer `songs:delete`. |

### Listar ou pesquisar músicas

```http
GET /api/v1/songs?q=aleluia&moment=ACLAMACAO_EVANGELHO&instrument=GUITARRA&page=1&per_page=25
```

Filtros opcionais: `q`, `moment`, `type` (`ACORDES` ou `PARTITURA`) e `instrument` (`ORGAO`, `GUITARRA`, `PIANO`, `CORO`, `OUTRO`). `per_page` aceita de 1 a 100 e é 25 por defeito.

```json
{
  "data": [
    {
      "id": "…",
      "slug": "aleluia",
      "title": "Aleluia",
      "moments": ["ACLAMACAO_EVANGELHO"],
      "main_instrument": "GUITARRA"
    }
  ],
  "meta": { "page": 1, "per_page": 25, "total": 1, "total_pages": 1 }
}
```

### Obter uma música

```http
GET /api/v1/songs/aleluia
```

A resposta inclui `version.source_text` (a fonte com acordes, quando existir) e `version.lyrics` (texto simples). A API não expõe chaves de armazenamento, PDFs privados, utilizadores, playlists privadas nem missas privadas; as únicas rotas de escrita desta fase são as administrativas de músicas, descritas abaixo.

### Administração de músicas

As operações administrativas usam uma chave com scopes explícitos; uma chave do Hermes com apenas `songs:read` recebe `403 insufficient_scope`. Todas as mutações ficam registadas no `AuditLog` com o nome da chave (nunca o segredo) e com a conta configurada em `CANTOLICO_API_ACTOR_USER_ID`.

```http
POST /api/v1/admin/songs
Content-Type: application/json
Authorization: Bearer <chave-admin>

{
  "title": "Santo",
  "type": "ACORDES",
  "main_instrument": "GUITARRA",
  "moments": ["SANTO"],
  "tags": ["missa"],
  "version": {
    "source_text": "[G]Santo, Santo, Santo",
    "lyrics": "Santo, Santo, Santo",
    "key_original": "G"
  }
}
```

`PATCH` aceita apenas os campos a alterar. Para eliminar uma música que ainda esteja numa playlist, missa ou modelo, é necessário `?confirm=true&force=true`; sem `force`, a API devolve `409` com a contagem de referências. A eliminação remove também favoritos, estrelas, ficheiros e versões associadas. O upload de novos ficheiros e a gestão de missas, playlists, utilizadores e moderação continuam fora desta primeira fatia administrativa.

## Erros

O formato é consistente e usa códigos HTTP: `401` para chave ausente ou inválida, `403` para scope insuficiente, `404` para música inexistente, `409` para conflitos ou referências a proteger, `422` para parâmetros inválidos, `429` para limite excedido e `503` quando a API ainda não está configurada.

```json
{
  "error": {
    "code": "invalid_request",
    "message": "Um ou mais filtros não são válidos."
  }
}
```

O Hermes deve preservar a autoria apresentada pelo catálogo e respeitar as condições de utilização do Can♱ólico ao reutilizar conteúdo.
