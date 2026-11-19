# Site Dáblio (fotografia e filmagem)

Site público + área do cliente com login (código e senha, validade de 90 dias) + painel para você gerenciar tudo.

**Tecnologias:** Next.js 14 · Supabase (login, banco de dados e armazenamento das fotos) · Vercel (hospedagem).

## O que o site faz

- **Site público:** home, serviços (fotografia e filmagem), portfólio com as fotos que você enviar, contato (formulário, WhatsApp e Instagram).
- **Área do cliente (`/cliente/login`):** o cliente entra com código e senha, vê e baixa só as próprias fotos. Depois que o prazo vence, o acesso é bloqueado pelo próprio banco de dados (não dá para burlar pelo navegador).
- **Painel (`/admin`):** você cria o acesso do cliente (código e senha são gerados automaticamente), sobe as fotos, renova o prazo, gera nova senha, exclui cliente, gerencia o portfólio, vídeo demonstrativo, apresentação, depoimentos e mensagens do formulário.

## Passo a passo para colocar no ar

### 1. Criar o projeto no Supabase
1. Crie uma conta em https://supabase.com e um projeto novo.
2. Abra **SQL Editor**, cole todo o conteúdo de `supabase/schema.sql` e clique em **Run**. Para atualizar um projeto que já estava funcionando, execute também `supabase/atualizacoes.sql`.
3. Em **Authentication > Sign In / Providers** (ou Settings), **desligue "Allow new users to sign up"**. Assim ninguém consegue criar conta sozinho; os acessos só são criados por você pelo painel.
4. Em **Authentication > Users > Add user**, crie o seu usuário (seu e-mail e uma senha forte, marcando "Auto Confirm User").
5. No **SQL Editor**, torne esse usuário administrador (troque pelo seu e-mail):
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'SEU-EMAIL@exemplo.com';
   ```
6. Em **Project Settings > API**, copie: Project URL, anon key e service_role key.

### 2. Rodar no seu computador (opcional, para testar)
```bash
cp .env.example .env.local     # preencha com as chaves do passo 1.6
npm install
npm run dev
```
Abra http://localhost:3000. Painel: http://localhost:3000/admin/login.

### 3. Publicar na Vercel
1. Suba esta pasta para um repositório no GitHub.
2. Em https://vercel.com, **Add New > Project** e escolha o repositório.
3. Em **Environment Variables**, adicione as variáveis do `.env.example`. As variáveis de e-mail são opcionais até configurar o Resend.
4. Clique em **Deploy**. Depois, aponte o seu domínio em **Settings > Domains**.

## Como usar no dia a dia

1. Cliente contratou: entre em `/admin/login`, crie o cliente em **Novo cliente** e copie o código e a senha que aparecem (a senha só aparece nessa hora).
2. Abra o cliente na lista, confira o serviço contratado e envie somente fotos. Se o serviço incluir filmagem, cadastre o link externo do vídeo nessa mesma tela.
3. Mande o código e a senha pelo WhatsApp, junto do link `seusite.com.br/cliente/login`.
4. Passados os 90 dias o acesso fecha sozinho. Se o cliente pedir de novo, use **Renovar acesso**.

## Observações importantes

- **Chave `SUPABASE_SERVICE_ROLE_KEY`:** é secreta. Nunca coloque em código público nem em variável que comece com `NEXT_PUBLIC_`.
- **Domínio do código:** o Supabase exige e-mail para login, então o código do cliente vira internamente `codigo@clientes.dablio.com.br`. Esse endereço não precisa existir. Se o Supabase recusar o domínio, mude `CLIENT_EMAIL_DOMAIN` para outro (por exemplo, um domínio seu).
- **Tamanho das fotos:** o plano gratuito do Supabase tem limite de armazenamento e de tamanho por arquivo. Para muitas fotos em alta resolução, pode ser necessário um plano pago. Projetos gratuitos também podem ser pausados após um tempo sem uso. Confira os limites atuais em https://supabase.com/pricing.
- **Vídeos de clientes:** não são armazenados no Supabase. Cadastre um link externo no painel; a opção só aparece ao cliente quando o serviço inclui filmagem.\n- **Vídeo demonstrativo:** envie um MP4 de até 50 MB em `/admin/video-demo`. Ele aparece na home em loop, sem áudio automático. O bucket `site-demo` é separado do portfólio.\n- **E-mail de novas mensagens:** configure `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (domínio verificado no Resend) e `CONTACT_EMAIL` na Vercel. Sem essas três variáveis, as mensagens continuam salvas no painel, sem notificação por e-mail.
- **Proteção do formulário:** limite de quatro envios por IP a cada 15 minutos, além do campo anti-robôs.
- **Backups:** guarde uma cópia das fotos originais. Ao excluir um cliente, as fotos dele são apagadas de vez.

## Estrutura

```
src/app/page.tsx              site público
src/app/cliente/              login e galeria do cliente
src/app/admin/                painel (clientes, portfólio, vídeo, conteúdo e mensagens)
src/lib/                      conexão com o Supabase e utilidades
src/middleware.ts             protege /cliente e /admin
supabase/schema.sql           tabelas e regras de segurança\nsupabase/atualizacoes.sql     atualizações do banco para os novos recursos
```
