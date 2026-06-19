# Configuration de Seguridad - WikiStars 5

## 1. Invariantes de Datos (Data Invariants)
- **Alumnos**:
  - Todo alumno registrado debe tener un `name` válido de no más de 100 caracteres.
  - El promedio de estrellas (`starsPopularity`, `starsCharisma`, `starsTalent`) debe ser un número decimal entre `0` y `5`.
  - El id del instituto (`instituteId`) debe coincidir con uno de los tres planteles oficiales ('1', '2', '3').
- **Comentarios**:
  - Un comentario debe referenciar a un alumno válido existente (`alumnoId`).
  - El campo `likes` inicial es cero o mayor, y el estado debe limitarse a los valores permitidos (`anonymous`, `student`, `verified`).

## 2. Los payloads prohibidos ("The Dirty Dozen" Payloads)
Intentos de vulnerar el modelo de datos e inyectar atributos nocivos que la base de datos debe rechazar:
1. **Inyección de Ator Escrito**: Un comentario con un campo `likes` inflado artificialmente a `9999`.
2. **Promedio Corrupto**: Calificar un alumno mandando un promedio de estrellas de `9.9` (fuera del límite 0-5).
3. **Escalada de Privilegios**: Crear o actualizar un perfil con el campo `isVerified: true` sin poseer rango de Administrador.
4. **Referencia Huérfana**: Intentar crear un comentario con un `alumnoId` que no cumple con el formato estándar o con una longitud maliciosa.
5. **Ataque de Denegación de Billetera (DoW)**: Enviar alias (`nickname`) de más de 500 KB para agotar recursos.
6. **Modificación de campos inmutables**: Intentar cambiar el `createdAt` original de un testimonio grabado.
7. **Identidad Suplantada**: Firmar un comentario como un `author` falsificado diferente a la sesión activa (cuando no es anónimo).
8. **Spam de Comentarios Gigantes**: Enviar un texto de testimonio de más de 10,000 caracteres.
9. **Falsificación de Vistas**: Auto-incrementar el contador de visualizaciones (`views`) de un alumno a un valor negativo o arbitrariamente grande de golpe.
10. **Grado Inexistente**: Intentar nominar una estrella con una categoría que no sea una de las permitidas ('Artista', 'Deportista', 'Académico', 'Influencer', 'Gaming', 'Líder').
11. **Modificar Calificaciones de Terceros**: Intentar reescribir por completo la biografía de otro alumno de forma maliciosa.
12. **Inyección de Estructuras No Admitidas**: Agregar de manera oportunista colecciones ocultas en el árbol para bypass de almacenamiento.
