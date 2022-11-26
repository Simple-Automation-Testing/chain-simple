# chain-simple

![npm downloads](https://img.shields.io/npm/dm/chain-simple.svg?style=flat-square)

The purpose of this library is - build simple and flexible chainable call of the object` methods

```ts
import { makePropertiesChainable } from 'chain-simple';
import type { TChainable } from 'chain-simple';

const obj = {
  async method1() {
    return Promise.resolve(1).then(value => {
      console.log('method1', value);
      return value;
    });
  },
  async method2() {
    return Promise.resolve(2).then(value => {
      console.log('method2', value);
      return value;
    });
  },
  async method3() {
    return Promise.resolve(3).then(value => {
      console.log('method3', value);
      return value;
    });
  },
};

const chainableObj: TChainable<typeof obj> = makePropertiesChainable(obj);

chainableObj
  .method1()
  .method3()
  .then(val => console.log(val)); // method1 1 \n method3 3 \n 3
```

```js
const { makePropertiesChainable } = require('chain-simple');

const obj = {
  async method1() {
    return Promise.resolve(1).then(value => {
      console.log('method1', value);
      return value;
    });
  },
  async method2() {
    return Promise.resolve(2).then(value => {
      console.log('method2', value);
      return value;
    });
  },
  async method3() {
    return Promise.resolve(3).then(value => {
      console.log('method3', value);
      return value;
    });
  },
};

const chainableObj: TChainable<typeof obj> = makePropertiesChainable(obj);

chainableObj
  .method1()
  .method3()
  .then(val => console.log(val)); // method1 1 \n method3 3 \n 3
```
