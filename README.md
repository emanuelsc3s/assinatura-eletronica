# 📝 Assinatura Eletrônica de PDF - MVP

Aplicação **100% frontend** para assinatura eletrônica de documentos PDF. Permite carregar um PDF, coletar dados dos assinantes, aplicar carimbos de assinatura e baixar o PDF assinado.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss)

## 🚀 Começando

### Pré-requisitos

- Node.js 18+ instalado
- npm ou yarn

### Instalação

```bash
# Clone o repositório (ou baixe os arquivos)
cd assinatura-eletronica

# Instale as dependências
npm install

# Execute o servidor de desenvolvimento
npm run dev
```

Acesse `http://localhost:5173` no seu navegador.

### Build para Produção

```bash
npm run build
npm run preview
```

## 📋 Funcionalidades

- ✅ Upload de arquivos PDF (drag & drop ou clique)
- ✅ Visualização do PDF dentro da aplicação
- ✅ Formulário de assinante com validação (Nome e CPF)
- ✅ Validação completa de CPF (dígitos verificadores)
- ✅ Geração de hash SHA-256 criptográfico
- ✅ Carimbo visual no PDF com metadados da assinatura
- ✅ Suporte a múltiplos assinantes no mesmo documento
- ✅ Carimbos em sequência sem sobreposição
- ✅ Download do PDF assinado
- ✅ Persistência do histórico no localStorage
- ✅ Device ID único por dispositivo

## 🔐 Algoritmo de Assinatura

### Geração do Hash SHA-256

O hash de cada assinatura é gerado combinando:

1. **Bytes do PDF atual** (antes de aplicar o carimbo)
2. **Nome completo normalizado** (trim, espaços múltiplos → 1, UPPERCASE)
3. **CPF normalizado** (apenas dígitos)
4. **Device ID** (UUID único do dispositivo)
5. **Timestamp ISO** (data/hora exata da assinatura)

```typescript
// Payload para hash:
const payload = pdfBytes + `|NAME:${nome}|CPF:${cpf}|DEVICE:${deviceId}|TIME:${timestamp}|`
const hash = SHA256(payload)
```

### Carimbo no PDF

Cada assinatura gera um carimbo visual contendo:
- Título: "ASSINATURA ELETRÔNICA (MVP)"
- Nome completo do assinante
- CPF formatado (XXX.XXX.XXX-XX)
- Device ID (abreviado)
- Data/hora da assinatura
- Hash da assinatura (abreviado)

### Cadeia de Assinaturas

Quando múltiplos assinantes assinam o documento:
1. Cada novo hash é calculado sobre o PDF que já contém as assinaturas anteriores
2. Isso cria uma "cadeia" onde cada assinatura depende das anteriores
3. Os carimbos são empilhados verticalmente no rodapé das páginas
4. Se não houver espaço, uma nova página "Registro de Assinaturas" é criada

## 💾 Persistência (localStorage)

São persistidos:

| Item | Chave | Descrição |
|------|-------|-----------|
| Device ID | `pdf_signature_device_id` | UUID único do dispositivo, gerado uma vez |
| Log de Assinaturas | `pdf_signature_current_log` | Histórico com todas as assinaturas do documento atual |

**⚠️ Importante:** O PDF binário **NÃO** é persistido no localStorage (para evitar estourar o limite de ~5MB). Ao recarregar a página, você precisará fazer upload do PDF novamente para continuar assinando.

## 🏗️ Arquitetura

```
src/
├── components/           # Componentes React
│   ├── ui/              # Componentes shadcn/ui
│   ├── PDFUpload.tsx    # Upload de PDF
│   ├── PDFPreview.tsx   # Visualização do PDF
│   ├── SignerForm.tsx   # Formulário de assinatura
│   ├── SignatureLog.tsx # Log de assinaturas
│   └── ActionBar.tsx    # Barra de ações
├── services/
│   └── pdf.ts           # Manipulação de PDF com pdf-lib
├── utils/
│   ├── cpf.ts           # Validação e formatação de CPF
│   ├── hash.ts          # Geração de hash SHA-256
│   ├── device.ts        # Gerenciamento de Device ID
│   └── storage.ts       # Persistência no localStorage
├── schemas/
│   └── signer.ts        # Schema Zod para validação
├── types/
│   └── index.ts         # Tipos TypeScript
└── App.tsx              # Componente principal
```

## 🛠️ Stack Técnica

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| React | 19 | Framework UI |
| Vite | 7 | Build tool |
| TypeScript | 5 | Tipagem |
| Tailwind CSS | 4 | Estilização |
| shadcn/ui | - | Componentes UI |
| pdf-lib | 1.17 | Manipulação de PDF |
| react-pdf | 9 | Preview de PDF |
| react-hook-form | 7 | Gerenciamento de forms |
| zod | 3 | Validação de schemas |
| lucide-react | - | Ícones |

## ⚠️ Limitações do MVP

### Sem IP Real
- **Motivo:** Não é possível obter o IP real do cliente sem um backend.
- **Solução MVP:** Utilizamos um `Device ID` (UUID) gerado e persistido no localStorage.
- **Campo para expansão:** O código está preparado para substituir `deviceId` por `ip` quando houver backend.

### PDF Não Persistido
- O arquivo PDF assinado é mantido apenas em memória.
- Ao recarregar a página, o PDF é perdido (mas o log de assinaturas permanece).
- Sempre faça download do PDF antes de fechar a página.

### Validação Limitada
- A validação do PDF é básica (verifica magic bytes `%PDF-`).
- PDFs criptografados ou muito complexos podem não funcionar corretamente.

### Armazenamento Local
- O localStorage tem limite de ~5MB.
- Logs muito extensos podem eventualmente estourar esse limite.

## 🔄 Fluxo de Uso

1. **Upload do PDF** → Arraste ou selecione um arquivo PDF
2. **Visualize** → O PDF aparece no preview
3. **Preencha os dados** → Nome completo e CPF do assinante
4. **Assine** → Clique em "Assinar Documento"
5. **Repita** → Adicione mais assinantes se necessário
6. **Baixe** → Clique em "Baixar PDF Assinado"

## 📱 Responsividade

A aplicação é responsiva e funciona em:
- 🖥️ Desktop (layout em 2 colunas)
- 📱 Mobile (layout em 1 coluna)
- 📟 Tablet (adaptativo)

## 🧪 Teste Manual

### Cenário 1: Assinatura Simples
1. Faça upload de um PDF qualquer
2. Preencha nome: "João da Silva" e CPF válido: "529.982.247-25"
3. Clique em "Assinar"
4. Verifique o carimbo no preview (última página)
5. Baixe o PDF e abra para confirmar

### Cenário 2: Múltiplas Assinaturas
1. Após o cenário 1, adicione mais assinantes
2. Use CPFs válidos diferentes
3. Verifique que os carimbos não se sobrepõem
4. Baixe e verifique o PDF final

### Cenário 3: CPF Inválido
1. Tente assinar com CPF "111.111.111-11"
2. Verifique a mensagem de erro
3. A assinatura deve ser bloqueada

### CPFs Válidos para Teste
- 529.982.247-25
- 147.426.538-89
- 867.615.028-71

## 📄 Licença

MIT

## 🤝 Contribuições

Contribuições são bem-vindas! Por favor, abra uma issue ou pull request.
