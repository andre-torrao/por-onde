# 🗺 Portugal Tracker

Regista as freguesias e concelhos de Portugal que já visitaste.

---

## Como correr

### Requisitos
- [Node.js 18+](https://nodejs.org) instalado

### Passos

```bash
# 1. Entra na pasta
cd portugal-tracker

# 2. Instala as dependências (só na primeira vez)
npm install

# 3. Arranca a app
npm run dev
```

Abre o browser em **http://localhost:5173**

---

## Funcionalidades

- 🗺 **Mapa real** com as 2916 freguesias oficiais do CAOP (Carta Administrativa Oficial de Portugal)
- 🔄 **Alterna** entre vista por **Concelhos (307)** e **Freguesias (2916)**
- 🔐 **Login local** — cria conta com nome, palavra-passe e avatar
- 👥 **Multi-conta** — vários utilizadores no mesmo browser, cada um com o seu histórico
- ✅ **Clica no mapa** ou na lista para marcar/desmarcar
- 🔍 **Pesquisa** em tempo real por nome
- 💾 **Persistência automática** no localStorage do browser

---

## Fonte dos dados geográficos

Dados oficiais da [Direção-Geral do Território](https://www.dgterritorio.gov.pt/dados-abertos) via pacote npm `@cartography/pt`.

