# PasoSeguro

Prototipo funcional de validación de credenciales para INACAP sede Chillán (Innovación y Emprendimiento III).

- **Estudiante:** muestra un QR que cambia cada 30 segundos (TOTP, RFC 6238).
- **Guardia:** escanea el QR y ve foto, nombre y vigencia; rechaza códigos vencidos o repetidos.
- **Registro:** cada validación queda anotada con su tiempo y se puede exportar a CSV.

Los estudiantes de ejemplo son ficticios. Las fotos de los participantes se guardan solo en el celular del guardia.

## Versiones

| Versión | Cambios |
|---|---|
| v1 | Versión inicial para el ciclo de testeo 1 |
