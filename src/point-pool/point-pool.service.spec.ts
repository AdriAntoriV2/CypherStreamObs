import { Test, TestingModule } from '@nestjs/testing';
import { PointPoolService } from './point-pool.service.js';
import { PrismaService } from '../database/prisma.service.js';

describe('PointPoolService', () => {
  let service: PointPoolService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointPoolService,
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<PointPoolService>(PointPoolService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});