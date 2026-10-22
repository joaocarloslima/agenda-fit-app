# Agenda Fit — app do Projeto Diamante

App em React Native (Expo) para testar a Agenda Fit API.
Ele consome exatamente o contrato do enunciado: se o app funciona, a API está no formato certo.

## HATEOAS na prática

O app **não** decide o que mostrar pela role do usuário. Cada botão aparece só quando a API manda o link dele:

| Botão | Aparece quando a resposta traz |
|-------|-------------------------------|
| Inscrever-se | `_links.enroll` na aula |
| Editar aula | `_links.update` na aula |
| Excluir aula | `_links.delete` na aula |
| + Nova | `_links.create` na página de aulas |
| Cancelar inscrição | `_links.cancel` na inscrição |

O detalhe da aula mostra os `_links` recebidos. Entre como visitante, como aluno e como admin e compare.

## O que dá para testar

| Aba | O que acontece | Endpoint |
|-----|----------------|----------|
| Aulas | Grade paginada; ao rolar até o fim, segue o link `next` | `GET /classes` |
| Buscar › Exemplo | Modalidade, nível e instrutor exatos | `GET /classes/example` |
| Buscar › Filtros | Título contém, modalidade, nível, faixa de horário e só com vaga | `GET /classes/search` |
| Inscrições | Inscrições do usuário logado, com cancelamento | `GET /enrollments/me`, `DELETE /enrollments/{id}` |
| Conta | Login, cadastro e usuários de teste | `POST /auth/login`, `POST /auth/register` |

Quando a resposta foge do contrato, o app avisa na tela. Exemplos: lista simples em vez de página HATEOAS,
`_embedded.gymClassResponseList` em vez de `_embedded.classes`, login sem `token` ou 401/403 sem `{"error"}`.

O token fica só na memória: ao fechar o app, é preciso entrar de novo. Um 401 com token encerra a sessão.

## Como rodar

Pré-requisitos: Node.js 20 ou superior e o app **Expo Go** no celular.

```bash
npm install
npx expo start
```

Escaneie o QR code com o Expo Go (Android) ou com a câmera (iOS).
Também funciona no emulador Android (`a`), no simulador iOS (`i`) ou no navegador (`w`).

## Configurando o servidor

Toque no botão do servidor, no canto superior direito, e informe o endereço do computador
onde a API está rodando (porta 8080).

| Onde o app está rodando | Endereço |
|-------------------------|----------|
| Celular físico (Expo Go) | IP do computador na rede, ex.: `192.168.0.10` |
| Emulador Android | `10.0.2.2` (padrão) |
| Simulador iOS ou navegador | `localhost` (padrão) |

O celular e o computador precisam estar na mesma rede Wi-Fi. No navegador, a API precisa liberar CORS
(o projeto base já libera).

## Estrutura

```
App.js                          abas, sessão, modais e configuração do servidor
src/api.js                      chamadas HTTP com o token, leitura das páginas HAL e dos links
src/components/PagedList.js     lista que segue o link next
src/components/LinksBox.js      mostra os _links recebidos
src/screens/ClassDetail.js      detalhe da aula; botões guiados pelos links
src/screens/ClassForm.js        cadastro e edição de aulas
src/screens/SearchScreen.js     buscas por Example e por Specification
src/screens/MyEnrollments.js    minhas inscrições
src/screens/AccountScreen.js    login, cadastro e sessão
```
