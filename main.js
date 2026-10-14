(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });
  const W = 800, H = 520;
  let dpr = 1, last = 0, state = "start", pendingSkill = false;
  const rand = (a,b) => a + Math.random() * (b-a);
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  const realmNames = ["炼气一层","炼气二层","炼气三层","筑基初期","筑基中期","筑基后期","金丹初期","金丹中期","金丹后期","元婴初期"];
  const upgrades = [
    {id:"damage",icon:"⚔️",name:"剑诀精进",desc:"灵剑伤害提升 25%。",apply:p=>p.damage*=1.25},
    {id:"speed",icon:"💨",name:"御风诀",desc:"移动速度提升 15%。",apply:p=>p.speed*=1.15},
    {id:"rate",icon:"✨",name:"双剑合璧",desc:"灵剑攻击间隔缩短 18%。",apply:p=>p.attackRate=Math.max(.22,p.attackRate*.82)},
    {id:"hp",icon:"🍃",name:"生生不息",desc:"恢复 35 点生命，并提升 10 点生命上限。",apply:p=>{p.maxHp+=10;p.hp=Math.min(p.maxHp,p.hp+35)}},
    {id:"range",icon:"🔮",name:"神识扩张",desc:"灵剑索敌范围提升 25%。",apply:p=>p.range*=1.25},
    {id:"orbit",icon:"☯",name:"剑影分光",desc:"额外召唤一道剑影，周期性环绕斩击。",apply:p=>p.orbitals=Math.min(4,p.orbitals+1)},
    {id:"skill",icon:"🌩️",name:"雷法真意",desc:"主动剑气伤害提升 35%，冷却缩短。",apply:p=>{p.skillDamage*=1.35;p.skillCooldown=Math.max(3,p.skillCooldown*.85)}},
    {id:"armor",icon:"🛡️",name:"护体灵光",desc:"受到的碰撞伤害降低 15%。",apply:p=>p.armor=Math.min(.6,p.armor+.15)}
  ];
  let player, game, enemies, gems, particles, slashes;

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(r.width*dpr));
    canvas.height = Math.max(1, Math.floor(r.height*dpr));
    ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
    // Logical canvas stays 800 x 520; rendering scales to screen.
  }
  window.addEventListener("resize", resize);
  function reset() {
    player = {x:W/2,y:H/2,r:10,hp:100,maxHp:100,speed:185,damage:18,attackRate:.78,attackTimer:.25,range:230,level:1,xp:0,xpNext:7,realm:realmNames[0],orbitals:0,skillDamage:42,skillCooldown:7,skillTimer:0,armor:0,invuln:0};
    game = {time:0,kills:0,spawnTimer:0,spawnRate:1.15,shake:0};
    enemies=[];gems=[];particles=[];slashes=[];
    state="playing";GameInput.clear();GameUI.hideAll();GameUI.updateHUD(player,game);
  }
  function spawnEnemy() {
    const side = Math.floor(Math.random()*4); let x,y;
    if(side===0){x=rand(0,W);y=-20}else if(side===1){x=W+20;y=rand(0,H)}else if(side===2){x=rand(0,W);y=H+20}else{x=-20;y=rand(0,H)}
    const t = Math.random();
    const difficulty = 1 + game.time/105;
    let e;
    if(t<.13 && game.time>20) e={kind:"brute",r:15,hp:75*difficulty,maxHp:75*difficulty,speed:34+Math.min(game.time*.06,12),damage:19,exp:3,color:"#bd7181"};
    else if(t<.33) e={kind:"wisp",r:8,hp:18*difficulty,maxHp:18*difficulty,speed:82+Math.min(game.time*.15,20),damage:8,exp:1,color:"#8fd4bb"};
    else e={kind:"beast",r:11,hp:32*difficulty,maxHp:32*difficulty,speed:52+Math.min(game.time*.1,16),damage:12,exp:1,color:"#d9a56b"};
    Object.assign(e,{x,y,hit:0,attackFlash:0});enemies.push(e);
  }
  function particle(x,y,color,count=7,force=90) {
    for(let i=0;i<count;i++){const a=rand(0,Math.PI*2),s=rand(force*.25,force);particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(.2,.55),max:.55,color,size:rand(2,4)})}
  }
  function addGem(x,y,value) { gems.push({x,y,r:4,value,life:22,phase:rand(0,6)}); }
  function hurtEnemy(e,damage) {
    e.hp-=damage;e.hit=.12;particle(e.x,e.y,e.color,4,50);
    if(e.hp<=0){game.kills++;particle(e.x,e.y,"#e9ce86",10,100);addGem(e.x,e.y,e.exp);if(Math.random()<.14)addGem(e.x+rand(-8,8),e.y+rand(-8,8),1);return true}return false;
  }
  function closestEnemy() {
    let best=null,bd=player.range;
    for(const e of enemies){const d=dist(player,e);if(d<bd){bd=d;best=e}}
    return best;
  }
  function autoAttack(dt) {
    player.attackTimer-=dt;
    if(player.attackTimer<=0){
      const target=closestEnemy();
      if(target){player.attackTimer=player.attackRate;slashes.push({x:player.x,y:player.y,tx:target.x,ty:target.y,life:.2,max:.2,kind:"sword"});if(hurtEnemy(target,player.damage))enemies=enemies.filter(e=>e!==target)}
      else player.attackTimer=.08;
    }
    if(player.orbitals>0){
      const orbitHit=new Set();
      for(let i=0;i<player.orbitals;i++){
        const a=game.time*2.3+i*Math.PI*2/player.orbitals;
        const ox=player.x+Math.cos(a)*34,oy=player.y+Math.sin(a)*34;
        for(const e of [...enemies])if(!orbitHit.has(e)&&Math.hypot(e.x-ox,e.y-oy)<e.r+7){orbitHit.add(e);if(hurtEnemy(e,player.damage*.45))enemies=enemies.filter(q=>q!==e)}
      }
    }
  }
  function castSkill() {
    if(player.skillTimer>0){GameUI.toast(`剑气冷却中：${player.skillTimer.toFixed(1)}s`);return}
    player.skillTimer=player.skillCooldown;game.shake=.2;
    slashes.push({x:player.x,y:player.y,life:.55,max:.55,kind:"burst",radius:0});
    for(const e of [...enemies]){
      const d=dist(player,e);
      if(d<155){if(hurtEnemy(e,player.skillDamage*(1-d/240)))enemies=enemies.filter(q=>q!==e)}
    }
    particle(player.x,player.y,"#a7e8e0",28,210);
    GameUI.toast("剑气纵横！");
  }
  function gainXp(value) {
    player.xp+=value;
    if(player.xp>=player.xpNext){
      player.xp-=player.xpNext;player.level++;player.xpNext=Math.ceil(player.xpNext*1.34+2);
      player.realm=realmNames[Math.min(realmNames.length-1,Math.floor((player.level-1)/2))];
      player.hp=Math.min(player.maxHp,player.hp+12);
      state="upgrade";
      const picks=[...upgrades].sort(()=>Math.random()-.5).slice(0,3);
      GameUI.showUpgrades(picks, i=>{picks[i].apply(player);state="playing";GameUI.hideAll();GameUI.toast(`习得：${picks[i].name}`);GameUI.updateHUD(player,game)});
    }
  }
  function update(dt) {
    if(state!=="playing")return;
    game.time+=dt;game.spawnTimer-=dt;
    game.spawnRate=Math.max(.35,1.15-game.time*.006);
    if(game.spawnTimer<=0){spawnEnemy();game.spawnTimer=game.spawnRate;if(game.time>40&&Math.random()<.45)spawnEnemy()}
    const input=GameInput.read();
    player.x=clamp(player.x+input.x*player.speed*dt,18,W-18);
    player.y=clamp(player.y+input.y*player.speed*dt,22,H-18);
    if(input.skill)castSkill();
    player.skillTimer=Math.max(0,player.skillTimer-dt);player.invuln=Math.max(0,player.invuln-dt);
    autoAttack(dt);
    for(const e of enemies){
      const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1;
      e.x+=dx/d*e.speed*dt;e.y+=dy/d*e.speed*dt;
      e.hit=Math.max(0,e.hit-dt);
      if(d<e.r+player.r && player.invuln<=0){
        player.hp-=e.damage*(1-player.armor);player.invuln=.62;game.shake=.12;
        particle(player.x,player.y,"#ff8c8c",7,70);
        if(player.hp<=0){player.hp=0;state="gameover";GameUI.showGameOver(game,player);return}
      }
    }
    for(const g of [...gems]){
      g.life-=dt;g.phase+=dt*4;
      const d=Math.hypot(player.x-g.x,player.y-g.y);
      if(d<105){const dx=player.x-g.x,dy=player.y-g.y,dd=d||1;g.x+=dx/dd*(80+(105-d)*4)*dt;g.y+=dy/dd*(80+(105-d)*4)*dt}
      if(d<player.r+g.r+4){gainXp(g.value);gems=gems.filter(q=>q!==g);if(state!=="playing")return}
      else if(g.life<=0)gems=gems.filter(q=>q!==g);
    }
    for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(.08,dt);p.vy*=Math.pow(.08,dt);p.life-=dt}
    particles=particles.filter(p=>p.life>0);
    for(const s of slashes){s.life-=dt;if(s.kind==="burst")s.radius=(1-s.life/s.max)*160}
    slashes=slashes.filter(s=>s.life>0);
    GameUI.updateHUD(player,game);
  }
  function drawBackground() {
    ctx.fillStyle="#182a2c";ctx.fillRect(0,0,W,H);
    // Subtle pixel-art ground tiles
    const tile=32,ox=-(player.x%tile)*.08,oy=-(player.y%tile)*.08;
    for(let y=-tile;y<H+tile;y+=tile)for(let x=-tile;x<W+tile;x+=tile){
      const gx=Math.floor((x+ox)/tile),gy=Math.floor((y+oy)/tile);
      ctx.fillStyle=((gx+gy)%2===0)?"#1b2e2e":"#1a2b2c";ctx.fillRect(x+ox,y+oy,tile,tile);
      if((gx*13+gy*7)%11===0){ctx.fillStyle="#29403b";ctx.fillRect(x+ox+7,y+oy+8,3,3);ctx.fillRect(x+ox+21,y+oy+23,2,2)}
    }
    // Ambient stones and plants, in a repeating field
    for(let i=0;i<36;i++){
      const x=((i*137+Math.floor(player.x*.13))%W+W)%W,y=((i*83+Math.floor(player.y*.13))%H+H)%H;
      if(i%3===0){ctx.fillStyle="#334b42";ctx.fillRect(x,y,7,4);ctx.fillStyle="#52705a";ctx.fillRect(x+2,y-2,3,3)}
      else{ctx.fillStyle="#263c3c";ctx.fillRect(x,y,4,4)}
    }
    // vignette
    const g=ctx.createRadialGradient(W/2,H/2,100,W/2,H/2,470);g.addColorStop(0,"#00000000");g.addColorStop(1,"#071013a8");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  }
  function drawPlayer() {
    const p=player,blink=p.invuln>0&&Math.floor(game.time*18)%2===0;
    // shadow
    ctx.fillStyle="#07110eb0";ctx.beginPath();ctx.ellipse(p.x,p.y+7,13,6,0,0,Math.PI*2);ctx.fill();
    if(blink)return;
    // pixel robe
    ctx.fillStyle="#d8c28b";ctx.fillRect(p.x-6,p.y-12,12,4);
    ctx.fillStyle="#e7d8b2";ctx.fillRect(p.x-4,p.y-15,8,5);
    ctx.fillStyle="#233e4c";ctx.fillRect(p.x-8,p.y-8,16,14);
    ctx.fillStyle="#3f8e82";ctx.fillRect(p.x-6,p.y-5,12,10);
    ctx.fillStyle="#d9bf7e";ctx.fillRect(p.x-3,p.y+2,6,5);
    ctx.fillStyle="#f4e6c0";ctx.fillRect(p.x-3,p.y-13,2,2);ctx.fillRect(p.x+2,p.y-13,2,2);
    // sword glint
    const target=closestEnemy(),a=target?Math.atan2(target.y-p.y,target.x-p.x):game.time;
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(a);
    ctx.fillStyle="#e8f4e6";ctx.fillRect(8,-2,17,3);ctx.fillStyle="#8de6dc";ctx.fillRect(11,-3,14,1);ctx.fillStyle="#d8bc79";ctx.fillRect(7,-3,3,5);
    ctx.restore();
    for(let i=0;i<p.orbitals;i++){const a=game.time*2.3+i*Math.PI*2/p.orbitals;const x=p.x+Math.cos(a)*34,y=p.y+Math.sin(a)*34;ctx.fillStyle="#b9fff0";ctx.fillRect(x-3,y-3,6,6);ctx.fillStyle="#efffe9";ctx.fillRect(x-1,y-1,2,2)}
  }
  function drawEnemy(e) {
    ctx.fillStyle="#08100eb0";ctx.beginPath();ctx.ellipse(e.x,e.y+5,e.r+3,5,0,0,Math.PI*2);ctx.fill();
    const c=e.hit>0?"#fff3cf":e.color;
    if(e.kind==="wisp"){
      ctx.fillStyle=c;ctx.fillRect(e.x-5,e.y-7,10,13);ctx.fillRect(e.x-8,e.y-3,16,6);ctx.fillStyle="#18312d";ctx.fillRect(e.x-3,e.y-2,2,2);ctx.fillRect(e.x+2,e.y-2,2,2);
    }else if(e.kind==="brute"){
      ctx.fillStyle=c;ctx.fillRect(e.x-12,e.y-12,24,24);ctx.fillRect(e.x-16,e.y-5,5,12);ctx.fillRect(e.x+11,e.y-5,5,12);ctx.fillStyle="#633d4c";ctx.fillRect(e.x-7,e.y-3,4,3);ctx.fillRect(e.x+4,e.y-3,4,3);
    }else{
      ctx.fillStyle=c;ctx.fillRect(e.x-8,e.y-7,16,15);ctx.fillRect(e.x-11,e.y-2,5,8);ctx.fillRect(e.x+6,e.y-2,5,8);ctx.fillStyle="#513c2f";ctx.fillRect(e.x-5,e.y-2,3,3);ctx.fillRect(e.x+2,e.y-2,3,3);ctx.fillStyle="#e7d3a2";ctx.fillRect(e.x-6,e.y-10,3,5);ctx.fillRect(e.x+3,e.y-10,3,5);
    }
    if(e.hp<e.maxHp){ctx.fillStyle="#101817";ctx.fillRect(e.x-e.r,e.y-e.r-7,e.r*2,3);ctx.fillStyle="#ef9d91";ctx.fillRect(e.x-e.r,e.y-e.r-7,e.r*2*clamp(e.hp/e.maxHp,0,1),3)}
  }
  function draw() {
    ctx.save();
    if(game&&game.shake>0){ctx.translate(rand(-3,3),rand(-3,3));game.shake=Math.max(0,game.shake-.015)}
    if(!player){ctx.fillStyle="#182a2c";ctx.fillRect(0,0,W,H);drawTitleDecor();ctx.restore();return}
    drawBackground();
    for(const g of gems){const bob=Math.sin(g.phase)*2;ctx.fillStyle="#10231e";ctx.fillRect(g.x-5,g.y-3+bob,10,8);ctx.fillStyle="#87f0bf";ctx.fillRect(g.x-3,g.y-4+bob,6,6);ctx.fillStyle="#e7f9bb";ctx.fillRect(g.x-1,g.y-3+bob,2,2)}
    for(const e of enemies)drawEnemy(e);
    drawPlayer();
    for(const s of slashes){
      if(s.kind==="sword"){
        ctx.globalAlpha=Math.max(0,s.life/s.max);ctx.strokeStyle="#d9fff3";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(s.tx,s.ty);ctx.stroke();
        ctx.strokeStyle="#83d9d0";ctx.lineWidth=1;ctx.stroke();
      }else{
        ctx.globalAlpha=Math.max(0,s.life/s.max)*.7;ctx.strokeStyle="#9cf6e4";ctx.lineWidth=4;ctx.beginPath();ctx.arc(s.x,s.y,s.radius,0,Math.PI*2);ctx.stroke();ctx.strokeStyle="#e6f8bf";ctx.lineWidth=1;ctx.beginPath();ctx.arc(s.x,s.y,s.radius*.78,0,Math.PI*2);ctx.stroke();
      }
    }
    ctx.globalAlpha=1;
    for(const p of particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size)}
    ctx.globalAlpha=1;
    // skill cooldown hint near player
    if(player.skillTimer>0){ctx.fillStyle="#e2d9bb";ctx.font="10px Arial";ctx.textAlign="center";ctx.fillText(`✦ ${player.skillTimer.toFixed(1)}s`,player.x,player.y+28)}
    ctx.restore();
  }
  function drawTitleDecor(){
    for(let i=0;i<55;i++){const x=(i*97)%W,y=(i*67)%H;ctx.fillStyle=i%4===0?"#5c9c87":"#314c45";ctx.fillRect(x,y,2,2)}
    ctx.strokeStyle="#547c6a55";ctx.lineWidth=1;
    for(let i=0;i<5;i++){ctx.beginPath();ctx.arc(W/2,H/2,45+i*35,0,Math.PI*2);ctx.stroke()}
  }
  function loop(ts) {
    const dt=Math.min(.035,(ts-last)/1000||0);last=ts;
    if(state==="playing")update(dt);
    draw();
    requestAnimationFrame(loop);
  }
  document.getElementById("start-btn").addEventListener("click",reset);
  document.getElementById("restart-btn").addEventListener("click",reset);
  document.getElementById("restart-from-pause").addEventListener("click",reset);
  function togglePause(){
    if(state==="playing"){state="paused";GameUI.show("pause-screen")}
    else if(state==="paused"){state="playing";GameUI.hideAll()}
  }
  document.getElementById("pause-btn").addEventListener("click",togglePause);
  document.getElementById("resume-btn").addEventListener("click",()=>{state="playing";GameUI.hideAll()});
  window.addEventListener("game-toggle-pause",()=>{if(state==="playing"||state==="paused")togglePause()});
  resize();requestAnimationFrame(loop);
})();