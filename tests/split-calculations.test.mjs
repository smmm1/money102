import test from "node:test";
import assert from "node:assert/strict";
import { calculateSplit } from "../src/daytogether-calculations.mjs";
const people = [{id:"a",name:"A",isMe:true},{id:"b",name:"B",isMe:false},{id:"c",name:"C",isMe:false}];
test("1000 baht divided among three keeps total correct", () => {
 const result=calculateSplit([{id:"x",title:"meal",amountSatang:100000,payerId:"a",participantIds:["a","b","c"]}],people);
 assert.equal(Object.values(result.balances).reduce((a,b)=>a+b,0),0);
 assert.equal(result.transfers.reduce((a,t)=>a+t.amountSatang,0),66666);
});
test("rounding remainder is assigned deterministically", () => {
 const result=calculateSplit([{id:"x",title:"meal",amountSatang:10001,payerId:"a",participantIds:["a","b","c"]}],people);
 assert.deepEqual(result.balances,{a:3334,b:-3334,c:-3333});
});
test("only assigned participants share an expense", () => {
 const result=calculateSplit([{id:"x",title:"drink",amountSatang:9000,payerId:"a",participantIds:["a","c"]}],people);
 assert.equal(result.balances.b,0);
 assert.equal(Object.values(result.balances).reduce((a,b)=>a+b,0),0);
});
test("partial settlement reduces remaining balance", () => {
 const expense=[{id:"x",title:"meal",amountSatang:30000,payerId:"a",participantIds:["a","b","c"]}];
 const result=calculateSplit(expense,people,[{id:"s",fromId:"b",toId:"a",amountSatang:5000,date:"2026-01-01",note:"partial"}]);
 assert.equal(result.transfers.find(t=>t.fromId==="b"&&t.toId==="a").amountSatang,5000);
 assert.equal(Object.values(result.balances).reduce((a,b)=>a+b,0),0);
});
