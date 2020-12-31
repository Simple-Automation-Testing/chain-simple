import {expect} from 'assertior';
import {getExtendedController} from './setup';
import {chain} from '../lib';

describe.only('Second', function() {
  it('async', async function() {
    // SET UP
    let wasCalled = 0;
    function assertStatus(value, data) {
      expect(value).toEqual(data.status);
      wasCalled++;
      return data;
    }
    const Controller = getExtendedController();
    chain().addChain(assertStatus).wrapConstruct(Controller);
    const constroller = new Controller();
    // TEST
    const result = await constroller
      .method1(1)
      .assertStatus(200);
    expect(result.body).toDeepEqual({test: true});
    expect(wasCalled).toEqual(1);
  });

  it('sync', function() {
    // SET UP
    let wasCalled = 0;
    function assertStatus(value, data) {
      expect(value).toEqual(data.status);
      wasCalled++;
      return data;
    }
    const Controller = getExtendedController();
    chain().addChain(assertStatus).wrapConstruct(Controller);
    const constroller = new Controller();
    // TEST
    const result = constroller
      .syncMethod1(1)
      .assertStatus(200)
      .syncMethod2()
      .assertStatus(401);
    expect(result.body).toDeepEqual({test: false});
    expect(wasCalled).toEqual(2);
  });

  it.only('mixed', async function() {
    let wasCalled = 0;
    function assertStatus(value, data) {
      expect(value).toEqual(data.status);
      wasCalled++;
      return data;
    }
    const Controller = getExtendedController();
    const WrappedController = (chain().addChain(assertStatus).wrapConstruct(Controller) as any);
    // TEST
    const result = await new WrappedController()
      .syncMethod1(1)
      .assertStatus(200)
      .syncMethod2()
      .assertStatus(401)
      .method1(1)
      .assertStatus(200);

    expect(result.body).toDeepEqual({test: true});
    expect(wasCalled).toEqual(3);
  });

  it('void', async function() {
    let wasCalled = 0;
    function assertStatus(value, data) {
      expect(value).toEqual(data.status);
      wasCalled++;
      return data;
    }
    const Controller = getExtendedController();
    chain().addChain(assertStatus).wrapConstruct(Controller);
    const constroller = new Controller();
    await (constroller
      .voidMethod1() as any)
      .voidMethod2();
  });
});
