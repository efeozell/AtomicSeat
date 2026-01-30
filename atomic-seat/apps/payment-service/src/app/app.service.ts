import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Payment,
  PaymentProvider,
  PaymentStatus,
} from './payment/payment.entity';
import { DataSource, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Iyzipay from 'iyzipay';
import { MicroserviceClientService } from '@atomic-seat/shared';
import { OutboxEvent, OutboxStatus } from './outbox/outbox.entity';

@Injectable()
export class AppService {
  private iyzico: any;
  private readonly logger = new Logger(AppService.name);

  constructor(
    @InjectRepository(Payment)
    private paymentRepo: Repository<Payment>,
    @InjectRepository(OutboxEvent)
    private outboxRepo: Repository<OutboxEvent>,
    private dataSource: DataSource,
    private configService: ConfigService,
    private readonly msClient: MicroserviceClientService,
  ) {
    const apiKey = this.configService.get<string>('IYZICO_API_KEY');
    const secretKey = this.configService.get<string>('IYZICO_API_KEY_SECRET');
    const uri = this.configService.get<string>('IYZIPAY_URI');

    this.iyzico = new Iyzipay({
      apiKey,
      secretKey,
      uri,
    });
  }

  async createPaymentSession(data: {
    bookingId: string;
    userId: string;
    amount: number;
    currency: string;
    description: string;
    metadata?: any;
  }) {
    try {
      console.log(`💳 Payment session olusturuluyor...`);
      console.log(`📝 Data:`, JSON.stringify(data, null, 2));

      const securityToken = crypto.randomBytes(32).toString('hex');

      //Iyzico checkout form olusturmadan once gelen userId ile birlikte kullaniciinin bilgilerini cekiyoruz.
      const userResponse = await this.msClient.send(
        'auth-service',
        { cmd: 'get-user-by-id' },
        data.userId,
      );

      if (userResponse.error || !userResponse.data) {
        console.error('❌ User alınamadı:', userResponse.message);
        throw new UnauthorizedException(
          userResponse.message || 'Kullanici bulunamadi',
        );
      }

      const user = userResponse.data;

      //iyzico checkout form olusturuyoruz

      const userName = user.name || 'Ad Soyad Girilmemis';
      const userAddress = user.address || 'Adres Girilmemis';

      const checkoutFormRequest = {
        locale: Iyzipay.LOCALE.TR,
        conversationId: data.bookingId,
        price: data.amount.toString(),
        paidPrice: data.amount.toString(),
        currency: Iyzipay.CURRENCY.TRY,
        basketId: data.bookingId,
        paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
        callbackUrl: `${this.configService.get<string>('PAYMENT_CALLBACK_URL')}/payments/webhook/iyzico`,
        enabledInstallments: [1],
        buyer: {
          id: data.userId,
          name: userName,
          surname: userName,
          email: user.email,
          identityNumber: '11111111111',
          registrationAddress: userAddress,
          city: 'Denizli',
          country: 'Turkey',
        },
        shippingAddress: {
          contactName: userName,
          city: 'Denizli',
          country: 'Turkey',
          address: userAddress,
        },
        billingAddress: {
          contactName: userName,
          city: 'Denizli',
          country: 'Turkey',
          address: userAddress,
        },

        basketItems: [
          {
            id: 'event-ticket',
            name: data.description,
            category1: 'Event Tickets',
            itemType: Iyzipay.BASKET_ITEM_TYPE.VIRTUAL,
            price: data.amount.toString(),
          },
        ],
      };

      const checkoutForm = await new Promise<any>((resolve, reject) => {
        this.iyzico.checkoutFormInitialize.create(
          checkoutFormRequest,
          (err, result) => {
            if (err) reject(err);
            else resolve(result);
          },
        );
      });

      if (checkoutForm.status !== 'success') {
        throw new BadRequestException(
          `iyzico hatasi: ${checkoutForm.errorMessage}`,
        );
      }

      const payment = this.paymentRepo.create({
        booking_id: data.bookingId,
        user_id: data.userId,
        amount: data.amount,
        currency: data.currency,
        provider: PaymentProvider.IYZICO,
        status: PaymentStatus.PENDING,
        session_id: checkoutForm.conversationId,
        checkout_url: checkoutForm.paymentPageUrl,
        security_token: securityToken,
        metadata: data.metadata,
      });

      await this.paymentRepo.save(payment);

      console.log(`✅ Payment session olusturuldu: ${payment.session_id}`);

      return {
        sessionId: payment.session_id,
        checkoutUrl: payment.checkout_url,
        token: securityToken,
        expiresIn: 900,
      };
    } catch (error) {
      console.log(
        `Payment Session olusturulurken hata ${error} ${error.message}`,
      );
    }
  }

  async handleIyzicoWebhook(token: string) {
    console.log(`🔔 Iyzico webhook alindi: ${token}`);

    const request = {
      locale: Iyzipay.LOCALE.TR,
      token: token,
    };

    const result = await new Promise<any>((resolve, reject) => {
      this.iyzico.checkoutForm.retrieve(request, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

    if (result.status !== 'success') {
      console.error('❌ iyzico webhook hatasi: ', result.errorMessage);
      throw new BadRequestException(`Iyzico hatasi: ${result.errorMessage}`);
    }

    // conversationId üzerinden payment buluyoruz
    const payment = await this.paymentRepo.findOne({
      where: { session_id: result.basketId },
    });

    if (!payment) {
      console.error('❌ Payment bulunamadi, basketId: ', result.basketId);
      throw new BadRequestException('Payment kaydı bulunamadı');
    }

    // Zaten işlenmiş mi kontrol et (idempotency)
    if (payment.status !== PaymentStatus.PENDING) {
      console.warn(
        `⚠️ Payment zaten işlenmiş: ${payment.id}, status: ${payment.status}`,
      );
      return { success: true, alreadyProcessed: true };
    }

    if (result.paymentStatus === 'SUCCESS') {
      await this.completePayment(payment.id, result.paymentId);
    } else {
      await this.failPayment(
        payment.id,
        result.errorMessage || 'Odeme basarisiz',
      );
    }

    return { success: true };
  }

  private async completePayment(
    paymentId: string,
    providerPaymentId: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(Payment, {
        where: { id: paymentId },
      });

      if (!payment) throw new Error('Payment bulunamadi');

      // 1- Payment status guncelle
      payment.status = PaymentStatus.COMPLETED;
      payment.provider_payment_id = providerPaymentId;
      payment.completed_at = new Date();

      await manager.save(payment);

      this.logger.log(`✅ Payment tamamlandi: ${paymentId}`);

      // 2- Outbox event olustur
      const outboxEvent = manager.create(OutboxEvent, {
        aggregate_type: 'payment',
        aggregate_id: paymentId,
        event_type: 'payment.completed',
        payload: {
          paymentId: payment.id,
          bookingId: payment.booking_id,
          userId: payment.user_id,
          amount: payment.amount,
          currency: payment.currency,
          providerPaymentId: providerPaymentId,
          completedAt: new Date().toISOString(),
        },
        status: OutboxStatus.PENDING,
        retry_count: 0,
        max_retries: 3,
      });

      await manager.save(outboxEvent);

      this.logger.log(
        `📤 Outbox event (completed) olusturuldu: ${outboxEvent.id}`,
      );
    });
  }

  private async failPayment(paymentId: string, reason: string) {
    await this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(Payment, {
        where: { id: paymentId },
      });

      if (!payment) throw new Error('Payment bulunamadi');

      // 1- Payment status guncelle
      payment.status = PaymentStatus.FAILED;
      payment.error_message = reason;

      await manager.save(payment);

      this.logger.log(`❌ Payment basarisiz: ${paymentId}, sebep: ${reason}`);

      // 2- Outbox event olustur
      const outboxEvent = manager.create(OutboxEvent, {
        aggregate_type: 'payment',
        aggregate_id: paymentId,
        event_type: 'payment.failed',
        payload: {
          paymentId: paymentId,
          bookingId: payment.booking_id,
          userId: payment.user_id,
          errorMessage: reason,
          failedAt: new Date().toISOString(),
        },
        status: OutboxStatus.PENDING,
      });

      await manager.save(outboxEvent);

      this.logger.log(
        `📤 Outbox event (failed) olusturuldu: ${outboxEvent.id}`,
      );
    });
  }
}
