(() => {
  const ids = ["start-screen","upgrade-screen","pause-screen","gameover-screen"];
  const el = id => document.getElementById(id);
  window.GameUI = {
    show(name) { ids.forEach(id => el(id).classList.toggle("hidden", id !== name)); },
    hideAll() { ids.forEach(id => el(id).classList.add("hidden")); },
    updateHUD(p, game) {
      el("hp-fill").style.width = `${Math.max(0,p.hp/p.maxHp*100)}%`;
      el("hp-text").textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
      el("xp-fill").style.width = `${p.xp/p.xpNext*100}%`;
      el("level-text").textContent = `${p.realm} · Lv.${p.level}`;
      const s = Math.floor(game.time);
      el("timer").textContent = `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
      el("kill-count").textContent = `妖兽 ${game.kills}`;
    },
    showUpgrades(options, choose) {
      const root = el("upgrade-options"); root.innerHTML = "";
      options.forEach((o, i) => {
        const button = document.createElement("button");
        button.className = "upgrade-card";
        button.innerHTML = `<span class="emoji">${o.icon}</span><strong>${o.name}</strong><p>${o.desc}</p>`;
        button.addEventListener("click", () => choose(i));
        root.appendChild(button);
      });
      this.show("upgrade-screen");
    },
    showGameOver(game, p) {
      const s = Math.floor(game.time);
      el("result-time").textContent = `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
      el("result-kills").textContent = game.kills;
      el("result-level").textContent = p.level;
      this.show("gameover-screen");
    },
    toast(message) {
      const node = el("toast"); node.textContent = message; node.classList.add("show");
      clearTimeout(this._toastTimer); this._toastTimer = setTimeout(() => node.classList.remove("show"), 1500);
    }
  };
})();