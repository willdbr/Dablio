# Dáblio — Fotografia e Filmagem

Site institucional e plataforma de entrega de fotografias para clientes, com portfólio público, área de acesso privado e painel administrativo.

O projeto utiliza **Next.js 14**, **React 18** e **Supabase**. A publicação é feita pela **Vercel**, com deploy automático a partir da branch principal do GitHub.

## Funcionalidades

### Site público
- Página inicial com apresentação do trabalho e serviços.
- Portfólio de fotografias armazenadas no bucket público `portfolio`.
- Vídeo demonstrativo em loop na página inicial, independente do portfólio.
- Depoimentos publicados após aprovação administrativa.
- Formulário de contato, além de links para WhatsApp e Instagram.
- Páginas e recursos de SEO.

### Financeiro manual
- Defina o valor total do contrato de cada cliente.
- Registre pagamentos parciais ou integrais feitos por Pix, dinheiro, cartão, transferência ou outro meio.
- Consulte o histórico por cliente, total recebido e saldo em aberto.
- O site não processa cobranças nem recebe dados de cartão.

### Agenda
- Cadastre ensaios e compromissos vinculados a clientes.
- Informe título, data, horário, serviço, local e observações.
- Atualize o status para agendado, concluído ou cancelado.
- Clientes com acesso válido visualizam os próximos compromissos na área reservada.

### Notificações administrativas
- Centraliza contatos recebidos, depoimentos pendentes, entregas em andamento e ensaios dos próximos sete dias.
- A central fica disponível em `/admin/notificacoes` e também no menu do painel.

### Área do cliente
- Login com código e senha fornecidos pelo administrador.
- Galeria privada com acesso somente às próprias fotos.
- Visualização e download de fotografias, incluindo opção de baixar a galeria em ZIP.
- Prazo de acesso padrão de 90 dias, com possibilidade de renovação pelo administrador.
- Link externo para o vídeo do evento, quando o serviço contratado inclui filmagem.
- Envio de um depoimento, mediante autorização explícita. O depoimento fica pendente até a aprovação.

### Painel administrativo
- Criação e gerenciamento de clientes e credenciais de acesso.
- Envio e exclusão de fotos das galerias.
- Renovação do prazo e redefinição de senha.
- Definição do serviço contratado e cadastro do link externo do vídeo.
- Gerenciamento do portfólio e do vídeo demonstrativo.
- Edição da apresentação do site e moderação de depoimentos.
- Consulta e gerenciamento das mensagens recebidas pelo formulário.

## Tecnologias

| Tecnologia | Uso |
| --- | --- |
| Next.js 14 | Aplicação web e rotas |
| React 18 | Interface |
| TypeScript | Tipagem |
| Supabase Auth | Autenticação |
| Supabase Database | Banco PostgreSQL e políticas RLS |
| Supabase Storage | Armazenamento de fotografias e vídeo demonstrativo |
| Vercel | Hospedagem e deploy |

## Requisitos

