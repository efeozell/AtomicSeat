# AtomicSeat - Etkinlik Rezervasyon Sistemi

**AtomicSeat**, mikroservis mimarisi ile geliştirilmiş, ölçeklenebilir bir etkinlik rezervasyon ve biletleme platformudur. Konser, tiyatro, spor etkinlikleri gibi çeşitli organizasyonlar için koltuk rezervasyonu, ödeme işlemleri ve bildirim yönetimi sağlar.

## 🏗️ Mimari Genel Bakış

Proje, **NestJS** framework'ü ve **Nx Monorepo** yapısı kullanılarak geliştirilmiştir. Mikroservisler arası iletişim için **Kafka**, **RabbitMQ** ve **REST API** kullanılmaktadır.

### Diagramlar

Sistem Mimarisi
<img width="1917" height="1296" alt="image" src="https://github.com/user-attachments/assets/8064af19-7783-4b94-b395-1d3b5299f787" />

Servisler Arası İletişim
<img width="1748" height="1059" alt="image" src="https://github.com/user-attachments/assets/b8b94ccb-f995-48d6-b05b-fb4b68305050" />



### Mikroservisler

```
┌─────────────────┐
│   API Gateway   │ ← Tüm isteklerin giriş noktası
└────────┬────────┘
         │
    ┌────┴────┬──────────┬──────────┬──────────┐
    │         │          │          │          │
┌───▼───┐ ┌──▼──┐  ┌────▼────┐ ┌──▼──────┐ ┌─▼──────────┐
│ Auth  │ │Catalog│ │ Booking │ │ Payment │ │Notification│
│Service│ │Service│ │ Service │ │ Service │ │  Service   │
└───────┘ └───────┘ └─────────┘ └─────────┘ └────────────┘
    │         │          │          │             │
    └─────────┴──────────┴──────────┴─────────────┘
                         │
                    PostgreSQL
```

#### 1. **API Gateway** (Port: 3000)

- Tüm dış isteklerin merkezi giriş noktası
- JWT tabanlı kimlik doğrulama ve yetkilendirme
- Mikroservislere yönlendirme (routing)
- Consul ile servis keşfi (service discovery)

#### 2. **Auth Service** (Port: 3001)

- Kullanıcı kaydı ve girişi
- JWT token üretimi ve doğrulama
- Kullanıcı yönetimi
- Veritabanı: `auth_service_db`

#### 3. **Catalog Service** (Port: 3002)

- Etkinlik yönetimi (konser, tiyatro, spor vb.)
- Mekan (venue) yönetimi
- Koltuk şablonları ve koltuk durumu yönetimi
- Etkinlik hazırlama işlemleri (BullMQ ile)
- Veritabanı: `catalog_service_db`

#### 4. **Booking Service** (Port: 3003)

- Rezervasyon oluşturma ve yönetimi
- Koltuk kilitleme mekanizması (Redis ile)
- Kafka üzerinden ödeme olaylarını dinleme
- RabbitMQ ile bildirim gönderme
- Otomatik rezervasyon iptali (cron job)
- Veritabanı: `booking_service_db`

#### 5. **Payment Service** (Port: 3004)

- Iyzico entegrasyonu ile ödeme işlemleri
- Outbox pattern ile event yayınlama
- Kafka ile ödeme sonuçlarını yayınlama
- Veritabanı: `payment_service_db`

#### 6. **Notification Service** (Port: 3005)

- RabbitMQ ile bildirim kuyruğu yönetimi
- Email gönderimi (Nodemailer)
- SMS ve Push notification desteği (hazır altyapı)
- Bildirim logları
- Retry mekanizması ve Dead Letter Queue
- Veritabanı: `notification_service_db`

## 🔧 Teknoloji Stack

### Backend Framework & Tools

- **NestJS** - Node.js framework
- **TypeScript** - Tip güvenli geliştirme
- **Nx Monorepo** - Workspace yönetimi
- **TypeORM** - ORM katmanı

### Veritabanı & Cache

