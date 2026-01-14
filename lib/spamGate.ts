export function spamGate(e){
 if(e.headers['auto-submitted']) return true
 if(e.headers['list-unsubscribe']) return true
 if(/no-?reply|mailer-daemon/i.test(e.from)) return true
 if(e.body.trim().length < 20) return true
 return false
}
