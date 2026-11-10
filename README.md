# PasoSeguro

Prototipo funcional de validación de credenciales para INACAP sede Chillán (Innovación y Emprendimiento III).

**Abrir el prototipo:** https://gsufan.github.io/pasoseguro/

- **Estudiante:** muestra un QR que cambia cada 30 segundos (TOTP, RFC 6238).
- **Guardia:** escanea el QR, ve foto, nombre y vigencia, y confirma si la foto coincide con la persona. Rechaza códigos vencidos o ya usados.
- **Registro:** cada validación queda anotada y se puede exportar a CSV.

## Cómo probarlo en 3 minutos

1. Activa la **hora automática** en los dos celulares (el código depende del reloj).
2. Abre el enlace en ambos. En uno elige **Soy guardia** y acepta el permiso de cámara.
3. En el otro elige **Soy estudiante → Modo demostración → Camila Rojas** (estudiante de ejemplo). Sube el brillo de la pantalla.
4. Apunta la cámara del guardia al QR: aparece **Ingreso permitido** con la foto. Toca **Dejar pasar** o **La foto no coincide**.
5. Toma un pantallazo del QR, espera 1 minuto y escanéalo: aparece **Código vencido (posible pantallazo)**.
6. En **Registro** está cada validación; **Descargar CSV** la exporta.

### Con participantes reales

- En **Estudiantes**, registra a cada participante como **P1, P2…** (no con su nombre) y tómale una foto. El participante apunta la **cámara de su celular** al QR de vinculación y abre el enlace: su credencial queda lista.
- Para medir el tiempo de ingreso, toca **Iniciar tiempo** cuando la persona llega; se detiene solo con el resultado.
- Al terminar el día: descarga el CSV, guárdalo y luego toca **Borrar estudiantes registrados y sus fotos**. El registro se mantiene hasta que lo borres aparte.

## Alcance y limitaciones

Es un prototipo para probar la experiencia con usuarios, no un sistema listo para producción.

| En el prototipo | En un sistema real |
|---|---|
| Las claves de los estudiantes de ejemplo están en el código | Cada clave se genera al activar la credencial y la guarda un servidor de INACAP |
| El celular del guardia verifica los códigos y recuerda los ya usados | El servidor verifica y comparte los códigos usados entre todos los accesos |
| Fotos y estudiantes de prueba se guardan solo en el celular del guardia | La foto se toma una vez y se almacena cifrada |
| La vigencia se simula en **Estudiantes → Administración** | La vigencia la entrega la matrícula; el guardia no la puede cambiar |
| Sin conexión con la matrícula | La vigencia se consulta en la base de matrícula |
| Aplicación web aparte | Función dentro de la app institucional actual |

Los estudiantes de ejemplo son ficticios.

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
| `js/app.js` | Inicio, navegación y aviso de versión nueva |
| `js/vendor/` | Librerías qrcode-generator (MIT) y jsQR (Apache 2.0) |
| `version.json` | Número de build; la app lo consulta para saber si hay una versión nueva |
| `tools/bump.py` | Actualiza el número de build en todos los archivos |

## Publicar un cambio

GitHub Pages permite que el navegador guarde los archivos hasta 10 minutos. Para que los celulares tomen el cambio de inmediato, antes de cada commit se sube el número de build:

```
python3 tools/bump.py 1.1.5
```

Al abrir la app, si `version.json` trae un build distinto, se recarga sola; si ya estaba abierta, muestra un aviso para actualizar.

## Versiones

| Versión | Cambios |
|---|---|
| v1 | Versión inicial para el ciclo de testeo 1 |
| v1.1 | Código separado en archivos. Corrige que el resultado no cambiaba al validar a otra persona. El resultado aparece sobre la cámara, que sigue escaneando. Cronómetro opcional. Borrar fotos ya no borra el registro. Aviso de versión nueva. Botones para que el guardia confirme si la foto coincide (mide la detección de credenciales prestadas). |
| v2 | Ajustes del ciclo de testeo 1 (8 estudiantes, 09-11-2026). **Solo la credencial propia:** el estudiante ya no ve una lista de credenciales; los ejemplos quedan en un modo demostración (P4: “me deja elegir entre varias credenciales y no me muestra solamente la tuya”). **Vigencia protegida:** el guardia ya no puede marcar una credencial como no vigente con un toque; se movió a una sección de administración con confirmación (P6). **Vinculación con la cámara del celular:** el QR de vinculación es un enlace que se abre con la cámara normal, sin escanear dentro de la app (P1). Se aceptan códigos cortos como P1. |
