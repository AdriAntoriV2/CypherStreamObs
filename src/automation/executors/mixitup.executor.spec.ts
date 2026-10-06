import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { MixItUpExecutor } from './mixitup.executor.js';

vi.mock('axios');

const mockedAxios = vi.mocked(axios);

describe('MixItUpExecutor', () => {
  let executor: MixItUpExecutor;

  beforeEach(() => {
    vi.clearAllMocks();

    const config = {
      getOrThrow: vi.fn().mockReturnValue(
        'http://mock-mixitup.test',
      ),
    } as unknown as ConfigService;

    executor = new MixItUpExecutor(config);
  });

  it('should send a command to MixItUp', async () => {
    mockedAxios.post.mockResolvedValue({
      status: 200,
      data: {
        success: true,
      },
    } as never);

    const result = await executor.execute({
      type: 'mixitup',
      command: 'welcome-follower',
    });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://mock-mixitup.test',
      {
        command: 'welcome-follower',
      },
      {
        timeout: 10_000,
      },
    );

    expect(result).toEqual({
      status: 200,
      data: {
        success: true,
      },
    });
  });

  it('should reject an action without a command', async () => {
    await expect(
      executor.execute({
        type: 'mixitup',
      }),
    ).rejects.toThrow(
      'MixItUp action requires a command',
    );

    expect(mockedAxios.post).not.toHaveBeenCalled();
  });
});