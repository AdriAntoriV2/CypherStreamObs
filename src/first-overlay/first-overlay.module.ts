
import { Module } from '@nestjs/common';
import { FirstOverlayController } from './first-overlay.controller.js';
import { FirstOverlayService } from './first-overlay.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { StreamsModule } from '../streams/streams.module.js';

@Module({
    controllers: [FirstOverlayController],
    providers: [FirstOverlayService],
    imports: [DatabaseModule, StreamsModule],
    exports: [FirstOverlayService],
})
export class FirstOverlayModule {}
