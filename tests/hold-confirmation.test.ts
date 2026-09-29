import {it,expect} from 'vitest';
import {HoldConfirmation} from '../src/gameplay/hold-confirmation';

it('requires an uninterrupted 800ms hold and commits only once',()=>{
 const hold=new HoldConfirmation();expect(hold.take(1000)).toBe(false);
 hold.press(1000);expect(hold.progress(1400)).toBe(.5);expect(hold.take(1799)).toBe(false);
 hold.press(1500);expect(hold.take(1800)).toBe(true);
 expect(hold.take(3000)).toBe(false);hold.press(4000);expect(hold.take(5000)).toBe(false);
});

it('discards partial holds on release, blur or panel cancellation',()=>{
 const hold=new HoldConfirmation();hold.press(0);hold.cancel();expect(hold.take(900)).toBe(false);
 expect(hold.progress(900)).toBe(0);hold.press(1000);expect(hold.take(1700)).toBe(false);expect(hold.take(1800)).toBe(true);
});
