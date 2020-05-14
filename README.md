# qiankun-overrides

forked from [joeldenning/import-map-overrides](https://github.com/joeldenning/import-map-overrides)

import-map-overrides for [Qiankun](https://qiankun.umijs.org/)

## Usage

```js
import { registerMicroApps } from 'qiankun'

const imo = window.importMapOverrides
const microApps = [{
  name: 'v1',
  entry: 'http://localhost:8081',
  container: '#container',
  activeRule: () => location.pathname.startsWith('v1'),
}, {
  name: 'v2',
  entry: 'http://localhost:8082',
  container: '#container',
  activeRule: () => location.pathname.startsWith('v2'),
}]

imo.setDefaultMap(microApps)
registerMicroApps(Object.values(imo.getCurrentQiankunMap()))
```