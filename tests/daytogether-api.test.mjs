import test from "node:test";
import assert from "node:assert/strict";
import worker from "../workers/daytogether-api.js";

function fakeDb() {
  const users = new Map();
  const sessions = new Map();
  const snapshots = new Map();
  const db = {
    prepare(sql) {
      let params = [];
      return {
        bind(...values) { params = values; return this; },
        async first() {
          if (sql.includes("SELECT id FROM app_users WHERE email")) {
            const user = [...users.values()].find(item => item.email === params[0]);
            return user ? { id: user.id } : null;
          }
          if (sql.includes("SELECT u.id,u.email FROM app_sessions")) {
            const session = sessions.get(params[0]);
            if (!session || session.expires_at <= params[1]) return null;
            const user = users.get(session.user_id);
            return user ? { id: user.id, email: user.email } : null;
          }
          if (sql.includes("SELECT payload,updated_at FROM user_app_data")) {
            const row = snapshots.get(params[0]);
            return row ? { payload: row.payload, updated_at: row.updated_at } : null;
          }
          return null;
        },
        async run() {
          if (sql.startsWith("INSERT INTO app_users")) {
            const [id,email,password_salt,password_hash,created_at] = params;
            if ([...users.values()].some(user => user.email === email)) throw new Error("duplicate");
            users.set(id,{id,email,password_salt,password_hash,created_at});
          } else if (sql.startsWith("INSERT INTO app_sessions")) {
            const [token_hash,user_id,expires_at,created_at] = params;
            sessions.set(token_hash,{token_hash,user_id,expires_at,created_at});
          } else if (sql.startsWith("INSERT INTO user_app_data")) {
            const [user_id,bucket,payload,updated_at,expected] = params;
            const current=snapshots.get(user_id);
            if (expected !== undefined && current?.updated_at !== expected) return {meta:{changes:0}};
            snapshots.set(user_id,{bucket,payload,updated_at});
            return {meta:{changes:1}};
          } else if (sql.startsWith("DELETE FROM app_sessions WHERE token_hash")) {
            sessions.delete(params[0]);
          } else if (sql.startsWith("DELETE FROM app_sessions WHERE user_id")) {
            for(const [key,value] of sessions) if(value.user_id===params[0]) sessions.delete(key);
          } else if (sql.startsWith("DELETE FROM user_app_data WHERE user_id")) {
            snapshots.delete(params[0]);
          } else if (sql.startsWith("DELETE FROM app_users WHERE id")) {
            users.delete(params[0]);
          }
          return {meta:{changes:1}};
        }
      };
    },
    async batch(statements) { for (const statement of statements) await statement.run(); }
  };
  return db;
}

const stateSnapshot = () => ({
  "lamoon-daytogether-v1": JSON.stringify({
    goals:[],savings:[],health:[],notes:[],bills:[],visits:[],
    settings:{displayName:"",timezone:"Asia/Bangkok",theme:"system",hidden:false,cards:[],healthKinds:[],waterGoal:2000,heightCm:null}
  })
});
async function request(path, method="GET", body, token="") {
  return worker.fetch(new Request("https://api.example.test"+path,{
    method,
    headers:{...(body?{"Content-Type":"application/json"}:{}),...(token?{Authorization:"Bearer "+token}:{})},
    body:body?JSON.stringify(body):undefined
  }),{DB:database,APP_ORIGIN:"https://daytogether-phase1-preview.onrender.com"});
}
let database;
test("signup validates credentials, hashes passwords and creates an authenticated session", async()=>{
  database=fakeDb();
  const invalid=await request("/api/auth/signup","POST",{email:"not-an-email",password:"short"});
  assert.equal(invalid.status,400);
  const response=await request("/api/auth/signup","POST",{email:"Test@Example.com",password:"long-password-123"});
  assert.equal(response.status,201);
  const body=await response.json();
  assert.equal(body.user.email,"test@example.com");
  assert.ok(body.token.length>=40);
  const me=await request("/api/auth/me","GET",undefined,body.token);
  assert.equal(me.status,200);
  assert.equal((await me.json()).user.id,body.user.id);
});

test("D1 state snapshots are isolated by the authenticated user, never a client user id",async()=>{
  database=fakeDb();
  const signupA=await (await request("/api/auth/signup","POST",{email:"a@example.com",password:"password-A-123"})).json();
  const signupB=await (await request("/api/auth/signup","POST",{email:"b@example.com",password:"password-B-123"})).json();
  const saved=await request("/api/state","PUT",{payload:stateSnapshot(),expected_updated_at:null,user_id:signupB.user.id},signupA.token);
  assert.equal(saved.status,200);
  const readA=await request("/api/state","GET",undefined,signupA.token);
  assert.ok((await readA.json()).payload["lamoon-daytogether-v1"]);
  const readB=await request("/api/state","GET",undefined,signupB.token);
  assert.equal((await readB.json()).payload,null);
});

test("state API rejects unauthenticated writes and invalid payloads",async()=>{
  database=fakeDb();
  const unauthenticated=await request("/api/state","PUT",{payload:stateSnapshot()});
  assert.equal(unauthenticated.status,401);
  const signup=await (await request("/api/auth/signup","POST",{email:"c@example.com",password:"password-C-123"})).json();
  const invalid=await request("/api/state","PUT",{payload:{"lamoon-daytogether-v1":"not-json"}},signup.token);
  assert.equal(invalid.status,400);
});
