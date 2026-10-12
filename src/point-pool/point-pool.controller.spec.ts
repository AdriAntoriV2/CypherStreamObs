import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PointPoolController } from './point-pool.controller.js';
import { PointPoolService } from './point-pool.service.js';
import { ChatCommandAdminGuard } from '../chat-commands/chat-command-admin.guard.js';

describe('PointPoolController', () => {
  let controller: PointPoolController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PointPoolController],
      providers: [
        {
          provide: PointPoolService,
          useValue: {},
        },
        ChatCommandAdminGuard,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: () => 'test-admin-user-id',
          },
        },
      ],
    }).compile();

    controller = module.get<PointPoolController>(PointPoolController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});