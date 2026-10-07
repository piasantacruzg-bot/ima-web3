# Cómo publicar Brief&Co. en Netlify

Guía paso a paso para subir la web de Brief&Co. a Netlify desde GitHub.
Toma unos 15 minutos la primera vez. Después, cada cambio que se suba a
GitHub se publica solo.

---

## Antes de empezar

Necesitas:

- Una cuenta en [netlify.com](https://www.netlify.com) (la gratuita alcanza).
  Lo más fácil es crearla con "Sign up with GitHub".
- Acceso al repositorio `piasantacruzg-bot/ima-web3` en GitHub.

**Ojo con la rama.** Ahora mismo la web está en la rama
`claude/new-session-9n1uee`. Lo ideal es unirla a `main` primero (con un pull
request en GitHub) y publicar desde `main`. Si quieres probar antes, también
puedes elegir esa rama directamente en el paso 2.

---

## 1. Lo que ya está configurado

En la raíz del repositorio hay un archivo `netlify.toml` que le dice a Netlify:

| Ajuste | Valor | Qué significa |
|---|---|---|
| Base directory | `brief-and-co` | La web está en esa carpeta, no en la raíz |
| Build command | `npm run build` | Cómo se arma el sitio |
| Publish directory | `.next` | Dónde queda el resultado |
| Node | 20 | Versión de Node que usa |

No tienes que escribir nada de esto a mano. Netlify lo lee del archivo.

El repo también tiene la app de reportes de IMA WEB3 en la raíz. Esa app no se
toca: Netlify solo construye la carpeta `brief-and-co`.

---

## 2. Conectar el repositorio

1. Entra a Netlify y haz clic en **Add new site → Import an existing project**.
2. Elige **GitHub** y autoriza a Netlify si te lo pide.
3. Busca y selecciona `ima-web3`.
   - Si no aparece, haz clic en **Configure the Netlify app on GitHub** y dale
     acceso a ese repositorio.
4. En **Branch to deploy**, elige `main` (o `claude/new-session-9n1uee` si
   todavía no la uniste).
5. Revisa que los campos se hayan llenado solos con los valores de la tabla de
   arriba. Si **Base directory** aparece vacío, escribe `brief-and-co`.
6. **No hagas clic en Deploy todavía.** Primero configura el formulario (paso 3).

---

## 3. Configurar el formulario de contacto

El formulario de la página de Contacto envía cada brief a un servicio externo.
Sin esto, la web funciona igual, pero el formulario muestra un mensaje de error
al enviar (a propósito, para no decirle a nadie que su brief llegó cuando no fue
así).

La opción más simple es **Formspree** (gratis hasta 50 envíos al mes):

1. Crea una cuenta en [formspree.io](https://formspree.io).
2. Haz clic en **New form**, ponle un nombre (por ejemplo "Brief&Co. web") y
   elige el email donde quieres recibir los briefs.
3. Copia la URL que te da. Se ve así: `https://formspree.io/f/abcd1234`.
4. En Netlify, dentro de la pantalla de configuración del sitio, abre
   **Environment variables → Add a variable** y agrega:

   | Key | Value |
   |---|---|
   | `CONTACT_WEBHOOK_URL` | `https://formspree.io/f/abcd1234` (la tuya) |

Si ya pasaste al paso 4, puedes agregarla después en
**Site configuration → Environment variables**. Importante: después de agregar o
cambiar una variable hay que volver a publicar (**Deploys → Trigger deploy →
Deploy site**) para que tome efecto.

Cualquier otro servicio que reciba datos por POST en JSON funciona igual (Make,
Zapier, etc.).

---

## 4. Publicar

1. Haz clic en **Deploy**.
2. La primera publicación tarda entre 2 y 4 minutos. Puedes ver el avance en
   **Deploys**.
3. Cuando diga **Published**, Netlify te da una dirección del tipo
   `https://nombre-al-azar.netlify.app`.
4. Puedes cambiar ese nombre en **Site configuration → Change site name**
   (por ejemplo `briefandco.netlify.app`).

### Revisión rápida después de publicar

- [ ] La dirección principal abre la web en inglés (o en español, si tu
      navegador está en español).
- [ ] El botón **EN / ES** cambia el idioma y te deja en la misma página.
- [ ] Work, Services, Studio y Contact abren bien.
- [ ] Las dos páginas de proyecto abren (Capital Nocturno y ETMC Mexico).
- [ ] En el celular aparece el botón **Menu** y abre el menú completo.
- [ ] Envía un brief de prueba desde Contacto y revisa que llegue a tu email.

---

## 5. Dominio propio (opcional)

1. En Netlify, abre **Domain management → Add a domain** y escribe tu dominio
   (por ejemplo `briefandco.com`).
2. Netlify te va a mostrar qué registros DNS agregar. Hazlo en el lugar donde
   compraste el dominio (GoDaddy, Namecheap, Punto.pe, etc.). También puedes
   pasarle la gestión del DNS a Netlify, que es lo más simple.
3. El certificado HTTPS se activa solo. Puede tardar hasta un par de horas.
4. Cuando el dominio funcione, actualiza el campo `url` en
   `brief-and-co/content/site.ts` con tu dominio real y sube el cambio. Eso
   corrige los enlaces que usan Google y las redes sociales.

---

## 6. Cómo actualizar la web después

Cada vez que se sube un cambio a la rama conectada en GitHub, Netlify publica
la nueva versión solo, en un par de minutos. No hay que hacer nada en Netlify.

Si abres un pull request, Netlify crea una **Deploy Preview**: una versión de
prueba con su propia dirección, para revisar los cambios antes de publicarlos.

Dónde se edita cada cosa está en `brief-and-co/README.md`. Lo más común:

- Textos en inglés y español: `content/dictionary.ts`
- Proyectos: `content/projects.ts`
- Instagram, LinkedIn y email: `content/site.ts`
- Fotos: dentro de `public/assets/...`

---

## Si algo falla

**El build falla con "Cannot find module 'tailwindcss'"**
Netlify está construyendo la raíz del repo en vez de la carpeta de la web.
Revisa que **Base directory** sea `brief-and-co` en
**Site configuration → Build & deploy → Build settings**.

**El build falla por la versión de Node**
Revisa que exista la variable `NODE_VERSION = 20` (ya viene en `netlify.toml`).
Si en el panel de Netlify hay otra versión puesta a mano, bórrala.

**El formulario dice "No pudimos enviar el brief" / "We couldn't send the brief"**
Falta `CONTACT_WEBHOOK_URL`, está mal escrita, o la agregaste y no volviste a
publicar. Revisa el paso 3. Si el error sigue, en **Logs → Functions** vas a
ver el motivo exacto.

**La web abre pero sale "Page not found"**
Prueba entrar directo a `/en`. Si eso funciona y la raíz no, avísame: es un tema
de la redirección de idioma.

**Los cambios no aparecen**
Mira en **Deploys** si la última publicación terminó bien. Si falló, el error
está en el log de esa publicación. Si salió bien, recarga la página con
Ctrl + Shift + R (Cmd + Shift + R en Mac).
