import {expect,it} from 'vitest';
import {enterTheme,saveEntryTheme} from '../src/app/entry-theme';
it('rotates visits, preserves manual choices and allows automatic rotation again',()=>{
 let value:string|null=null;const storage={getItem:()=>value,setItem:(_:string,v:string)=>{value=v;}};
 expect([enterTheme(storage).theme,enterTheme(storage).theme,enterTheme(storage).theme,enterTheme(storage).theme]).toEqual(['a','b','c','a']);
 saveEntryTheme(storage,{mode:'manual',theme:'c'});expect(enterTheme(storage).theme).toBe('c');expect(enterTheme(storage).theme).toBe('c');
 saveEntryTheme(storage,{mode:'auto',theme:'c'});expect(enterTheme(storage).theme).toBe('a');
 value=null;expect(enterTheme(storage,'b')).toEqual({mode:'manual',theme:'b'});
});
it('does not block entry when browser preference storage is unavailable',()=>{
 const storage={getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');}};
 expect(enterTheme(storage).theme).toBe('a');expect(saveEntryTheme(storage,{mode:'manual',theme:'b'})).toBe(false);
});
