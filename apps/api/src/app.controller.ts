import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** Liveness check used by uptime monitoring and the deploy script. */
  @Get('health')
  health() {
    return this.appService.health();
  }
}
