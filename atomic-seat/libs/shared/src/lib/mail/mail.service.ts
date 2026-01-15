import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: any;
  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASS'),
      },
      tls: {
        rejectUnauthorized:
          configService.get<string>('NODE_ENV') === 'production',
      },
    });
  }

  async sendMail(to: string, subject: string, html?: string, text?: string) {
    const mailOptions = {
      from: this.configService.get<string>('EMAIL_USER'),
      to,
      subject,
      text,
      html,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Email gonderildi: ${info.messageId}`);
    } catch (error) {
      console.log(`Email Gonderilirken Hata ${error}`);
      throw new BadRequestException('Email gonderilirken hata olustu');
    }
  }
}
