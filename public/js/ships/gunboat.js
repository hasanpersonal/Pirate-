// Ship: Gunboat — one file per ship. Edit this file to change the ship's
// stats, movement speed (speed), unique skills, price or appearance
// without touching any other file. Upgrade levels scale speed/damage in-game.
export default {
  id: 'gunboat',
  name: 'Gunboat',
  price: 0,                 // owned by default
  hp: 120,
  speed: 260,               // movement speed (px/s)
  petroleum: 100,           // max petroleum
  color: '#8a5a2b',
  hull: '#5d3d1e',
  size: 34,
  skills: [
    { id: 'spread', name: 'Torpedo Spread', cost: 15, cooldown: 5,
      desc: 'Fire 3 bombs in a fan. Costs 15 petroleum.' },
    { id: 'boost', name: 'Speed Boost', cost: 20, cooldown: 10,
      desc: 'Double movement speed for 4s. Costs 20 petroleum.' },
  ],
  // top-down drawing, also used for the main-page preview
  draw(ctx, x, y, scale, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.fillStyle = this.hull;
    ctx.beginPath(); // hull
    ctx.moveTo(22, 0); ctx.quadraticCurveTo(10, 12, -18, 10);
    ctx.lineTo(-22, 0); ctx.lineTo(-18, -10); ctx.quadraticCurveTo(10, -12, 22, 0);
    ctx.fill();
    ctx.fillStyle = this.color;
    ctx.fillRect(-14, -7, 26, 14); // deck
    ctx.fillStyle = '#cfd8dc';
    ctx.beginPath(); ctx.arc(8, 0, 5, 0, Math.PI * 2); ctx.fill(); // gun
    ctx.beginPath(); ctx.arc(-6, 0, 4, 0, Math.PI * 2); ctx.fill(); // cabin
    ctx.restore();
  },
};
