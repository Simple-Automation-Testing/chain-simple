import {wrapConstruct} from '../lib';
import {expect} from 'assertior';

const firstNoop = (arg?) =>
  new Promise((res) => {
    const success = {body: {test: true}, status: 200};
    const error = {body: {test: false}, status: 404};
    const result = arg ? success : error;
    setTimeout(() => {
      res(result);
    }, 150);
  });

const secondNoop = (arg?) =>
  new Promise((res) => {
    const success = {body: {test: 'yes'}, status: 201};
    const error = {body: {test: 'no'}, status: 401};
    const result = arg ? success : error;
    setTimeout(() => {
      res(result);
    }, 150);
  });

class Monster1 {
  disposition;
  constructor(disposition) {
    this.disposition = disposition;
  }
  get testGetter() {
    return this.disposition;
  }
  async test1() {
    return firstNoop();
  }
  async test2() {
    return secondNoop();
  }
  syncTest1() {
    return {a: 22};
  }
  syncTest2() {
    return {x: 33};
  }
}

class Monster extends Monster1 {
  constructor(item) {
    super(item);
  }
}


describe('Wrap constructor ', function() {
  it('JSON instance', function() {
    const WrappedMonster = wrapConstruct(Monster);
    expect(JSON.stringify(new WrappedMonster(1))).toEqual(JSON.stringify(new Monster(1)));
  });

  it('caller to string', function() {
    const WrappedMonster = wrapConstruct(Monster);
    const item = new WrappedMonster(1);
    expect(item.toString()).toEqual((new Monster(1)).toString());
  });

  it('JSON sync caller', function() {
    const WrappedMonster = wrapConstruct(Monster);
    expect(JSON.stringify(new WrappedMonster(1).syncTest1())).toEqual(JSON.stringify(new Monster(1).syncTest1()));
  });

  it('JSON async caller', function() {
    const WrappedMonster = wrapConstruct(Monster);
    expect(JSON.stringify(new WrappedMonster(1).test1())).toEqual(JSON.stringify(new Monster(1).test1()));
  });

  it('sync one call', function() {
    const WrappedMonster = wrapConstruct(Monster);
    const item = new WrappedMonster(1);
    expect(item.syncTest1()).toDeepEqual({a: 22});
  });

  it('sync chain call', function() {
    const WrappedMonster = wrapConstruct(Monster);
    const item = new WrappedMonster(1);
    expect(item.syncTest1().syncTest2()).toDeepEqual({x: 33});
  });

  it('sync and async call', async function() {
    const WrappedMonster = wrapConstruct(Monster);
    const item = new WrappedMonster(1);
    expect(await item.syncTest1().test1()).toDeepEqual({body: {test: false}, status: 404});
  });

  it('async and sync call', async function() {
    const WrappedMonster = wrapConstruct(Monster);
    const item = new WrappedMonster(1);
    expect(await item.test1().syncTest1()).toDeepEqual({a: 22});
  });

  it('async and async call', async function() {
    const WrappedMonster = wrapConstruct(Monster);
    const item = new WrappedMonster(1);
    expect(await item.test1().test2()).toDeepEqual({body: {test: 'no'}, status: 401});
  });

  it('async sync async call', async function() {
    const WrappedMonster = wrapConstruct(Monster);
    const item = new WrappedMonster(1);
    expect(await item.test1().syncTest1().test2()).toDeepEqual({body: {test: 'no'}, status: 401});
  });

  it('async async sync call', async function() {
    const WrappedMonster = wrapConstruct(Monster);
    const item = new WrappedMonster(1);
    expect(await item.test1().test2().syncTest1()).toDeepEqual({a: 22});
  });

  it('async async double sync call', async function() {
    const WrappedMonster = wrapConstruct(Monster);
    const item = new WrappedMonster(1);
    expect(await item.test1().test2().syncTest1().syncTest2()).toDeepEqual({x: 33});
  });

  it('not exists', function() {
    const WrappedMonster = wrapConstruct(Monster);
    const item = new WrappedMonster(1);
    expect(item.not_existing_prop).toEqual(undefined);
  });

  it('getter', function() {
    const WrappedMonster = wrapConstruct(Monster);
    const item = new WrappedMonster(1);
    expect(item.testGetter).toEqual(1);
  });
});
