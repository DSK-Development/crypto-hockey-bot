import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../config/env';
import { ApiError } from '../types/api';

export class AccountApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AccountApiError';
  }
}

function createHttpClient(): AxiosInstance {
  const client = axios.create({
    baseURL: config.accountManagement.baseUrl,
    timeout: 10_000,
    headers: { 'Content-Type': 'application/json' },
  });

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiError>) => {
      const status = error.response?.status ?? 0;
      const body = error.response?.data;
      throw new AccountApiError(
        status,
        body?.code ?? 'UNKNOWN',
        body?.message ?? error.message,
      );
    },
  );

  return client;
}

export const httpClient = createHttpClient();

export function withAuth(token: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}
