# Vassoo - Multi-Vendor Marketplace

Plataforma de comercio electrónico multi-vendedor con gestión de entregas, construida con Next.js 15, Supabase y Stripe.

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js 15)                    │
├─────────────┬─────────────┬─────────────┬─────────────────────────┤
│  Storefront │  Dashboard  │  Driver PWA │   Platform Admin      │
│  (Público)  │  (Tiendas)  │  (Repartos) │   (Super Admin)       │
└─────────────┴─────────────┴─────────────┴─────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Supabase (Backend)                         │
├─────────────────┬───────────────┬───────────────────────────────┤
│   PostgreSQL    │   Auth        │   Realtime                    │
│   + PostGIS     │   (JWT)       │   (Subscriptions)             │
└─────────────────┴───────────────┴───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Servicios Externos                           │
├─────────────────┬───────────────┬───────────────────────────────┤
│   Stripe        │   Google Maps │   Resend                      │
│   (Pagos)       │   (Ubicación) │   (Email)                     │
└─────────────────┴───────────────┴───────────────────────────────┘
```

## 🚀 Características

### Storefront (Tienda Pública)
- Catálogo de productos con categorías y búsqueda
- Búsqueda inteligente con voz e imagen
- Carrito de compras y checkout
- Checkout como invitado
- Seguimiento de pedidos en tiempo real
- Cuentas de usuario e historial

### Dashboard de Tiendas
- Gestión de tienda y branding
- Gestión de productos e inventario
- Procesamiento de pedidos
- Analíticas y reportes
- Stripe Connect para pagos a vendedores
- Gestión de personal con roles

### Dashboard de Empresas de Reparto
- Gestión de conductores
- Tracking GPS en tiempo real con PostGIS
- Configuración de zonas de entrega
- Mapa en vivo de conductores
- Despacho y seguimiento de pedidos

### Driver PWA (App de Conductores)
- App web progresiva optimizada para móvil
- Tracking de ubicación GPS
- Aceptación de pedidos y actualizaciones de estado
- Integración con navegación
- Soporte offline
- Notificaciones push

### Platform Admin
- Configuración multi-tenant
- Gestión de ajustes de plataforma
- Supervisión de usuarios y vendedores
- Configuración de pagos (Stripe)
- CMS para páginas dinámicas

## 📋 Requisitos

- Node.js 18+ (recomendado: 20+)
- pnpm (recomendado) o npm
- Cuenta de Supabase
- Cuenta de Stripe
- Cuenta de Google Cloud (Maps API)
- Cuenta de Resend (opcional, para emails)

## 🛠️ Configuración de Desarrollo

### 1. Clonar e Instalar Dependencias

```bash
git clone <repository-url>
cd frontend
pnpm install
```

### 2. Variables de Entorno

Crea un archivo `.env.local` en el directorio raíz:

```bash
# ============================================
# SUPABASE (Requerido)
# Obtener de: Supabase Dashboard > Project Settings > API
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Server-side only (NUNCA exponer al cliente)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================
# ENCRIPTACIÓN (Requerido)
# Genera con: openssl rand -hex 32
# ============================================
SETTINGS_ENCRYPTION_KEY=your-64-character-hex-key

# ============================================
# GOOGLE MAPS (Requerido para mapas)
# Obtener Map ID de: Google Cloud Console > Google Maps Platform > Map Management
# ============================================
NEXT_PUBLIC_GOOGLE_MAP_ID=your-map-id

# ============================================
# APLICACIÓN
# ============================================
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Vassoo
```

> **⚠️ Nota importante sobre API Keys:**
> - **Stripe Keys** (publishable y secret): Se configuran desde el **Panel de Administración** (`/dashboard/admin/settings`) y se almacenan encriptadas en la base de datos.
> - **Google Maps API Key**: Se configura desde el **Panel de Administración** y se almacena en `platform_settings`.
> - **Resend API Key**: Se configura desde el **Panel de Administración**.
>
> Esto permite cambiar las keys sin redesplegar la aplicación.

### 3. Configuración de Base de Datos

El proyecto usa Supabase con PostgreSQL + PostGIS. Las migraciones están en `supabase/migrations/`.

```bash
# Instalar Supabase CLI
brew install supabase/tap/supabase

# Vincular a tu proyecto
supabase link --project-ref your-project-ref

# Ejecutar migraciones
supabase db push

# (Opcional) Seed inicial
pnpm db:seed
```

### 4. Iniciar Servidor de Desarrollo

```bash
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📁 Estructura del Proyecto

```
frontend/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Páginas de autenticación
│   ├── (pages)/           # Páginas CMS públicas
│   ├── account/           # Páginas de cuenta de usuario
│   ├── api/               # API routes
│   ├── cart/              # Carrito de compras
│   ├── checkout/          # Flujo de checkout
│   ├── dashboard/         # Dashboards multi-tenant
│   │   ├── admin/         # Admin de plataforma
│   │   ├── delivery/      # Empresa de reparto
│   │   └── store/         # Tienda vendedor
│   ├── driver/            # Driver PWA
│   └── store/             # Páginas públicas de tienda
├── components/            # Componentes React
│   ├── dashboard/         # Específicos de dashboard
│   ├── notifications/     # Sistema de notificaciones
│   ├── platform/          # Componentes de plataforma
│   └── ui/                # Componentes shadcn/ui
├── contexts/              # Contexts de React
├── hooks/                 # Custom hooks
├── lib/                   # Utilidades y servicios
│   ├── services/          # Servicios de lógica de negocio
│   ├── stripe/            # Integración Stripe
│   ├── supabase/          # Clientes Supabase
│   └── utils/             # Funciones helper
├── supabase/              # Configuración Supabase
│   └── migrations/        # Migraciones de BD
├── types/                 # Tipos TypeScript
└── public/                # Assets estáticos
```

