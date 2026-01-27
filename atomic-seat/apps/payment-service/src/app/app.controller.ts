import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { MessagePattern } from '@nestjs/microservices';
import { Response } from 'express';

@Controller('payments')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @MessagePattern({ cmd: 'create-payment-session' })
  async createPaymentSession(data: {
    bookingId: string;
    userId: string;
    amount: number;
    currency: string;
    description: string;
    metadata?: any;
  }) {
    return this.appService.createPaymentSession(data);
  }

  @Post('webhook/iyzico')
  async iyzicoWebhook(@Body() body: any, @Res() res: Response) {
    const { token } = body;

    if (!token) {
      console.error('❌ Webhook token eksik');
      return res.status(400).json({ message: 'Token eksik' });
    }

    try {
      await this.appService.handleIyzicoWebhook(token);
      return res.status(200).send('OK');
    } catch (error) {
      console.error('❌ Webhook işleme hatası:', error.message);
      return res.status(500).json({ message: 'Webhook işlenemedi' });
    }
  }

  @Get('booking/success')
  testFrontendSuccess(@Query('token') token: string) {
    return `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ödeme Başarılı</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', system-ui, sans-serif;
        }

        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .card {
            background: white;
            border-radius: 20px;
            padding: 50px 40px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 500px;
            width: 100%;
            position: relative;
            overflow: hidden;
        }

        .success-icon {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #10b981, #059669);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 25px;
            color: white;
            font-size: 2.5rem;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }

        h1 {
            color: #10b981;
            margin-bottom: 15px;
            font-size: 2.2rem;
        }

        .message {
            color: #666;
            margin-bottom: 30px;
            line-height: 1.6;
            font-size: 1.1rem;
        }

        .token-box {
            background: #f8fafc;
            border: 2px dashed #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            margin: 25px 0;
            text-align: center;
        }

        .token-label {
            display: block;
            color: #64748b;
            font-size: 0.9rem;
            font-weight: 600;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .token {
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 1.1rem;
            color: #1e293b;
            font-weight: 600;
            word-break: break-all;
        }

        .note {
            background: #f0fdf4;
            border-left: 4px solid #10b981;
            padding: 15px;
            margin-top: 25px;
            text-align: left;
            border-radius: 0 8px 8px 0;
            font-size: 0.95rem;
            color: #374151;
        }

        .note strong {
            color: #059669;
        }

        .footer {
            margin-top: 30px;
            color: #94a3b8;
            font-size: 0.9rem;
        }

        @media (max-width: 480px) {
            .card {
                padding: 40px 25px;
            }

            h1 {
                font-size: 1.8rem;
            }

            .success-icon {
                width: 70px;
                height: 70px;
                font-size: 2rem;
            }
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="success-icon">
            <i class="fas fa-check"></i>
        </div>

        <h1>Ödeme Başarılı! 🎉</h1>

        <p class="message">
            Ödemeniz başarıyla tamamlandı. Aşağıda işleminize ait token bilgisini görebilirsiniz.
        </p>

        <div class="token-box">
            <span class="token-label">İşlem Token'ı</span>
            <div class="token">${token}</div>
        </div>

        <div class="note">
            <strong>Not:</strong> Bu sayfa sadece backend testi için oluşturulmuştur.
            Token bilgisi başarıyla alınmıştır.
        </div>

        <div class="footer">
            <i class="fas fa-shield-alt"></i> Güvenli Ödeme | Test Ortamı
        </div>
    </div>
</body>
</html>
    `;
  }

  @Get('booking/failure')
  testFrontendFailure(@Query('token') token: string) {
    const errorDetails = 'ÖDEME_REDDEDILDI';
    return `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ödeme Başarısız</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', system-ui, sans-serif;
        }

        body {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .card {
            background: white;
            border-radius: 20px;
            padding: 50px 40px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 500px;
            width: 100%;
            position: relative;
            overflow: hidden;
        }

        .error-icon {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #ef4444, #dc2626);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 25px;
            color: white;
            font-size: 2.5rem;
            animation: shake 0.5s ease-in-out 3;
        }

        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }

        h1 {
            color: #dc2626;
            margin-bottom: 15px;
            font-size: 2.2rem;
        }

        .message {
            color: #666;
            margin-bottom: 30px;
            line-height: 1.6;
            font-size: 1.1rem;
        }

        .error-box {
            background: #fef2f2;
            border: 2px dashed #fecaca;
            border-radius: 12px;
            padding: 20px;
            margin: 25px 0;
            text-align: left;
        }

        .error-label {
            display: block;
            color: #dc2626;
            font-size: 0.9rem;
            font-weight: 600;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .error-details {
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 1rem;
            color: #7f1d1d;
            word-break: break-all;
        }

        .suggestions {
            background: #fffbeb;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin-top: 25px;
            text-align: left;
            border-radius: 0 8px 8px 0;
        }

        .suggestions h3 {
            color: #d97706;
            margin-bottom: 10px;
            font-size: 1.1rem;
        }

        .suggestions ul {
            padding-left: 20px;
            color: #78350f;
        }

        .suggestions li {
            margin-bottom: 8px;
            font-size: 0.95rem;
        }

        .actions {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin-top: 30px;
        }

        .btn {
            padding: 14px 28px;
            border-radius: 10px;
            font-weight: 600;
            font-size: 1rem;
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            border: none;
            text-decoration: none;
        }

        .btn-primary {
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(59, 130, 246, 0.4);
        }

        .btn-secondary {
            background: #f1f5f9;
            color: #475569;
            border: 1px solid #cbd5e1;
        }

        .btn-secondary:hover {
            background: #e2e8f0;
            transform: translateY(-2px);
        }

        .footer {
            margin-top: 30px;
            color: #94a3b8;
            font-size: 0.9rem;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
        }

        .contact-info {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-top: 15px;
            font-size: 0.9rem;
        }

        .contact-item {
            display: flex;
            align-items: center;
            gap: 5px;
            color: #64748b;
        }

        .contact-item i {
            color: #3b82f6;
        }

        @media (max-width: 480px) {
            .card {
                padding: 40px 25px;
            }

            h1 {
                font-size: 1.8rem;
            }

            .error-icon {
                width: 70px;
                height: 70px;
                font-size: 2rem;
            }

            .actions {
                flex-direction: column;
            }

            .btn {
                justify-content: center;
            }
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="error-icon">
            <i class="fas fa-times"></i>
        </div>

        <h1>Ödeme Başarısız! ⚠️</h1>

        <p class="message">
            Ödemeniz işleme alınamadı. Lütfen bilgilerinizi kontrol edip tekrar deneyiniz.
        </p>

        <div class="error-box">
            <span class="error-label">Hata Kodu / Detay</span>
            <div class="error-details">${errorDetails}</div>
        </div>

        <div class="suggestions">
            <h3><i class="fas fa-lightbulb"></i> Öneriler:</h3>
            <ul>
                <li>Kart bilgilerinizi kontrol edin</li>
                <li>Bakiyenizin yeterli olduğundan emin olun</li>
                <li>İnternet bağlantınızı kontrol edin</li>
                <li>Bankanızla iletişime geçin</li>
            </ul>
        </div>

        <div class="actions">
            <a href="/" class="btn btn-primary">
                <i class="fas fa-redo"></i> Tekrar Dene
            </a>
            <a href="/support" class="btn btn-secondary">
                <i class="fas fa-headset"></i> Destek Al
            </a>
        </div>

        <div class="footer">
            <p>Ödeme işleminiz tamamlanamadı. Sorun devam ederse lütfen bizimle iletişime geçin.</p>

            <div class="contact-info">
                <div class="contact-item">
                    <i class="fas fa-phone"></i>
                    <span>0850 123 45 67</span>
                </div>
                <div class="contact-item">
                    <i class="fas fa-envelope"></i>
                    <span>destek@sirket.com</span>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
  `;
  }

  @Get('success')
  async paymentSuccess(@Query('token') token: string, @Res() res: Response) {
    return res.redirect(
      `http://localhost:3005/payments/booking/success?token=${token}`,
    );
  }

  @Get('failure')
  async paymentFailure(@Query('token') token: string, @Res() res: Response) {
    return res.redirect(
      `http://localhost:3005/payments/booking/failure?token=${token}`,
    );
  }
}
