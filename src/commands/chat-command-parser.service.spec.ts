import { describe, expect, it } from 'vitest';
import { ChatCommandParser } from './chat-command-parser.service.js';

describe('ChatCommandParser', () => {
  const parser =
    new ChatCommandParser();

  it('parses a command with one argument', () => {
    expect(
      parser.parse(
        '!sr https://youtube.com/watch?v=abc',
      ),
    ).toEqual({
      command: 'sr',
      args: [
        'https://youtube.com/watch?v=abc',
      ],
    });
  });

  it('parses multiple arguments', () => {
    expect(
      parser.parse(
        '!command first second third',
      ),
    ).toEqual({
      command: 'command',
      args: [
        'first',
        'second',
        'third',
      ],
    });
  });

  it('normalizes the command name to lowercase', () => {
    expect(
      parser.parse('!QUEUE'),
    ).toEqual({
      command: 'queue',
      args: [],
    });
  });

  it('handles extra whitespace', () => {
    expect(
      parser.parse(
        '   !sr    song    request   ',
      ),
    ).toEqual({
      command: 'sr',
      args: [
        'song',
        'request',
      ],
    });
  });

  it('returns null for a normal chat message', () => {
    expect(
      parser.parse('hello world'),
    ).toBeNull();
  });

  it('returns null for an empty command', () => {
    expect(
      parser.parse('!'),
    ).toBeNull();
  });

  it('returns null for whitespace only', () => {
    expect(
      parser.parse('   '),
    ).toBeNull();
  });
});