## 🔧 Configuración de Servicios Externos

### Configuración desde Panel de Administración

La mayoría de las API keys se configuran desde `/dashboard/admin/settings` y se almacenan encriptadas en la base de datos:

| Servicio | Configuración | Descripción |
|----------|---------------|-------------|
| **Stripe** | Panel Admin → Payments | Publishable Key, Secret Key |
| **Google Maps** | Panel Admin → Location | API Key para mapas y lugares |
| **Resend** | Panel Admin → Email | API Key para envío de emails |

### Stripe

1. **Crear cuenta en [stripe.com](https://stripe.com)**

2. **Habilitar Stripe Connect** (para pagos a vendedores):
   - Dashboard → Connect → Get started
   - Configurar tipos de cuenta (Express recomendado)

3. **Configurar Webhooks**:
   - Dashboard → Developers → Webhooks
   - Añadir endpoint: `https://tu-dominio.com/api/stripe/webhook`
   - Eventos requeridos:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `account.updated` (para Connect)

4. **Añadir keys en Panel Admin**:
   - Ir a `/dashboard/admin/settings`
   - Sección "Payments"
   - Ingresar Publishable Key y Secret Key

### Google Maps

1. **Crear proyecto en [console.cloud.google.com](https://console.cloud.google.com)**

2. **Habilitar APIs**:
   - Maps JavaScript API
   - Places API
   - Geocoding API

3. **Crear API Key**:
   - APIs & Services → Credentials → Create Credentials
   - Restringir key a tu dominio

4. **Crear Map ID** (requerido para marcadores avanzados):
   - Google Maps Platform → Map Management → Create Map ID
   - Añadir el Map ID a `.env.local` como `NEXT_PUBLIC_GOOGLE_MAP_ID`

5. **Añadir API Key en Panel Admin**:
   - Ir a `/dashboard/admin/settings`
   - Sección "Location"

### Resend (Email)

1. **Crear cuenta en [resend.com](https://resend.com)**
2. **Verificar dominio**
3. **Obtener API Key**: Dashboard → API Keys
4. **Añadir en Panel Admin**: Settings → Email

## 🚢 Despliegue a Producción

### Vercel

1. **Conectar Repositorio**
   ```bash
   vercel link
   ```

2. **Variables de Entorno en Vercel**
   
   Ir a Vercel Dashboard → Settings → Environment Variables:
   
   | Variable | Descripción |
   |----------|-------------|
   | `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima de Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (server-side) |
   | `SETTINGS_ENCRYPTION_KEY` | Clave de encriptación (64 chars hex) |
   | `NEXT_PUBLIC_GOOGLE_MAP_ID` | ID del mapa de Google |
   | `NEXT_PUBLIC_APP_URL` | URL de producción |
   | `NEXT_PUBLIC_APP_NAME` | Nombre de la app |

   > **Nota**: Las keys de Stripe, Google Maps API y Resend se configuran desde el Panel de Administración después del primer despliegue.

3. **Desplegar**
   ```bash
   vercel --prod
   ```

### Post-Despliegue

1. **Ejecutar migraciones** en Supabase producción
2. **Crear usuario admin** inicial
3. **Configurar API keys** desde Panel Admin:
   - Stripe (modo live)
   - Google Maps
   - Resend
4. **Configurar webhook de Stripe** apuntando al dominio de producción

## 📱 Driver PWA

La app de conductores es una Progressive Web App instalable en dispositivos móviles.

### Características
- Instalable como app nativa
- Tracking GPS en segundo plano
- Notificaciones de nuevos pedidos
- Funciona offline

### Instalación
1. Abrir `/driver` en Chrome móvil
2. Iniciar sesión como conductor
3. Usar "Añadir a pantalla de inicio"

## 🧪 Scripts Disponibles

```bash
pnpm dev          # Iniciar servidor de desarrollo
pnpm build        # Build para producción
pnpm start        # Iniciar servidor de producción
pnpm lint         # Ejecutar ESLint
pnpm db:seed      # Seed de datos de prueba
```

## 🔒 Consideraciones de Seguridad

- **Nunca exponer** `SUPABASE_SERVICE_ROLE_KEY` al cliente
- Usar políticas **Row Level Security (RLS)** en Supabase
- **Restringir API keys** a dominios específicos
- Implementar **rate limiting** en endpoints sensibles
- Usar **HTTPS** en producción
- **Rotar API keys** periódicamente
- Las keys sensibles se almacenan **encriptadas** en la BD

## 📄 Licencia

Privado - Todos los derechos reservados