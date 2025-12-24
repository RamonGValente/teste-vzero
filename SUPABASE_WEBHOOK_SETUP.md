# Supabase Database Webhooks → OneSignal Push (produção)

Este projeto suporta envio de **Push via OneSignal** a partir de eventos do banco usando **Supabase Database Webhooks**.

Os Webhooks do Supabase disparam requisições HTTP após `INSERT/UPDATE/DELETE` em tabelas selecionadas, com payload:

- `type`: `INSERT` | `UPDATE` | `DELETE`
- `table`: nome da tabela
- `schema`: schema (ex.: `public`)
- `record`: registro novo (em INSERT/UPDATE)
- `old_record`: registro anterior (em UPDATE/DELETE)

Referência: documentação oficial do Supabase (Database Webhooks). 

## 1) Variáveis no Netlify

Configure no Netlify (Site settings → Environment variables):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ONESIGNAL_APP_ID`
- `ONESIGNAL_REST_API_KEY`
- `SUPABASE_DB_WEBHOOK_SECRET` **(recomendado)**: um segredo qualquer (ex.: UUID) para autenticar os webhooks

## 2) URL do endpoint do webhook

O endpoint que recebe eventos do banco é:

```
https://SEU-SITE.netlify.app/.netlify/functions/db-webhook
```

## 3) Criar webhooks no Supabase (Dashboard)

No Supabase Studio/Dashboard:

1. Vá em **Database → Webhooks**
2. Clique em **Create webhook**
3. Preencha:
   - **Method**: `POST`
   - **URL**: `https://SEU-SITE.netlify.app/.netlify/functions/db-webhook`
   - **Events**: selecione **INSERT**
   - **Schema/Table**: selecione a tabela
4. Em **Headers**, adicione:

```json
{
  "Content-Type": "application/json",
  "X-Webhook-Secret": "<MESMO_VALOR_DO_SUPABASE_DB_WEBHOOK_SECRET>"
}
```

> O projeto aceita também `X-Supabase-Event-Signature`, mas `X-Webhook-Secret` é o mais simples.

Crie 1 webhook para cada tabela abaixo (todos com INSERT):

- `public.messages`
- `public.mentions`
- `public.comments`
- `public.friend_requests`
- `public.attention_calls`
- `public.posts`

## 4) Preferências do usuário (opcional)

Se existir a tabela `notification_preferences`, o sistema filtra automaticamente por preferências.

Se a tabela não existir, o envio continua funcionando (best-effort).

## 5) Como testar

1. Faça login no app (para garantir `OneSignal.login(userId)` e External ID no OneSignal).
2. Insira um registro real (ex.: criar mensagem/menção/comentário).
3. Veja no Netlify **Functions → Logs** se `db-webhook` foi chamado.
4. Confirme a entrega no device.
