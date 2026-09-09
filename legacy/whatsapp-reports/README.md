# IMA WEB3 · Plataforma de Reportes de Influencers

Plataforma web para registrar las publicaciones que hacen los influencers
(link, nombre, red social, etc.) y **actualizar sus métricas automáticamente**.
Todo se guarda en una **master sheet de Google Drive** que funciona como fuente
única de verdad para los reportes del equipo.

## ¿Qué hace?

- Cualquier persona del equipo abre la página web y agrega una publicación:
  cliente, influencer, red social, usuario/canal y el link del post.
- Al agregarla (y cada vez que se abre o se refresca la página) la plataforma
  **analiza cada link y trae las métricas más recientes**.
- Los datos se escriben en la **master sheet** de tu Google Drive, así que el
  reporte siempre está actualizado y todos ven lo mismo.

## Soporte de métricas por red social

| Red social | Métricas automáticas | Detalle |
|------------|----------------------|---------|
| **Telegram** | ✅ Sí (gratis) | Lee vistas y reacciones del post y suscriptores del canal desde la vista pública. Solo funciona con **canales públicos**. |
| **WhatsApp** | ❌ No es posible | WhatsApp **no expone métricas públicas** (no hay contador de vistas/reacciones accesible desde fuera). Estas filas se guardan, pero las métricas se cargan **manualmente** en la master sheet. |

> Nota: para canales de Telegram privados no hay métricas públicas; tendrías que
> usarlas de forma manual o con un bot agregado al canal (no incluido).

## Master sheet

Ya existe una hoja creada para esto en tu Drive:

- **Nombre:** `IMA WEB3 - Master Sheet de Reportes`
- **ID:** `11O5jSSMTzYrA4kW3Q1Fkfgo5w24uolvhiJ8ZPcS--ws`

Columnas: ID, Fecha registro, Cliente, Influencer, Red social, Usuario/Canal,
Link del post, Tipo de contenido, Vistas, Reacciones, Suscriptores/Miembros,
Última actualización, Notas.

## Puesta en marcha

### 1. Instalar dependencias

```bash
npm install
```

### 2. Conectar tu Google Sheet (cuenta de servicio)

La app escribe en la master sheet con una **cuenta de servicio** de Google:

1. Entra a <https://console.cloud.google.com> y crea (o elige) un proyecto.
2. Activa la **Google Sheets API**.
3. Crea una **Service Account** y genera una **clave JSON**.
4. Abre la master sheet en Drive → botón **Compartir** → comparte con el email
   de la cuenta de servicio (algo como `...@...iam.gserviceaccount.com`) con
   permiso de **Editor**.

### 3. Variables de entorno

Copia `.env.example` a `.env.local` y llena los valores:

```bash
cp .env.example .env.local
```

```env
GOOGLE_SHEET_ID=11O5jSSMTzYrA4kW3Q1Fkfgo5w24uolvhiJ8ZPcS--ws
GOOGLE_SHEET_TAB=Sheet1
GOOGLE_SERVICE_ACCOUNT_EMAIL=tu-cuenta@tu-proyecto.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

> El nombre de la pestaña (`GOOGLE_SHEET_TAB`) suele ser `Sheet1` o `Hoja 1`.
> Revísalo en la parte de abajo de tu hoja.

### 4. Correr en local

```bash
npm run dev
```

Abre <http://localhost:3000>.

### 5. Desplegar (recomendado: Vercel)

```bash
# importa el repo en https://vercel.com y carga las mismas variables de entorno
```

> Importante: las métricas en vivo de Telegram requieren acceso a internet
> abierto. En este entorno de desarrollo sandbox la red de salida está
> bloqueada, por eso el fetch real solo funciona ya desplegado (Vercel) o en
> una máquina con internet.

## Cómo funciona por dentro

- `lib/metrics.ts` — analiza cada link. Para Telegram lee la página pública
  embebida (`t.me/canal/id?embed=1`) y extrae vistas, reacciones y suscriptores.
- `lib/sheets.ts` — lee y escribe la master sheet con la API de Google Sheets.
- `app/api/entries` — `GET` lista las filas, `POST` agrega una nueva (y trae sus
  métricas al instante).
- `app/api/refresh` — re-analiza **todos** los links y reescribe la sheet con los
  números frescos (con concurrencia limitada).
- `app/page.tsx` — la interfaz: formulario, tabla y totales. Refresca métricas
  automáticamente al cargar.

## Ideas para siguientes versiones

- Gráficas de evolución de métricas en el tiempo (historial por post).
- Agregar Instagram / TikTok / X vía un servicio de scraping de pago.
- Refresco programado (cron) para actualizar sin abrir la página.
- Filtros por cliente / influencer y exportación del reporte.
