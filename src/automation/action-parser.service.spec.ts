import { describe, expect, it } from 'vitest';
import { ActionParser } from './action-parser.service.js';

describe('ActionParser', () => {
  const parser = new ActionParser();

  it('should parse a webhook action', () => {
    const action = parser.parse({
      type: 'webhook',
      url: 'https://example.com/webhook',
      method: 'POST',
      body: {
        hello: 'world',
      },
    });

    expect(action).toEqual({
      type: 'webhook',
      url: 'https://example.com/webhook',
      method: 'POST',
      body: {
        hello: 'world',
      },
    });
  });

  it('should parse a MixItUp action', () => {
    const action = parser.parse({
      type: 'mixitup',
      command: '!song',
    });

    expect(action).toEqual({
      type: 'mixitup',
      command: '!song',
    });
  });

  it('should reject a non-object action', () => {
    expect(() => parser.parse(null)).toThrow(
      'Automation action must be an object',
    );

    expect(() => parser.parse('webhook')).toThrow(
      'Automation action must be an object',
    );

    expect(() => parser.parse([])).toThrow(
      'Automation action must be an object',
    );
  });

  it('should reject an unsupported action type', () => {
    expect(() =>
      parser.parse({
        type: 'discord',
      }),
    ).toThrow(
      'Unsupported automation action type: discord',
    );
  });

  it('should reject a webhook without a URL', () => {
    expect(() =>
      parser.parse({
        type: 'webhook',
      }),
    ).toThrow(
      'Webhook action requires a URL',
    );
  });

  it('should reject a webhook with an invalid method', () => {
    expect(() =>
      parser.parse({
        type: 'webhook',
        url: 'https://example.com',
        method: 'INVALID',
      }),
    ).toThrow(
      'Webhook action has an invalid HTTP method',
    );
  });

  it('should reject a webhook with an invalid body', () => {
    expect(() =>
      parser.parse({
        type: 'webhook',
        url: 'https://example.com',
        body: 'invalid',
      }),
    ).toThrow(
      'Webhook action body must be an object',
    );
  });

  it('should reject a MixItUp action without a command', () => {
    expect(() =>
      parser.parse({
        type: 'mixitup',
      }),
    ).toThrow(
      'MixItUp action requires a command',
    );
  });
});