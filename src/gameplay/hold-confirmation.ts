export class HoldConfirmation {
 private started:number|null=null;
 private completed=false;
 press(now:number){if(!this.completed&&this.started===null)this.started=now;}
 cancel(){this.started=null;}
 progress(now:number){return this.started===null?0:Math.min(1,Math.max(0,(now-this.started)/800));}
 take(now:number){if(this.completed||this.progress(now)<1)return false;this.completed=true;this.started=null;return true;}
}
