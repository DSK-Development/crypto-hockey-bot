import { describe, it, expect, vi } from 'vitest';

describe('config: BOT_SERVICE_TOKEN and BOT_HTTP_PORT', () => {
  it('reads BOT_SERVICE_TOKEN from env and defaults BOT_HTTP_PORT/update mode', async () => {
    vi.stubEnv('BOT_TOKEN', 'bt');
    vi.stubEnv('WEBAPP_URL', 'https://app.example.com');
    vi.stubEnv('ACCOUNT_MANAGEMENT_URL', 'http://localhost:8080');
    vi.stubEnv('SERVICE_TOKEN', 'svc');
    vi.stubEnv('ENGINE_BASE_URL', 'http://localhost:8081');
    vi.stubEnv('ENGINE_SERVICE_TOKEN', 'eng');
    vi.stubEnv('BOT_SERVICE_TOKEN', 'bot-svc-secret');

    vi.resetModules();
    const { config } = await import('./env');

    expect(config.bot.serviceToken).toBe('bot-svc-secret');
    expect(config.bot.httpPort).toBe('3000');
    expect(config.bot.updateMode).toBe('polling');
  });

  it('uses webhook mode when BOT_WEBHOOK_URL is set', async () => {
    vi.stubEnv('BOT_TOKEN', 'bt');
    vi.stubEnv('WEBAPP_URL', 'https://app.example.com');
    vi.stubEnv('ACCOUNT_MANAGEMENT_URL', 'http://localhost:8080');
    vi.stubEnv('SERVICE_TOKEN', 'svc');
    vi.stubEnv('ENGINE_BASE_URL', 'http://localhost:8081');
    vi.stubEnv('ENGINE_SERVICE_TOKEN', 'eng');
    vi.stubEnv('BOT_SERVICE_TOKEN', 'bot-svc-secret');
    vi.stubEnv('BOT_WEBHOOK_URL', 'https://bot.example.com/');

    vi.resetModules();
    const { config } = await import('./env');

    expect(config.bot.updateMode).toBe('webhook');
    expect(config.bot.webhookUrl).toBe('https://bot.example.com');
  });
});
