# Tasks: {{changeName}}

<!-- Agrupa tareas por fase lógica. Cada tarea define agente, alcance y comando verify -->

## 1. Persistencia y Modelos
- [ ] 1.1 Definir entidades y esquema de datos  [agent: data] [files: {{dataFilesScope}}]
      verify: {{dataVerifyCommand}}

## 2. Lógica de Negocio y Servicios
- [ ] 2.1 Implementar servicios y controladores  [agent: backend] [files: {{backendFilesScope}}]
      verify: {{backendVerifyCommand}}

## 3. Interfaz y Experiencia de Usuario
- [ ] 3.1 Integrar vistas y componentes  [agent: frontend] [files: {{frontendFilesScope}}]
      verify: {{frontendVerifyCommand}}

## 4. Pruebas y Aseguramiento
- [ ] 4.1 Implementar pruebas de aceptación y regresión  [agent: testing] [files: {{testingFilesScope}}]
      verify: {{testingVerifyCommand}}
