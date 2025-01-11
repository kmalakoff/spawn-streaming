## spawn-streaming

Formats spawn with prefix, colors, and throttle

```
import spawn from 'spawn-streaming'

await spawn('npm', ['test'], { stdio: 'inherit' }, { prefix: 'bob', throttle: 3000 });

```
