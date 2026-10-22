// Cliente da Agenda Fit API (Projeto Diamante), porta 8080.
// As respostas seguem o formato HAL do Spring HATEOAS: _embedded, _links e page.
// O app NÃO decide permissões pela role: cada botão aparece só quando o link correspondente veio na resposta.

const TIMEOUT_MS = 15000;

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const STATUS_MESSAGES = {
  400: 'Dados inválidos.',
  401: 'Não autenticado.',
  403: 'Sem permissão.',
  404: 'Não encontrado.',
  409: 'Conflito.',
  500: 'Erro interno no servidor.',
};

async function request(url, { method = 'GET', body, token, onUnauthorized } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Accept: 'application/hal+json, application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    throw new ApiError(
      0,
      error.name === 'AbortError'
        ? 'O servidor demorou demais para responder.'
        : `Não foi possível conectar em ${url}`,
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    // token expirado ou inválido: a sessão acaba
    if (response.status === 401 && token && onUnauthorized) onUnauthorized();

    const serverMessage = data && typeof data === 'object' ? data.error : null;
    const base = STATUS_MESSAGES[response.status] ?? 'Erro no servidor.';
    let message = `${response.status} · ${base}`;
    if (serverMessage) message += `\n${serverMessage}`;
    else if ([401, 403].includes(response.status)) {
      message += '\nResposta fora do contrato: o erro deveria vir como {"error": "..."}.';
    }
    throw new ApiError(response.status, message);
  }
  return data;
}

function query(params) {
  const parts = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== false && String(value).trim() !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value).trim())}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export const PAGE_SIZE = 10;

export function createApi(host, token, onUnauthorized) {
  const base = `http://${host}:8080`;
  const call = (url, options = {}) => request(url, { ...options, token, onUnauthorized });

  return {
    base,
    loggedIn: !!token,
    // URLs da primeira página; as próximas vêm do link "next" da resposta
    classesUrl: () => `${base}/classes${query({ page: 0, size: PAGE_SIZE })}`,
    exampleUrl: (filters) => `${base}/classes/example${query({ ...filters, page: 0, size: PAGE_SIZE })}`,
    searchUrl: (filters) => `${base}/classes/search${query({ ...filters, page: 0, size: PAGE_SIZE })}`,
    myEnrollmentsUrl: () => `${base}/enrollments/me${query({ page: 0, size: PAGE_SIZE })}`,

    register: (user) => request(`${base}/auth/register`, { method: 'POST', body: user }),
    login: (credentials) => request(`${base}/auth/login`, { method: 'POST', body: credentials }),

    get: (url) => call(url),
    // as ações abaixo recebem o href do link HATEOAS correspondente
    post: (href, body) => call(href, { method: 'POST', body }),
    put: (href, body) => call(href, { method: 'PUT', body }),
    remove: (href) => call(href, { method: 'DELETE' }),
  };
}

// Lê uma página HAL. Página vazia não tem _embedded.
export function readPage(data, key) {
  if (!data || typeof data !== 'object') {
    throw new ApiError(0, 'Resposta fora do contrato: a página não é um objeto JSON.');
  }
  if (Array.isArray(data)) {
    throw new ApiError(0, 'Resposta fora do contrato: veio uma lista simples, sem HATEOAS e sem paginação.');
  }
  if (data._embedded && !data._embedded[key]) {
    const keys = Object.keys(data._embedded).join(', ');
    throw new ApiError(0, `Resposta fora do contrato: esperava _embedded.${key} e veio _embedded.${keys}.`);
  }
  if (!data.page) {
    throw new ApiError(0, 'Resposta fora do contrato: falta o bloco "page".');
  }
  return {
    items: data._embedded?.[key] ?? [],
    next: data._links?.next?.href ?? null,
    links: data._links ?? {},
    total: data.page.totalElements,
  };
}

// href de um link HATEOAS, ou null se o servidor não mandou
export function link(resource, rel) {
  return resource?._links?.[rel]?.href ?? null;
}

// Lê o payload do JWT (só para mostrar nome e role na tela; quem valida o token é o servidor)
export function decodeToken(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export const MODALITIES = [
  { value: 'YOGA', label: 'Yoga' },
  { value: 'PILATES', label: 'Pilates' },
  { value: 'SPINNING', label: 'Spinning' },
  { value: 'FUNCTIONAL', label: 'Funcional' },
  { value: 'DANCE', label: 'Dança' },
];

export const LEVELS = [
  { value: 'BEGINNER', label: 'Iniciante' },
  { value: 'INTERMEDIATE', label: 'Intermediário' },
  { value: 'ADVANCED', label: 'Avançado' },
];

export const modalityLabel = (value) => MODALITIES.find((m) => m.value === value)?.label ?? value;
export const levelLabel = (value) => LEVELS.find((l) => l.value === value)?.label ?? value;

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

// "2026-11-03T07:00:00" → "ter, 03/11 · 07:00"
export function formatDateTime(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value ?? '');
  if (!match) return value ?? '—';
  const [, year, month, day, hour, minute] = match;
  const weekday = WEEKDAYS[new Date(Number(year), Number(month) - 1, Number(day)).getDay()];
  return `${weekday}, ${day}/${month} · ${hour}:${minute}`;
}
