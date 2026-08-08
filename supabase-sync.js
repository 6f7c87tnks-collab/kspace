/* K' Space 云端同步层（Supabase，零外部依赖，使用 fetch 直连 REST/Auth API）
 * 数据策略：本地优先（localStorage 为源），云端作为后台镜像。
 * 读取始终走本地（瞬时、离线可用）；写入后异步推送；登录时拉取云端覆盖本地。
 * 配置与登录态存于独立 localStorage 键，避免与业务数据耦合。
 */
const Cloud=(function(){
  const LS_CFG='kspace_cloud', LS_SESS='kspace_session';
  const TABLES=['weight','food','exercise','period','todo','journal','supp','med','steps','girth','bust'];

  function cfg(){try{return JSON.parse(localStorage.getItem(LS_CFG)||'null')}catch(e){return null}}
  function sess(){try{return JSON.parse(localStorage.getItem(LS_SESS)||'null')}catch(e){return null}}
  function setSess(s){ if(s)localStorage.setItem(LS_SESS,JSON.stringify(s)); else localStorage.removeItem(LS_SESS); }
  function on(){ return !!(cfg()&&sess()); }
  function user(){ const s=sess(); return s&&s.user?{id:s.user.id,email:s.user.email}:null; }
  function tok(){ const s=sess(); return s?s.access_token:null; }
  function base(){ return (cfg().url||'').replace(/\/$/,''); }
  function rest(t){ return base()+'/rest/v1/'+t; }
  function auth(p){ return base()+'/auth/v1/'+p; }
  function headers(extra){
    const c=cfg(); if(!c)return extra||{};
    return Object.assign({'apikey':c.anonKey,'Authorization':'Bearer '+(tok()||c.anonKey),'Content-Type':'application/json'},extra||{});
  }

  /* ---------- 配置 ---------- */
  function saveCfg(url,anonKey){ localStorage.setItem(LS_CFG,JSON.stringify({url:url.trim(),anonKey:anonKey.trim()})); }
  function clearCfg(){ localStorage.removeItem(LS_CFG); localStorage.removeItem(LS_SESS); }

  /* ---------- 认证 ---------- */
  async function signUp(email,password){
    const r=await fetch(auth('signup'),{method:'POST',headers:{'apikey':cfg().anonKey,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    const j=await r.json(); if(!r.ok)throw new Error(j.message||j.msg||'注册失败');
    if(!j.access_token||!j.user){ throw new Error('注册已提交，但邮箱需要验证：请去邮箱点激活链接，再回来登录（或在 Supabase 后台关掉 Confirm email）'); }
    setSess({access_token:j.access_token,refresh_token:j.refresh_token,user:j.user});
    return j;
  }
  async function resetPwd(email){
    const r=await fetch(auth('recover'),{method:'POST',headers:{'apikey':cfg().anonKey,'Content-Type':'application/json'},body:JSON.stringify({email})});
    const j=await r.json(); if(!r.ok)throw new Error(j.message||j.msg||'发送失败');
    return j;
  }
  async function signIn(email,password){
    const r=await fetch(auth('token?grant_type=password'),{method:'POST',headers:{'apikey':cfg().anonKey,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    const j=await r.json(); if(!r.ok)throw new Error(j.message||j.msg||'登录失败');
    setSess({access_token:j.access_token,refresh_token:j.refresh_token,user:j.user});
    return j;
  }
  async function signOut(){ try{ await fetch(auth('logout'),{method:'POST',headers:headers()}); }catch(e){} setSess(null); }
  async function refresh(){
    const s=sess(); if(!s||!s.refresh_token)return false;
    const r=await fetch(auth('token?grant_type=refresh_token'),{method:'POST',headers:{'apikey':cfg().anonKey,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:s.refresh_token})});
    const j=await r.json(); if(!r.ok)return false;
    setSess({access_token:j.access_token,refresh_token:j.refresh_token,user:j.user});
    return true;
  }

  /* ---------- 写入（后台推送，best-effort） ---------- */
  async function pushAdd(t,obj){
    const u=user(); if(!u)return;
    const row={id:String(obj.id),user_id:u.id,data:obj,created_at:obj.createdAt||new Date().toISOString()};
    const r=await fetch(rest(t),{method:'POST',headers:headers({'Prefer':'resolution=merge-duplicates'}),body:JSON.stringify(row)});
    if(!r.ok)throw new Error('推送到 '+t+' 失败: '+(await r.text()).slice(0,80));
  }
  async function pushSave(t,arr){
    const u=user(); if(!u)return;
    const rows=arr.map(o=>({id:String(o.id),user_id:u.id,data:o,created_at:o.createdAt||new Date().toISOString()}));
    const r=await fetch(rest(t),{method:'POST',headers:headers({'Prefer':'resolution=merge-duplicates'}),body:JSON.stringify(rows)});
    if(!r.ok)throw new Error('全量同步 '+t+' 失败: '+(await r.text()).slice(0,80));
  }
  async function pushDel(t,id){
    const r=await fetch(rest(t)+'?id=eq.'+encodeURIComponent(String(id)),{method:'DELETE',headers:headers()});
    if(!r.ok)throw new Error('删除同步失败: '+(await r.text()).slice(0,80));
  }
  async function pushSettings(obj){
    const u=user(); if(!u)return;
    const r=await fetch(rest('settings'),{method:'POST',headers:headers({'Prefer':'resolution=merge-duplicates'}),body:JSON.stringify({user_id:u.id,data:obj,updated_at:new Date().toISOString()})});
    if(!r.ok)throw new Error('设置同步失败: '+(await r.text()).slice(0,80));
  }
  function bg(fn){ fn().catch(e=>{ console.warn('[cloud]',e); if(typeof toast==='function'){const t=document.getElementById('toast'); if(t){const msg=(e&&e.message)?e.message:String(e); t.textContent='云端同步失败：'+msg.slice(0,120); t.classList.add('show'); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('show'),3000);} } }); }

  /* ---------- 拉取（登录后覆盖本地） ---------- */
  async function pull(){
    const u=user(); if(!u)return;
    for(const t of TABLES){
      const r=await fetch(rest(t)+'?select=*&user_id=eq.'+encodeURIComponent(u.id),{headers:headers()});
      if(!r.ok){
        if(r.status===401)throw new Error('登录已过期，请到「设置与备份」退出云端后重新登录');
        throw new Error('拉取 '+t+' 失败: '+(await r.text()).slice(0,80));
      }
      const rows=await r.json();
      localStorage.setItem('kspace_'+t,JSON.stringify(rows.map(x=>x.data)));
    }
    const rs=await fetch(rest('settings')+'?select=*&user_id=eq.'+encodeURIComponent(u.id),{headers:headers()});
    if(rs.ok){ const sr=await rs.json(); if(sr.length)localStorage.setItem('kspace_settings',JSON.stringify(sr[0].data)); }
  }

  return {cfg,on,user,saveCfg,clearCfg,signUp,signIn,signOut,refresh,resetPwd,pushAdd,pushSave,pushDel,pushSettings,pull,bg};
})();
