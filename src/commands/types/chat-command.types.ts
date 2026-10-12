export interface ChatCommandContext {
  command: string;
  args: string[];
  rawMessage: string;

  user: {
    id: string;
    login: string;
    displayName: string;
  };

  streamId: string;
}

export interface ChatCommandHandler {
  readonly command: string;

  execute(
    context: ChatCommandContext,
  ): Promise<unknown>;
}