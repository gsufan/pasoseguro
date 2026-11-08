# PasoSeguro

Prototipo funcional de validación de credenciales para INACAP sede Chillán (Innovación y Emprendimiento III).

**Abrir el prototipo:** https://gsufan.github.io/pasoseguro/

- **Estudiante:** muestra un QR que cambia cada 30 segundos (TOTP, RFC 6238).
- **Guardia:** escanea el QR y ve foto, nombre y vigencia; rechaza códigos vencidos o repetidos.
- **Registro:** cada validación queda anotada con su tiempo y se puede exportar a CSV.

Los estudiantes de ejemplo son ficticios. Las fotos de los participantes se guardan solo en el celular del guardia.

## Estructura

| Archivo | Contenido |
|---|---|
| `index.html` | Página y orden de carga de los scripts |
| `css/styles.css` | Estilos (modo claro y oscuro) |
| `js/core.js` | Configuración, almacenamiento, estudiantes de ejemplo y utilidades |
| `js/totp.js` | Generación y verificación de códigos (TOTP) |
| `js/qr.js` | Dibujo del QR y lectura con cámara o foto |
| `js/student.js` | Pantallas del estudiante |
| `js/guard.js` | Pantallas del guardia |
| `js/app.js` | Inicio y navegación |
| `js/vendor/` | Librerías qrcode-generator (MIT) y jsQR (Apache 2.0) |
| `version.json` | Número de build; la app lo consulta para saber si hay una versión nueva |
| `tools/bump.py` | Actualiza el número de build en todos los archivos |

## Publicar un cambio

GitHub Pages permite que el navegador guarde los archivos hasta 10 minutos. Para que los celulares tomen el cambio de inmediato, antes de cada commit se sube el número de build:

```
python3 tools/bump.py 1.1.4
```

Al abrir la app, si `version.json` trae un build distinto, se recarga sola; si ya estaba abierta, muestra un aviso para actualizar.

## Versiones

| Versión | Cambios |
|---|---|
| v1 | Versión inicial para el ciclo de testeo 1 |
| v1.1 | Código separado en archivos. Corrige que el resultado no cambiaba al validar a otra persona. El resultado aparece sobre la cámara, que sigue escaneando. Cronómetro opcional para medir el tiempo de ingreso. Librerías incluidas en el repositorio. |
