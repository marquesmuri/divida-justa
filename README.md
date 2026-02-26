# ⚖️ Dívida Justa — Marques & Cunha Advogados

Landing page com chatbot jurídico inteligente para análise de dívidas bancárias.

---

## 🚀 Como colocar no ar (Vercel) — passo a passo

### Pré-requisitos
- Conta gratuita no [GitHub](https://github.com)
- Conta gratuita no [Vercel](https://vercel.com) (pode entrar com o próprio GitHub)

---

### Passo 1 — Criar repositório no GitHub

1. Acesse [github.com](https://github.com) e faça login
2. Clique em **"New repository"** (botão verde no canto superior direito)
3. Dê o nome `divida-justa`
4. Deixe como **Public** (ou Private, se preferir)
5. Clique em **"Create repository"**

---

### Passo 2 — Enviar os arquivos para o GitHub

1. Na página do repositório criado, clique em **"uploading an existing file"**
2. Arraste **todos os arquivos desta pasta** para a área de upload
   - ⚠️ Não envie a pasta `node_modules` (se existir)
3. Clique em **"Commit changes"**

---

### Passo 3 — Publicar no Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Clique em **"Add New Project"**
3. Conecte com sua conta do GitHub e selecione o repositório `divida-justa`
4. Na tela de configuração:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Clique em **"Deploy"**

✅ Em 2-3 minutos o site estará no ar com uma URL `*.vercel.app`.

---

### Passo 4 — Domínio personalizado (opcional)

Para usar `dividajusta.com.br`:
1. Compre o domínio em [registro.br](https://registro.br) (~R$ 40/ano)
2. No painel do Vercel, vá em **Settings → Domains**
3. Adicione `dividajusta.com.br`
4. Siga as instruções para apontar o DNS

---

## 🛠️ Desenvolvimento local

```bash
# Instalar dependências
npm install

# Iniciar servidor local
npm run dev

# Gerar build de produção
npm run build
```

---

## 📦 Estrutura do projeto

```
divida-justa/
├── public/
│   └── favicon.svg
├── src/
│   ├── main.jsx        ← entrada React
│   └── App.jsx         ← landing page + chatbot Joelma
├── index.html          ← HTML base com SEO configurado
├── vite.config.js      ← configuração do Vite
├── vercel.json         ← configuração da Vercel
└── package.json        ← dependências do projeto
```

---

## 📝 Personalizações importantes

Antes de publicar, atualize em `src/App.jsx`:

| O que alterar | Onde encontrar no código |
|---|---|
| Número do WhatsApp para contato | Busque por `wa.me/55` |
| Link do Instagram | Busque por `marquesecunha.adv` |
| Estatísticas do hero (+300 casos, etc.) | Busque por `Stats` |

---

## 📞 Suporte
Desenvolvido com Marques & Cunha Advogados · @marquesecunha.adv
