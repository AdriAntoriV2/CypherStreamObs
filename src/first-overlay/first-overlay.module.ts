import { Module } from '@nestjs/common';
import { StreamsModule } from '../streams/streams.module.js';
import { FirstOverlayController } from './first-overlay.controller.js';
import { FirstOverlayService } from './first-overlay.service.js';

@Module({
  imports: [StreamsModule],
  controllers: [FirstOverlayController],
  providers: [FirstOverlayService],
  exports: [FirstOverlayService],
})
export class FirstOverlayModule {}