import {wrapConstruct} from '../lib/draft';
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


describe.only('Wrap constructor ', function() {
  it('JSON instance', function() {
    const WrappedMonster = wrapConstruct(Monster);
    expect(JSON.stringify(new WrappedMonster(1))).toEqual(JSON.stringify(new Monster(1)));
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
});
