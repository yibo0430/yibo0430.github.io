(() => {
  const keys = new Set();
  const state = { x: 0, y: 0, skill: false };
  const joystick = document.getElementById("joystick");
  const stick = document.getElementById("stick");
  let joyPointer = null;

  window.addEventListener("keydown", e => {
    const k = e.key.toLowerCase();
    if (["arrowup","arrowdown","arrowleft","arrowright"," ","w","a","s","d","p","escape"].includes(k)) e.preventDefault();
    keys.add(k);
    if ((k === " " || k === "j") && !e.repeat) state.skill = true;
    if ((k === "p" || k === "escape") && !e.repeat) window.dispatchEvent(new CustomEvent("game-toggle-pause"));
  });
  window.addEventListener("keyup", e => keys.delete(e.key.toLowerCase()));
  window.addEventListener("blur", () => keys.clear());

  function updateKeyboard() {
    let x = 0, y = 0;
    if (keys.has("a") || keys.has("arrowleft")) x--;
    if (keys.has("d") || keys.has("arrowright")) x++;
    if (keys.has("w") || keys.has("arrowup")) y--;
    if (keys.has("s") || keys.has("arrowdown")) y++;
    if (x || y) {
      const len = Math.hypot(x, y); x /= len; y /= len;
      // Keyboard and joystick combine naturally; joystick takes priority while touched.
      if (joyPointer === null) { state.x = x; state.y = y; }
    } else if (joyPointer === null) { state.x = 0; state.y = 0; }
  }
  function placeStick(clientX, clientY) {
    const r = joystick.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const max = r.width * .31;
    let dx = clientX - cx, dy = clientY - cy;
    const len = Math.hypot(dx, dy);
    if (len > max) { dx = dx / len * max; dy = dy / len * max; }
    stick.style.transform = `translate(${dx}px, ${dy}px)`;
    state.x = dx / max; state.y = dy / max;
    const mag = Math.hypot(state.x, state.y);
    if (mag > 1) { state.x /= mag; state.y /= mag; }
  }
  joystick.addEventListener("pointerdown", e => {
    e.preventDefault(); joyPointer = e.pointerId;
    joystick.setPointerCapture(e.pointerId); placeStick(e.clientX, e.clientY);
  });
  joystick.addEventListener("pointermove", e => {
    if (e.pointerId === joyPointer) { e.preventDefault(); placeStick(e.clientX, e.clientY); }
  });
  function releaseJoy(e) {
    if (e.pointerId !== joyPointer) return;
    joyPointer = null; state.x = 0; state.y = 0; stick.style.transform = "translate(0,0)";
    updateKeyboard();
  }
  joystick.addEventListener("pointerup", releaseJoy);
  joystick.addEventListener("pointercancel", releaseJoy);
  document.getElementById("skill-btn").addEventListener("pointerdown", e => {
    e.preventDefault(); state.skill = true;
    const b = e.currentTarget; b.classList.add("pressed");
  });
  ["pointerup","pointercancel","pointerleave"].forEach(type => document.getElementById("skill-btn").addEventListener(type, () => document.getElementById("skill-btn").classList.remove("pressed")));

  window.GameInput = {
    read() { updateKeyboard(); const out = {x:state.x,y:state.y,skill:state.skill}; state.skill = false; return out; },
    clear() { keys.clear(); state.x=state.y=0; state.skill=false; }
  };
})();