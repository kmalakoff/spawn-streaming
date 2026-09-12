# spawn-streaming

Runs a child process while streaming output, optionally adding a colored prefix to each line.

```bash
npm install spawn-streaming
```

```typescript
import spawn from 'spawn-streaming'

await spawn('npm', ['test'], { stdio: 'inherit' }, { prefix: 'bob' });

```

Use `{ stdio: 'inherit' }` to display output as it arrives. Omit it and set `encoding: 'utf8'` to collect string output in the resolved result. `stdio: 'inherit'` and `encoding` cannot be used together. The optional streaming setting is `prefix`.
