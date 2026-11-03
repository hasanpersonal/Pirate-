// Ship: Destroyer — one file per ship.
export default {
  id: 'destroyer',
  name: 'Destroyer',
  price: 2000,
  hp: 220,
  speed: 210,
  petroleum: 100,
  color: '#3f5a78',
  hull: '#26374a',
  size: 44,
  skills: [
    { id: 'barrage', name: 'Missile Barrage', cost: 25, cooldown: 8, targetable: true,
      desc: 'Tap, then tap a spot on the map: 5 bombs rain down there. Costs 25 petroleum.' },
    { id: 'repair', name: 'Emergency Repair', cost: 20, cooldown: 15,
      desc: 'Restore 40 HP. Costs 20 petroleum.' },
  ],
  draw(ctx, x, y, scale, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.fillStyle = this.hull;
    ctx.beginPath();
    ctx.moveTo(28, 0); ctx.quadraticCurveTo(12, 15, -24, 12);
    ctx.lineTo(-28, 0); ctx.lineTo(-24, -12); ctx.quadraticCurveTo(12, -15, 28, 0);
    ctx.fill();
    ctx.fillStyle = this.color;
    ctx.fillRect(-18, -9, 34, 18);
    ctx.fillStyle = '#b0bec5';
    ctx.fillRect(10, -3, 10, 6);   // front turret
    ctx.fillRect(-12, -3, 8, 6);   // rear turret
    ctx.beginPath(); ctx.arc(-2, 0, 5, 0, Math.PI * 2); ctx.fill(); // bridge
    ctx.restore();
  },
};
