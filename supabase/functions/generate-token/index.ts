import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { create, Header, Payload } from "https://deno.land/x/djwt@v3.0.2/mod.ts"
const LIVEKIT_URL = Deno.env.get("LIVEKIT_URL")!
const API_KEY = Deno.env.get("LIVEKIT_API_KEY")!
const API_SECRET = Deno.env.get("LIVEKIT_API_SECRET")!
async function createAccessToken(identity:string, roomName:string){ const header:Header={alg:"HS256",typ:"JWT"}; const now=Math.floor(Date.now()/1000); const payload:Payload & Record<string,unknown>={ iss:API_KEY, exp:now+3600, sub:identity, nbf:now, jti:crypto.randomUUID(), video:{room:roomName, roomJoin:true, canPublish:true, canSubscribe:true} }; const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(API_SECRET), {name:"HMAC", hash:"SHA-256"}, false, ["sign"]); return await create(header, payload, key) }
serve(async(req)=>{ if(req.method!=="POST") return new Response("Method Not Allowed", {status:405}); try{ const { roomName, identity } = await req.json(); if(!roomName || !identity) return new Response("roomName e identity são obrigatórios", {status:400}); const token = await createAccessToken(identity, roomName); return Response.json({ token, url: LIVEKIT_URL }) }catch(e){ return new Response("Erro: "+(e?.message ?? String(e)), {status:500}) } })
