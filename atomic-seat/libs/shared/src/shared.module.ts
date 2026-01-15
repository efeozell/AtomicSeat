import { Module } from '@nestjs/common';
import { SharedService } from './shared.service';
import { DatabaseModule } from './lib/database/database.module';
import { MailModule } from './lib/mail/mail.module';

@Module({
  imports: [MailModule, MailModule],
  providers: [SharedService],
  exports: [SharedService],
})
export class SharedModule {}