- **PostgreSQL** - İlişkisel veritabanı (her servis için ayrı DB)
- **Redis** - Cache ve koltuk kilitleme

### Message Brokers

- **Kafka** - Event streaming (Payment → Booking)
- **RabbitMQ** - Asenkron bildirimler (Booking → Notification)

### Servis Keşfi & Orchestration

- **Consul** - Service discovery ve health check
- **BullMQ** - Job queue ve background işlemler

### Ödeme & İletişim

- **Iyzico** - Ödeme gateway entegrasyonu
- **Nodemailer** - Email gönderimi

### Diğer

- **Passport JWT** - Kimlik doğrulama
- **class-validator** - DTO validasyonu
- **bcrypt** - Şifre hashleme

## 📋 Çözülen Problemler ve Uygulanan Patternler

### 1. **Distributed Transaction Yönetimi**

**Problem:** Mikroservis mimarisinde, ödeme ve rezervasyon gibi işlemler farklı servislerde gerçekleşir. Klasik ACID transaction'lar çalışmaz.

**Çözüm:**

- **Saga Pattern** uygulandı
- **Outbox Pattern** ile güvenilir event yayınlama
- Payment Service'te outbox tablosu kullanılarak atomik işlem garantisi
- Cron job ile outbox eventleri Kafka'ya publish edilir

```typescript
// payment-service/outbox-relay.processor.ts
@Cron(CronExpression.EVERY_5_SECONDS)
async relayOutboxEvents() {
  const pendingEvents = await this.outboxRepo.find({
    where: { status: OutboxStatus.PENDING },
    order: { created_at: 'ASC' },
    take: 100,
  });
  // Kafka'ya publish et
}
```

### 2. **Race Condition ve Koltuk Çakışması**

**Problem:** Aynı koltuğu birden fazla kullanıcı aynı anda rezerve etmeye çalışabilir.

**Çözüm:**

- **Redis Distributed Lock** kullanıldı
- Koltuk rezervasyonu sırasında Redis'te TTL'li key oluşturulur
- Pessimistic locking ile veritabanı seviyesinde de koruma

```typescript
// Redis ile koltuk kilitleme
const lockKey = `seat:lock:${seatId}`;
await redis.set(lockKey, userId, 'EX', 300); // 5 dakika
```

### 3. **Asenkron İletişim ve Event-Driven Architecture**

**Problem:** Servisler arası senkron çağrılar sistemin ölçeklenebilirliğini ve dayanıklılığını azaltır.

**Çözüm:**

- **Kafka** ile event streaming (Payment → Booking)
- **RabbitMQ** ile pub/sub messaging (Booking → Notification)
- Topic-based routing ile esnek bildirim yönetimi

```typescript
// Kafka Consumer - booking-service
await this.consumer.subscribe({
  topics: ['payment.events.completed', 'payment.events.failed'],
  fromBeginning: false,
});
```

### 4. **Bildirim Güvenilirliği**

**Problem:** Email gönderimi başarısız olabilir, ağ sorunları yaşanabilir.

**Çözüm:**

- **Retry Mechanism** ile 3 deneme hakkı
- **Dead Letter Queue (DLQ)** ile başarısız mesajları saklama
- Geçici ve kalıcı hataları ayırt etme
- Bildirim logları ile izlenebilirlik

```typescript
// email-consumer.service.ts
if (retryCount >= 3) {
  this.channel.nack(msg, false, false); // DLQ'ya gönder
  return;
}

if (this.isRetryableError(error)) {
  this.channel.nack(msg, false, true); // Queue'ya geri dön
}
```

### 5. **Servis Keşfi ve Load Balancing**

**Problem:** Mikroservislerin dinamik IP adresleri ve port'ları değişebilir.

**Çözüm:**

- **Consul** ile service registry
- Health check mekanizması
- Client-side load balancing
- Sağlıklı instance seçimi

```typescript
// consul-helper.service.ts
const healthyInstances = result.filter((entry) => {
  return entry.Checks.every((check: any) => check.Status === 'passing');
});

const selectedInstance = healthyInstances[Math.floor(Math.random() * healthyInstances.length)];
```

