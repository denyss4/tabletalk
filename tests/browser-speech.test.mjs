import test from 'node:test';
import assert from 'node:assert/strict';
import {listenForSpeech} from '../lib/browser-speech.ts';
function setup(){
 const completed=[],errors=[],previews=[];
 const engine={lang:'',continuous:false,interimResults:false,onresult:null,onend:null,onerror:null,start(){},stop(){this.onend?.();},abort(){this.onend?.();}};
 const session=listenForSpeech(engine,{onPreview:text=>previews.push(text),onComplete:text=>completed.push(text),onError:text=>errors.push(text)});
 return {engine,session,completed,errors,previews};
}
const result=(text,isFinal=true)=>({0:{transcript:text},isFinal});
test('revised and repeated speech events submit final words exactly once',()=>{
 const s=setup();s.engine.onresult({results:[result('Sam had',false)]});
 s.engine.onresult({results:[result('Sam had the second coffee.')]});
 s.engine.onresult({results:[result('Sam had the second coffee.')]});
 s.session.stop();s.engine.onend();assert.deepEqual(s.completed,['Sam had the second coffee.']);assert.deepEqual(s.errors,[]);
});
test('interim words never become an allocation command',()=>{
 const s=setup();s.engine.onresult({results:[result('Sam',false)]});s.session.stop();assert.deepEqual(s.completed,[]);assert.equal(s.errors.length,1);
});
test('cancelled recording cannot submit late results',()=>{
 const s=setup();const late=s.engine.onend;s.engine.onresult({results:[result('Sam had coffee.')]});s.session.abort();late();assert.deepEqual(s.completed,[]);
});
test('permission or connection error cannot submit a partial command',()=>{
 const s=setup();s.engine.onresult({results:[result('Sam had coffee.')]});s.engine.onerror({error:'not-allowed'});s.engine.onend();assert.deepEqual(s.completed,[]);assert.match(s.errors[0],/Allow microphone/);
});
