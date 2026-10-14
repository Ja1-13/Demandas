# FIT Demandas | Gestão de demandas

Aplicação interna para registrar demandas de software, acompanhar prioridade e atualizar o andamento por perfil. A aplicação usa Next.js 14, TypeScript, Tailwind CSS e SQLite com Prisma.

## Requisitos

- Node.js 18.17 ou superior
- npm

## Instalação

```powershell
npm install
Copy-Item .env.example .env
```

O arquivo `.env` contém `DATABASE_URL="file:./dev.db"`. Para produção, substitua `SESSION_SECRET` por um valor longo e aleatório.

## Criar o banco de dados

```powershell
npm run db:migrate
```

Esse comando cria a estrutura SQLite em `prisma/dev.db` e registra a migração em `prisma/migrations`.
As migrações atribuem números sequenciais às demandas existentes; novas demandas recebem o próximo número automaticamente.

## Rodar o seed

```powershell
npm run db:seed
```

O seed cria o usuário ADM inicial, se ainda não existir. O acesso padrão é `admin` / `admin123`. Em ambiente compartilhado, altere `ADMIN_USERNAME` e `ADMIN_PASSWORD` antes de executar o seed.

## Importar os dados antigos

Os arquivos legados ficam em `data/users.json`, `data/clients.json`, `data/demands.json` e as imagens em `data/uploads`.

```powershell
npm run db:importar
```

A importação é idempotente: atualiza registros existentes e preserva IDs, datas, clientes e vínculos entre demandas e usuários. Imagens salvas em `data/uploads` são vinculadas à demanda quando o nome do arquivo está presente.

## Executar localmente

```powershell
npm run dev
```

Acesse `http://localhost:3000`.

## Comandos

```powershell
npm run dev
npm run lint
npm run build
npm start
npm run db:migrate
npm run db:seed
npm run db:importar
```

## Backup do banco

Copie o arquivo `prisma/dev.db` para um local seguro. Para um backup consistente, encerre a aplicação antes da cópia ou use uma cópia do arquivo enquanto a aplicação estiver fechada.

## Perfis

- **SUPORTE** cria demandas e consulta a listagem.
- **DEV** consulta e avança demandas para “Em desenvolvimento” ou “Concluída”.
- **DEV** e **ADM** podem assumir demandas, definir “Aguardando informação” e comentar. O responsável pode liberar a demanda.
- Quando **SUPORTE** comenta uma demanda em “Aguardando informação”, o status retorna automaticamente para “Pendente”.
- **ADM** cria demandas e usuários, consulta tudo e atualiza qualquer status.
- **ADM** também gerencia clientes em `/clients`; nomes são únicos e clientes com demandas vinculadas não podem ser excluídos.
- Ao criar uma demanda, selecione um cliente cadastrado. O nome é mantido atualizado se o cliente for renomeado.

## Organização

- `lib/repositories/`: único ponto de leitura e gravação de usuários, clientes e demandas.
- `lib/prisma.ts`: singleton do Prisma Client.
- `prisma/schema.prisma`: modelo e tipos de dados do SQLite.
- `prisma/seed.ts`: criação do usuário ADM inicial.
- `scripts/migrar-json.ts`: importação idempotente dos dados legados.
- `lib/auth/`: hash scrypt, sessão HMAC e validação compatível com middleware Edge.
- `app/api/`: pontos de acesso autenticados; as permissões são conferidas no middleware e novamente nos manipuladores.
- `components/`: interface de listagem, detalhes, formulários e navegação.

Os dados ficam em `prisma/dev.db`; o diretório `data` é mantido apenas para arquivos JSON legados e imagens que podem continuar sendo servidos pela aplicação.