### 6. **Rezervasyon Timeout Yönetimi**

**Problem:** Kullanıcı ödeme yapmadan rezervasyonu terk ederse koltuklar kilitli kalır.

**Çözüm:**

- **Cron Job** ile otomatik iptal mekanizması
- Pending durumundaki eski rezervasyonları temizleme
- Redis lock'ların TTL ile otomatik silinmesi

```typescript
// booking.cron.ts
@Cron(CronExpression.EVERY_MINUTE)
async cancelExpiredBookings() {
  const expiredBookings = await this.bookingRepo.find({
    where: {
      status: BookingStatus.PENDING,
      created_at: LessThan(new Date(Date.now() - 15 * 60 * 1000))
    }
  });
  // İptal et ve koltukları serbest bırak
}
```

### 7. **Shared Library ile Kod Tekrarını Önleme**

**Problem:** Her mikroserviste ortak kod (auth guards, database config, DTOs) tekrarlanıyor.

**Çözüm:**

- **Nx Shared Library** oluşturuldu
- JWT Strategy, Guards, Decorators paylaşıldı
- Database module, Mail service merkezi hale getirildi
- DTO'lar tek yerden yönetiliyor

```
libs/shared/
├── auth/          # JWT strategy, guards, decorators
├── database/      # TypeORM config
├── dtos/          # Paylaşılan DTO'lar
├── mail/          # Mail service
└── consul/        # Consul helper
```

### 8. **Idempotency ve Duplicate Prevention**

**Problem:** Ağ sorunları nedeniyle aynı istek birden fazla işlenebilir.

**Çözüm:**

- Kafka message key'leri ile deduplication
- Outbox pattern ile exactly-once semantics
- Unique constraint'ler ile veritabanı seviyesinde koruma

### 9. **Background Job Processing**

**Problem:** Etkinlik oluşturulduğunda binlerce koltuk kaydı senkron olarak yapılamaz.

**Çözüm:**

- **BullMQ** ile asenkron job processing
- Event preparation processor ile toplu koltuk oluşturma
- Redis-backed queue ile dayanıklılık

```typescript
// event-preparation.processors.ts
@Process('prepare-event-seats')
async handleEventPreparation(job: Job) {
  // Venue template'inden koltukları oluştur
  // Toplu insert ile performans optimizasyonu
}
```

### 10. **Multi-Channel Notification**

**Problem:** Kullanıcılara email, SMS ve push notification gönderilmeli.

**Çözüm:**

- RabbitMQ Topic Exchange ile routing
- Routing key'lere göre farklı consumer'lar
- Priority-based message handling

```typescript
// notification-publisher.service.ts
await this.channel.publish(
  'notifications.topic',
  'booking.confirmed.email', // Routing key
  Buffer.from(JSON.stringify(payload)),
  { persistent: true, priority: 5 },
);
```

## 🚀 Kurulum ve Çalıştırma

### Gereksinimler

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Kafka 3+
- RabbitMQ 3.12+
- Consul 1.15+

### 1. Bağımlılıkları Yükle

```bash
npm install
```

### 2. Ortam Değişkenlerini Ayarla

`.env` dosyasını düzenleyin:

```env
# Database
DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=myuser
DB_PASSWORD=mypassword

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key

# Consul
CONSUL_HOST=localhost
CONSUL_PORT=8500

# Email
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Iyzico
IYZICO_API_KEY=your-api-key
IYZICO_API_KEY_SECRET=your-secret-key
```

### 3. Veritabanlarını Oluştur

```sql
CREATE DATABASE auth_service_db;
CREATE DATABASE catalog_service_db;
CREATE DATABASE booking_service_db;
CREATE DATABASE payment_service_db;
CREATE DATABASE notification_service_db;
```

### 4. Servisleri Başlat

Her servisi ayrı terminalde çalıştırın:

