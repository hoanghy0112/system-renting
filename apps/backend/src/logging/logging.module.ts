import { Module, Global } from '@nestjs/common';
import { LoggingService } from './logging.service';
import { AppLoggerService } from './app-logger.service';

@Global()
@Module({
  providers: [LoggingService, AppLoggerService],
  exports: [LoggingService, AppLoggerService],
})
export class LoggingModule {}
