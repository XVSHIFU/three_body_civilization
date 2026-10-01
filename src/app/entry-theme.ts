export type EntryTheme='a'|'b'|'c';
export const ENTRY_THEME_KEY='three-body-civilization:entry-theme:v1';
const themes:EntryTheme[]=['a','b','c'];
type Preference={mode:'auto'|'manual';theme:EntryTheme};
export function enterTheme(storage:Pick<Storage,'getItem'|'setItem'>,legacy?:EntryTheme):Preference {
 let saved:Preference|undefined;
 try{const value=JSON.parse(storage.getItem(ENTRY_THEME_KEY)??'null');if(value&&['auto','manual'].includes(value.mode)&&themes.includes(value.theme))saved=value;}catch{/* Unavailable preferences do not block the game. */}
 const selected:Preference=saved?.mode==='manual'?saved:saved?{mode:'auto',theme:themes[(themes.indexOf(saved.theme)+1)%3]}:legacy?{mode:'manual',theme:legacy}:{mode:'auto',theme:'a'};
 saveEntryTheme(storage,selected);return selected;
}
export function saveEntryTheme(storage:Pick<Storage,'setItem'>,preference:Preference){try{storage.setItem(ENTRY_THEME_KEY,JSON.stringify(preference));return true;}catch{return false;}}