```bash
# API Gateway
npx nx serve api-gateway

# Auth Service
npx nx serve auth-service

# Catalog Service
npx nx serve catalog-service

# Booking Service
npx nx serve booking-service

# Payment Service
npx nx serve payment-service

# Notification Service
npx nx serve notification-service
```

### 5. Altyapı Servislerini Başlat

Docker Compose kullanarak:

```bash
docker-compose up -d
```

## 📡 API Endpoints

### Auth Service (via API Gateway)

```
POST /auth/register     # Kullanıcı kaydı
POST /auth/login        # Giriş
POST /auth/refresh      # Token yenileme
GET  /auth/profile      # Profil bilgisi
```

### Catalog Service

```
POST   /catalog/venues           # Mekan oluştur
GET    /catalog/venues           # Mekanları listele
POST   /catalog/events           # Etkinlik oluştur
GET    /catalog/events           # Etkinlikleri listele
GET    /catalog/events/:id/seats # Etkinlik koltukları
```

### Booking Service

```
POST   /booking/create           # Rezervasyon oluştur
GET    /booking/:id              # Rezervasyon detayı
GET    /booking/user/:userId     # Kullanıcı rezervasyonları
DELETE /booking/:id              # Rezervasyon iptal
```

### Payment Service

```
POST /payment/initialize         # Ödeme başlat
POST /payment/callback           # Ödeme callback
GET  /payment/:bookingId         # Ödeme durumu
```

## 🔍 Monitoring ve Logging

### Health Checks

Her servis `/health` endpoint'i sunar:

```bash
curl http://localhost:3000/health
```

### Consul UI

```
http://localhost:8500
```

### Veritabanı İzleme

TypeORM logging aktif:

```typescript
DB_LOGGING = true;
```

## 🧪 Test

```bash
# Unit testler
npx nx test <service-name>

# Tüm testler
npx nx run-many --target=test --all

# E2E testler
npx nx e2e <service-name>-e2e
```

## 📦 Build ve Deploy

### Production Build

```bash
# Tek servis
npx nx build api-gateway --configuration=production

# Tüm servisler
npx nx run-many --target=build --all --configuration=production
```

### Docker Build

```bash
docker build -t atomic-seat/api-gateway -f apps/api-gateway/Dockerfile .
```

## 🔐 Güvenlik

- JWT token tabanlı kimlik doğrulama
- Bcrypt ile şifre hashleme
- Role-based access control (RBAC)
- Rate limiting (API Gateway seviyesinde)
- Input validation (class-validator)
- SQL injection koruması (TypeORM)

## 🎯 Gelecek Geliştirmeler

- [ ] GraphQL API desteği
- [ ] WebSocket ile real-time koltuk durumu
- [ ] Elasticsearch ile gelişmiş arama
- [ ] Prometheus + Grafana ile monitoring
- [ ] Circuit breaker pattern
- [ ] API Gateway rate limiting
- [ ] SMS ve Push notification implementasyonu
- [ ] Multi-tenant support
- [ ] Kubernetes deployment manifests

## 📚 Öğrenilen Dersler

1. **Outbox Pattern Kritik**: Distributed transaction'larda veri tutarlılığı için outbox pattern şart
2. **Redis Lock TTL**: Distributed lock'larda mutlaka TTL kullanın, aksi halde deadlock riski
3. **Retry Stratejisi**: Geçici ve kalıcı hataları ayırt edin, her hatayı retry etmeyin
4. **Event Ordering**: Kafka partition key'leri ile event sıralamasını garantileyin
5. **Health Checks**: Consul health check'leri ile servis sağlığını sürekli izleyin
6. **Shared Library**: Ortak kodu shared library'de toplayın, kod tekrarını önleyin
7. **Async Communication**: Mikroservisler arası iletişimde mümkün olduğunca async pattern kullanın

## 👥 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'feat: Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

MIT License - Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 📞 İletişim

Proje Sahibi - [@yourhandle](https://twitter.com/yourhandle)

Proje Linki: [https://github.com/yourusername/atomic-seat](https://github.com/yourusername/atomic-seat)

---

⭐ Bu projeyi beğendiyseniz yıldız vermeyi unutmayın!
