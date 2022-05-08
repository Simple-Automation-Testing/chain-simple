# chain-simple


![npm downloads](https://img.shields.io/npm/dm/chain-simple.svg?style=flat-square)

The purpose of this library is - build simple and flexible chainable call of the object` methods

```js
const {wrapObj} = require('chain-simple');

const yourObjectWithMethods = {
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

const wrappedObj = wrapObj(yourObjectWithMethods);

testExample();
async function testExample() {
  const result = await wrappedObj.method1().method2().method3().method1();

  console.log(result);
}
```