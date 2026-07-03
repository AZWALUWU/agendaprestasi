# Enterprise 7-Layer Architecture — Roadmap

> Rencana evolusi arsitektur Agenda Prestasi dari MVP monolithic ke
> enterprise-grade 7-layer system. Bukan untuk dikerjakan sekarang,
> tapi sebagai panduan ketika skala dan tim sudah membutuhkannya.

---

## Daftar Isi

- [Status Saat Ini vs Enterprise](#status-saat-ini-vs-enterprise)
- [Layer 1: Client Layer](#layer-1-client-layer)
- [Layer 2: API Gateway Layer](#layer-2-api-gateway-layer)
- [Layer 3: Application Layer](#layer-3-application-layer)
- [Layer 4: Caching Layer](#layer-4-caching-layer)
- [Layer 5: Database Layer](#layer-5-database-layer)
- [Layer 6: Data Processing Layer](#layer-6-data-processing-layer)
- [Layer 7: Infrastructure Layer](#layer-7-infrastructure-layer)
- [Trigger untuk Scale Up](#trigger-untuk-scale-up)
- [Estimasi Biaya & Tim](#estimasi-biaya--tim)
- [Next Step Realistis](#next-step-realistis)

---

## Status Saat Ini vs Enterprise

| Layer | Saat Ini | Enterprise |
|-------|----------|------------|
| **1. Client** | ✅ React SPA + SSR, responsive | Micro-frontends, PWA offline-first, multi-platform, design system, feature flags |
| **2. API Gateway** | ⚠️ Parsial — Worker sebagai entry point | Kong/AWS Gateway, auth proxy terpusat, canary routing, developer portal |
| **3. Application** | ✅ Monolithic TanStack Start | Microservices + gRPC + event-driven + GraphQL Federation |
| **4. Caching** | ✅ Cloudflare KV + Query cache | Redis cluster, CDN, global cache, multi-tier strategies |
| **5. Database** | ✅ Supabase PostgreSQL (single) | Read replicas, sharding, Elasticsearch, vector DB, CQRS, CDC |
| **6. Data Processing** | ❌ Tidak ada | Kafka + Flink, Airflow + dbt, ML pipeline, real-time dashboard |
| **7. Infrastructure** | ⚠️ Parsial — Serverless + deploy.sh | Kubernetes, Istio, GitOps, multi-region, chaos engineering |

---

## Layer 1: Client Layer

### Target Arsitektur

```
┌─────────────────────────────────────────────────────────┐
│                    agendaprestasi.com                     │
├────────────┬────────────┬──────────────┬────────────────┤
│  @agenda/  │  @agenda/  │   @agenda/   │   @agenda/    │
│  posts     │  calendar  │   admin      │   shared      │
│  (MFE)     │  (MFE)     │   (MFE)      │   (DS + utils)│
├────────────┴────────────┴──────────────┴────────────────┤
│                React Native (mobile)                     │
├─────────────────────────────────────────────────────────┤
│            Module Federation (Webpack 5 / Vite)          │
└─────────────────────────────────────────────────────────┘
```

### Komponen

| Komponen | Teknologi | Prioritas |
|----------|-----------|-----------|
| Micro-frontends | Vite Module Federation / Webpack 5 Module Federation | Medium |
| PWA Offline-first | Workbox + IndexedDB | High |
| Mobile apps | React Native / Flutter | High |
| Design System | Storybook + Chromatic + `@agenda/design-system` | Medium |
| SSR streaming | React 19 `renderToPipeableStream` | Low (already partially done) |
| Image optimization | Cloudflare Images / Imgix | Medium |
| Feature flags | LaunchDarkly / Statsig | Low |
| i18n | next-intl / react-i18next | Low (if going international) |

### Trigger

- Tim FE > 3 orang → MFE boundaries
- Traffic > 100k MAU → PWA + image optimization
- Butuh mobile app → React Native

---

## Layer 2: API Gateway Layer

### Target Arsitektur

```
                        ┌──────────────┐
                        │   Kong API    │
 Client ───────────────►│   Gateway     │◄─── Rate Limit, Auth, Logging
                        │   (Managed)   │
                        └──────┬───────┘
                               │
               ┌───────────────┼───────────────┐
               ▼               ▼               ▼
        Auth Service      Post Service     User Service
             +                  +               +
        Supabase Auth     Post queries     User queries
```

### Komponen

| Komponen | Teknologi | Prioritas |
|----------|-----------|-----------|
| API Gateway | Kong (self-host) / Cloudflare API Gateway | High |
| Auth proxy | Kong OIDC plugin — validasi token sebelum reach service | High |
| Rate limiting | Per consumer/key, bukan global IP | Medium |
| API versioning | URL-based (`/v1/posts`) + sunset policy | Medium |
| Canary routing | Traffic splitting by percentage | Low |
| Developer portal | Kong Dev Portal / Swagger | Low |
| Request aggregation | Backend-for-Frontend (BFF) pattern | Medium |

### Trigger

- Jumlah service > 3 → butuh gateway
- Auth logic tersebar di banyak tempat → sentralisasi
- Third-party ingin akses API → developer portal

---

## Layer 3: Application Layer

### Target Arsitektur

```
┌──────────────┐  ┌──────────────┐  ┌───────────────┐  ┌─────────────┐
│ Post Service │  │ User Service │  │ Bookmark      │  │ Calendar    │
│ (Node.js)    │  │ (Go)         │  │ Service (Go)  │  │ Service     │
├──────────────┤  ├──────────────┤  ├───────────────┤  │ (Python)    │
│ CRUD posts   │  │ Auth, role   │  │ Bookmarks     │  ├─────────────┤
│ Search/tags  │  │ Profile      │  │ Recommend     │  │ Event dates │
│              │  │              │  │               │  │ iCal export │
└──────┬───────┘  └──────┬───────┘  └───────┬───────┘  └──────┬──────┘
       │                 │                  │                 │
       └─────────────────┴──────────────────┴─────────────────┘
                                │
                         ┌──────▼──────┐
                         │    Kafka    │
                         │  (Events)   │
                         └─────────────┘
```

### Komponen

| Komponen | Teknologi | Prioritas |
|----------|-----------|-----------|
| Microservices | Node.js/TypeScript + Go untuk performance-critical | High |
| Inter-service comms | gRPC (internal) + REST (external via gateway) | Medium |
| Event broker | Kafka / RabbitMQ | High |
| Service mesh | Istio + Envoy | Low |
| GraphQL Federation | Apollo Federation | Low |
| Saga pattern | Distributed transactions via Kafka | Medium |
| Circuit breaker | Opossum (Node.js) / Hystrix | Medium |

### Trigger

- Tim BE > 5 orang → pisah service boundaries
- Satu deploy mempengaruhi fitur lain → isolasi
- Butuh stack berbeda untuk fitur tertentu (Python ML, Go untuk high throughput)
- Lead time deploy > 1 jam → microservices

---

## Layer 4: Caching Layer

### Target Arsitektur

```
┌─────────┐   ┌──────────┐   ┌─────────┐
│  CDN    │   │  Redis   │   │  L1     │
│  Edge   │──►│  Cluster │──►│  In-    │
│  Cache  │   │  (L2)    │   │  Memory │
└─────────┘   └──────────┘   │  (L1)   │
                             └─────────┘
```

### Komponen

| Komponen | Teknologi | Prioritas |
|----------|-----------|-----------|
| In-memory cache | Node.js `lru-cache` / `node-cache` (L1) | Medium |
| Distributed cache | Redis Cluster / ElastiCache (L2) | High |
| CDN | Cloudflare Enterprise + HTML edge caching | High |
| Session store | Redis (ganti dari Supabase Auth localStorage) | Medium |
| Cache warming | Cron job untuk popular posts | Low |
| Cache invalidation | Webhook dari CMS + event-driven | Medium |
| Image cache | Cloudflare Images / Imgix | Medium |

### Strategi Caching

```
Read:
  Request → L1 (in-memory) → L2 (Redis) → CDN (edge) → Origin

Write (admin CRUD):
  Mutation → Update DB → Publish event → Invalidate L1+L2+CDN

TTL Strategy:
  Posts list:     L1=30s, L2=5m, CDN=10m
  Post detail:    L1=1m, L2=10m, CDN=30m
  Calendar data:  L2=15m, CDN=1h
  User/bookmarks: L1=10s, L2=1m (no CDN)
```

### Trigger

- Response time > 200ms → Redis
- Database CPU > 50% karena read → cache
- Traffic spike bikin origin overload → CDN + multi-tier cache

---

## Layer 5: Database Layer

### Target Arsitektur

```
                    ┌──────────────────┐
                    │  Write Primary   │
                    │  (PostgreSQL)    │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
       ┌──────────┐  ┌──────────┐  ┌──────────┐
       │ Replica 1│  │ Replica 2│  │ Replica 3│
       │ (Read)   │  │ (Read)   │  │ (Read)   │
       └──────────┘  └──────────┘  └──────────┘

       ┌──────────┐  ┌──────────┐  ┌──────────┐
       │Elastic   │  │ pgvector │  │Timescale │
       │search    │  │(embed)   │  │(analytics)│
       └──────────┘  └──────────┘  └──────────┘
```

### Komponen

| Komponen | Teknologi | Prioritas |
|----------|-----------|-----------|
| Read replicas | PostgreSQL read replicas (3-5) | High |
| Connection pooling | PgBouncer / RDS Proxy | High |
| Search engine | Meilisearch / Elasticsearch | High |
| Vector search | pgvector / Pinecone | Medium |
| Sharding | Citus (horizontal shard by category/user) | Low |
| Change Data Capture | Debezium + Kafka Connect | Medium |
| CQRS | Write to PG, read from ES/Redis | Medium |
| Data warehouse | Snowflake / BigQuery | Low |
| Backup & PITR | Automated daily + cross-region | High |

### Trigger

- DB CPU > 70% → read replicas
- Response time > 500ms → Elasticsearch
- Full-text search jadi bottleneck → Meilisearch
- Data > 100GB → sharding atau archive strategy

---

## Layer 6: Data Processing Layer

### Target Arsitektur

```
                    ┌──────────┐
   Kafka Events ───►│  Flink   │──► Redis (trending, recommendations)
                    │  Stream  │
                    └──────────┘

                    ┌──────────┐    ┌───────────┐
   Kafka Events ───►│  dbt +   │──►│  Snowflake │──► Metabase/Dashboard
                    │  Airflow │    │  (DWH)     │
                    └──────────┘    └───────────┘
```

### Komponen

| Komponen | Teknologi | Prioritas |
|----------|-----------|-----------|
| Event stream | Kafka / Redpanda | High |
| Stream processing | Apache Flink / Kafka Streams | Medium |
| Batch ETL | Airflow + dbt | Medium |
| Data warehouse | Snowflake / BigQuery | Low |
| ML pipeline | Airflow + Python + model registry | Low |
| Real-time dashboard | Metabase / Grafana | Medium |
| Email/scheduler | Temporal / Quartz + Resend/SendGrid | High |
| Recommendation engine | Collaborative + content-based filtering | Low |

### Event Schema (contoh)

```
PostCreated {
  post_id: UUID
  title: string
  category: string
  tags: string[]
  deadline: date
  created_by: UUID
  created_at: timestamp
}

PostViewed {
  post_id: UUID
  user_id: UUID?
  session_id: string
  timestamp: timestamp
  referrer: string
}

BookmarkAdded {
  user_id: UUID
  post_id: UUID
  timestamp: timestamp
}
```

### Trigger

- Butuh deadline reminder email → scheduler + event stream
- Butuh trending posts → stream processing
- Tim data > 2 orang → Airflow + warehouse
- Butuh rekomendasi personal → ML pipeline

---

## Layer 7: Infrastructure Layer

### Target Arsitektur

```
┌─────────────────────────────────────────────────────────┐
│                      Kubernetes                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ Post     │  │  User    │  │  Kafka   │               │
│  │ Service  │  │  Service │  │  Cluster │               │
│  └──────────┘  └──────────┘  └──────────┘               │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │                 Istio Service Mesh                │    │
│  │  mTLS • Traffic Split • Circuit Breaker • Tracing │    │
│  └──────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
         │                │                │
         ▼                ▼                ▼
    ┌─────────┐     ┌─────────┐      ┌─────────┐
    │  Region │     │  Region │      │  Region │
    │  SG     │     │  JP     │      │  AU     │
    └─────────┘     └─────────┘      └─────────┘
```

### Komponen

| Komponen | Teknologi | Prioritas |
|----------|-----------|-----------|
| Container orchestration | Kubernetes (EKS / GKE) | High |
| CI/CD | GitHub Actions + ArgoCD (GitOps) | High |
| Helm Charts | Infrastructure as Code | High |
| Secret management | HashiCorp Vault / AWS Secrets Manager | High |
| Service mesh | Istio + Envoy | Medium |
| Observability | Grafana + Prometheus + Loki | High |
| Distributed tracing | OpenTelemetry + Jaeger | Medium |
| Log aggregation | Grafana Loki / ELK | High |
| Alerting | PagerDuty / OpsGenie | Medium |
| Multi-region | Active-active (SG + JP + AU) | Low |
| Disaster recovery | RTO < 5m, RPO < 1m | Low |
| Cost management | Kubecost | Low |

### Observability Stack

```yaml
Metrics:    Prometheus → Grafana dashboard
Logs:       Structured JSON → Loki → Grafana Explore
Traces:     OpenTelemetry → Jaeger → trace visualization
Alerts:     Prometheus AlertManager → PagerDuty
Uptime:     Checkly / Better Uptime
SLO:        Error Budget (99.95% availability target)
```

### Trigger

- Lebih dari 1 environment (staging + production) → GitOps
- Deployment manual sering error → ArgoCD
- Butuh scale on-demand → K8s HPA + Cluster Autoscaler
- Multi-region untuk latensi → ketika user tersebar secara geografis

---

## Trigger untuk Scale Up

| Trigger | Tindakan |
|---------|----------|
| DAU > 100k | CDN + Redis + read replicas |
| DAU > 500k | Microservices + Kafka + Elasticsearch |
| DAU > 1M | Multi-region + sharding + data pipeline |
| Tim > 10 eng | MFE + microservices + GitOps |
| SLA > 99.9% | Service mesh + DR + chaos engineering |
| Butuh mobile | React Native + Firebase Cloud Messaging |
| Butuh rekomendasi | ML pipeline + vector DB |
| Ekspansi internasional | i18n + multi-region + CDN global |

---

## Estimasi Biaya & Tim

| Layer | Biaya Tambahan/Bulan | Tambahan Tim |
|-------|---------------------|--------------|
| 1. Client | $1k–3k | 2–3 FE |
| 2. API Gateway | $500–5k | 1 infra |
| 3. Application | $5k–15k | 5–8 BE |
| 4. Caching | $2k–5k | 1 infra |
| 5. Database | $5k–10k | 2 DBRE |
| 6. Data Processing | $3k–8k | 3 data eng |
| 7. Infrastructure | $5k–10k | 2–3 SRE |
| **Total** | **$23k–56k/bulan** | **~20–25 orang** |

---

## Next Step Realistis

Bukan 7-layer penuh, tapi **4-layer yang diperkuat** untuk growth phase berikutnya:

### Fase 1: Perkuat Foundation (sekarang — 3 bulan)
- ✅ Cloudflare API Gateway — auth terpusat, rate limiting per-key
- ✅ Meilisearch — ganti SQL `ilike` untuk search cepat
- ✅ read replicas — pisah read/write di database
- ✅ PgBouncer — connection pooling

### Fase 2: Pipeline & Observability (3–6 bulan)
- ✅ Kafka / RabbitMQ — event bus untuk decoupling
- ✅ Scheduler service — deadline reminder email
- ✅ Structured logging + Loki + Grafana
- ✅ Email service (Resend / SendGrid)

### Fase 3: Scale (6–12 bulan)
- ✅ Pisah Post Service + User Service
- ✅ Redis cluster
- ✅ PWA + notifikasi push
- ✅ Mobile app

### Fase 4: Enterprise (12+ bulan)
- ✅ Microservices penuh + Istio
- ✅ Multi-region
- ✅ Data pipeline + ML
- ✅ GitOps + chaos engineering