- Node.js (versão LTS recomendada).
- npm.
- Projeto no [Supabase](https://supabase.com/).
- Conta na [Vercel](https://vercel.com/) para publicação.

## Configuração local

1. Clone o repositório:

   ```bash
   git clone https://github.com/willdbr/Dablio.git
   cd Dablio
   ```

2. Instale as dependências:

   ```bash
   npm install
   ```

3. Crie o arquivo de ambiente local:

   ```bash
   cp .env.example .env.local
   ```

   No Windows, também é possível criar uma cópia de `.env.example` com o nome `.env.local`.

4. Preencha as variáveis do `.env.local` com os dados do seu projeto Supabase:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   CLIENT_EMAIL_DOMAIN=clientes.seudominio.com.br
   NEXT_PUBLIC_SITE_URL=https://seu-dominio.com.br
   RESEND_API_KEY=
   RESEND_FROM_EMAIL=
   CONTACT_EMAIL=
   ```

   - `NEXT_PUBLIC_SUPABASE_URL`: URL do projeto Supabase.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: chave pública/anon do Supabase.
   - `SUPABASE_SERVICE_ROLE_KEY`: chave privilegiada usada somente no servidor.
   - `CLIENT_EMAIL_DOMAIN`: domínio usado para gerar os identificadores internos de login dos clientes.
   - `NEXT_PUBLIC_SITE_URL`: endereço público do site.
   - As variáveis `RESEND_*` e `CONTACT_EMAIL` são reservadas para integração de e-mail, quando configurada.

5. Inicie o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

6. Acesse [http://localhost:3000](http://localhost:3000).

Para validar a compilação de produção:

```bash
npm run build
npm run start
```

## Configuração do Supabase

### Banco de dados

No painel do Supabase, abra **SQL Editor** e execute o conteúdo de:

```
supabase/schema.sql
```

Esse arquivo cria as tabelas, funções, buckets e políticas de segurança necessárias para uma instalação nova, incluindo as estruturas de clientes, fotos, mensagens, apresentação, depoimentos e vídeo demonstrativo.

O arquivo `supabase/atualizacoes.sql` reúne as alterações incrementais introduzidas para funcionalidades posteriores. Use-o somente em projetos que já tinham uma versão anterior do banco e precisam dessas atualizações. Não é necessário executá-lo depois de `schema.sql` em uma instalação nova.

### Criar o primeiro administrador

1. No Supabase, acesse **Authentication** e crie um usuário com seu e-mail e uma senha forte. Confirme o usuário.
2. No **SQL Editor**, execute o comando abaixo, substituindo o e-mail:

   ```sql
   insert into public.admins (user_id)
   select id
   from auth.users
   where email = 'seu-email@exemplo.com'
   on conflict (user_id) do nothing;
   ```

3. No painel do Supabase, desative o cadastro público de usuários (*Allow new users to sign up*), se essa opção estiver habilitada. Os acessos de clientes devem ser criados pelo painel administrativo.

### Armazenamento

O schema configura os buckets:

- `galerias`: privado; contém as fotos dos clientes.
- `portfolio`: público; contém as imagens exibidas no site.
- `site-demo`: público; reservado ao vídeo demonstrativo da página inicial, com limite configurado de 50 MB e formato MP4.

As políticas de Row Level Security (RLS) e Storage restringem o acesso às galerias. Um cliente autenticado só pode consultar as próprias fotos enquanto o acesso estiver dentro da validade. Administradores gerenciam os conteúdos pelo painel.

> **Importante:** não remova nem flexibilize as políticas RLS para resolver erros sem antes identificar a permissão ou política responsável.

### Atualização do banco — financeiro e agenda
Depois do deploy do código, abra o **Supabase > SQL Editor** e execute o arquivo:

```
supabase/migrations/20261120_finance_agenda.sql
```

A migração adiciona o valor do contrato, a tabela de pagamentos e a agenda com políticas RLS. Não apague nem substitua as políticas existentes.

## Publicação na Vercel

1. Importe o repositório `willdbr/Dablio` na Vercel.
2. Configure as variáveis de ambiente listadas em `.env.example` nos ambientes necessários (Production, Preview e Development, conforme o uso).
3. Confira se as credenciais apontam para o projeto Supabase correto.
4. Faça o deploy.

A cada commit enviado para a branch principal, a Vercel inicia um novo deploy automaticamente, desde que a integração com o GitHub esteja ativa.

## Operação do site

- Acesse `/admin/login` para entrar no painel.
- Crie o cliente e guarde o código e a senha apresentados no momento da criação. A senha não é exibida novamente.
- Abra o cadastro do cliente para enviar fotos, configurar o serviço contratado e, quando aplicável, informar o link externo do vídeo.
- Compartilhe com o cliente o endereço `/cliente/login`, junto das credenciais.
- Use a opção de renovação para estender o acesso.
- Aprove os depoimentos antes que sejam exibidos publicamente.

### Vídeos

Os vídeos individuais dos clientes **não são enviados ao Supabase**. O administrador cadastra um link HTTPS de hospedagem externa; esse link é exibido na área do cliente quando o serviço contratado inclui filmagem.

O vídeo demonstrativo da página inicial é diferente: ele é enviado pelo painel em `/admin/video-demo`, fica no bucket `site-demo` e é reproduzido em loop, sem áudio automático.

## Segurança e boas práticas

- **Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no navegador, no GitHub ou em variáveis com prefixo `NEXT_PUBLIC_`.** Ela deve permanecer apenas nas variáveis de ambiente do servidor.
- Não envie o arquivo `.env.local` ao repositório. Ele contém credenciais privadas.
- Use senhas fortes para contas administrativas.
- Mantenha as políticas RLS e as políticas do Storage habilitadas.
- Faça cópias de segurança das fotografias originais. Excluir um cliente pode remover os arquivos associados à galeria.
- Considere os limites de armazenamento, tráfego e tamanho de arquivos do seu plano Supabase. Consulte os [planos e limites do Supabase](https://supabase.com/pricing).

## Estrutura do projeto

```
src/
  app/
    admin/       Painel administrativo e ações
    cliente/     Login e área privada do cliente
    ...          Páginas públicas do site
  components/    Componentes reutilizáveis da interface
  lib/           Autenticação, Supabase, configuração e utilitários
  middleware.ts  Atualização da sessão e proteção de rotas
supabase/
  schema.sql          Estrutura inicial do banco e políticas
  atualizacoes.sql    Migrações incrementais do banco
.env.example          Modelo das variáveis de ambiente
```

## Scripts disponíveis

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Gera a versão de produção |
| `npm run start` | Inicia a versão de produção compilada |

---

Desenvolvido para **Dáblio — Fotografia e Filmagem**.
