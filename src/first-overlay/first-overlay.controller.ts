
import { Controller, Get } from '@nestjs/common';
import { FirstOverlayService } from './first-overlay.service.js';
import {
    ApiFirstOverlayControllerDocs,
    ApiGetCurrentFirstOverlayState,
} from './first-overlay.swagger.js';

@ApiFirstOverlayControllerDocs()
@Controller('first-overlay')
export class FirstOverlayController {
    constructor(
        private readonly firstOverlayService: FirstOverlayService,
    ) {}

    @Get('current')
    @ApiGetCurrentFirstOverlayState()
    getCurrentState() {
        return this.firstOverlayService.getCurrentState();
    }
}
