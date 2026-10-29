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
 assert.deepEqual({...result.balances},{a:6667,b:-3334,c:-3333});
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
test("duplicate participant IDs do not double-count shares", () => {
 const result=calculateSplit([{id:"x",amountSatang:10000,payerId:"a",participantIds:["a","b","b","unknown"]}],people);
 assert.deepEqual({...result.balances},{a:5000,b:-5000,c:0});
});
test("invalid amounts and self-settlements are ignored safely", () => {
 const result=calculateSplit([
  {id:"bad",amountSatang:-100,payerId:"a",participantIds:["a","b"]},
  {id:"unsafe",amountSatang:Number.MAX_SAFE_INTEGER+1,payerId:"a",participantIds:["a","b"]}
 ],people,[{fromId:"a",toId:"a",amountSatang:5000},{fromId:"b",toId:"a",amountSatang:0}]);
 assert.deepEqual({...result.balances},{a:0,b:0,c:0});
 assert.deepEqual(result.transfers,[]);
});
test("all expense and settlement balances remain conserved", () => {
 const result=calculateSplit([
  {id:"x",amountSatang:10001,payerId:"a",participantIds:["a","b","c"]},
  {id:"y",amountSatang:5555,payerId:"c",participantIds:["b","c"]}
 ],people,[{fromId:"b",toId:"a",amountSatang:1000}]);
 assert.equal(Object.values(result.balances).reduce((a,b)=>a+b,0),0);
 assert.equal(result.transfers.reduce((sum,item)=>sum+item.amountSatang,0),Object.values(result.balances).filter(n=>n<0).reduce((sum,n)=>sum-n,0));
});

test("fixed allocations conserve the exact expense amount", () => {
 const result=calculateSplit([{id:"x",amountSatang:10000,payerId:"a",participantIds:["a","b","c"],allocationMode:"fixed",allocations:{a:1000,b:2500,c:6500}}],people);
 assert.deepEqual({...result.balances},{a:9000,b:-2500,c:-6500});
 assert.equal(Object.values(result.balances).reduce((sum,n)=>sum+n,0),0);
});
test("percentage allocations use basis points and distribute rounding deterministically", () => {
 const result=calculateSplit([{id:"x",amountSatang:10001,payerId:"a",participantIds:["a","b","c"],allocationMode:"percentage",allocations:{a:3334,b:3333,c:3333}}],people);
 assert.deepEqual({...result.balances},{a:6666,b:-3333,c:-3333});
 assert.equal(Object.values(result.balances).reduce((sum,n)=>sum+n,0),0);
});
test("invalid fixed or percentage allocations are ignored rather than creating money", () => {
 const result=calculateSplit([
  {id:"fixed",amountSatang:10000,payerId:"a",participantIds:["a","b"],allocationMode:"fixed",allocations:{a:1000,b:1000}},
  {id:"percentage",amountSatang:10000,payerId:"a",participantIds:["a","b"],allocationMode:"percentage",allocations:{a:4000,b:4000}}
 ],people);
 assert.deepEqual({...result.balances},{a:0,b:0,c:0});
});
