import { Controller, Get } from '@nestjs/common';
import { FirstOverlayService } from './first-overlay.service.js';

@Controller('first-overlay')
export class FirstOverlayController {
  constructor(
    private readonly firstOverlayService: FirstOverlayService,
  ) {}

  @Get('current')
  getCurrentState() {
    return this.firstOverlayService.getCurrentState();
  }
}