# Tasks: {{changeName}}

<!-- Group tasks by logical phases. Each task declares agent, file scope, and verify command -->

## 1. Persistence & Data Modeling
- [ ] 1.1 Define entities and database schema  [agent: data] [files: {{dataFilesScope}}]
      verify: {{dataVerifyCommand}}

## 2. Business Logic & Services
- [ ] 2.1 Implement core services and controllers  [agent: backend] [files: {{backendFilesScope}}]
      verify: {{backendVerifyCommand}}

## 3. User Interface & Integration
- [ ] 3.1 Integrate frontend views and components  [agent: frontend] [files: {{frontendFilesScope}}]
      verify: {{frontendVerifyCommand}}

## 4. Testing & Verification
- [ ] 4.1 Implement acceptance and regression test suites  [agent: testing] [files: {{testingFilesScope}}]
      verify: {{testingVerifyCommand}}
