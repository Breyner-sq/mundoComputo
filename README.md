# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/7363e82c-b2b6-420f-8575-858eb1b18c25

# MundoComputo

Aplicación de gestión para microempresas. Incluye módulos para ventas, gestión de usuarios y control de inventario.

Principales módulos

- Ventas: registrar ventas, generar facturas y enviar notificaciones.
- Usuarios: gestión de cuentas y roles.
- Inventario: productos, lotes y control de stock.

Clonar el repositorio

```sh
git clone https://github.com/Breyner-sq/mundoComputo.git
cd mundoComputo
```

Instalar y ejecutar en desarrollo

Node (recomendado):

```sh
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

Notas importantes

- La aplicación usa Supabase para autenticación y funciones server-side. Antes de ejecutar algunas funcionalidades (envío de correos, funciones), configura las variables de entorno de Supabase en tu entorno local o en el panel de Supabase.
- Si vas a ejecutar las funciones Deno localmente, asegúrate de tener Deno instalado y de exportar las variables necesarias (p. ej. `RESEND_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).

Estructura básica

- `src/`: código cliente React
- `supabase/functions/`: funciones server-side (Deno) para envíos y utilidades
- `supabase/migrations/`: migraciones SQL

Si necesitas instrucciones avanzadas (despliegue, migraciones automáticas o variables de entorno específicas), dime qué plataforma usas y lo detallo.
