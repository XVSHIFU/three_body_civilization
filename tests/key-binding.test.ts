import {describe,it,expect} from 'vitest';
import {bindingCode} from '../src/ui/key-binding';

const letter={code:'KeyW',repeat:false,isComposing:false,keyCode:87,ctrlKey:false,metaKey:false,altKey:false,shiftKey:false};
describe('intentional key rebinding',()=>{
 it('accepts a plain physical letter key',()=>expect(bindingCode(letter)).toBe('KeyW'));
 it('leaves bindings unchanged during IME composition, including legacy composition events',()=>{
  expect(bindingCode({...letter,isComposing:true})).toBeNull();
  expect(bindingCode({...letter,keyCode:229})).toBeNull();
 });
 it('preserves shortcuts, held keys and keyboard navigation',()=>{
  for(const flag of ['repeat','ctrlKey','metaKey','altKey','shiftKey'])expect(bindingCode({...letter,[flag]:true})).toBeNull();
  for(const code of ['Tab','Escape','ShiftLeft','Enter','ArrowRight','Digit1'])expect(bindingCode({...letter,code})).toBeNull();
 });
});
