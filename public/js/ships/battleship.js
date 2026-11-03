// Ship: Battleship — one file per ship.
export default {
  id: 'battleship',
  name: 'Battleship',
  price: 8000,
  hp: 420,
  speed: 150,
  petroleum: 100,
  color: '#6d4c41',
  hull: '#3e2723',
  size: 58,
  skills: [
    { id: 'carpet', name: 'Carpet Bomb', cost: 35, cooldown: 12, targetable: true,
      desc: 'Tap, then tap a spot: a huge explosion zone. Costs 35 petroleum.' },
    { id: 'armor', name: 'Heavy Armor', cost: 25, cooldown: 14,
      desc: 'Halve incoming damage for 6s. Costs 25 petroleum.' },
  ],
  draw(ctx, x, y, scale, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.fillStyle = this.hull;
    ctx.beginPath();
    ctx.moveTo(36, 0); ctx.quadraticCurveTo(16, 19, -30, 15);
    ctx.lineTo(-34, 0); ctx.lineTo(-30, -15); ctx.quadraticCurveTo(16, -19, 36, 0);
    ctx.fill();
    ctx.fillStyle = this.color;
    ctx.fillRect(-24, -12, 46, 24);
    ctx.fillStyle = '#90a4ae';
    ctx.fillRect(14, -5, 12, 10);
    ctx.fillRect(-2, -5, 12, 10);
    ctx.fillRect(-20, -4, 10, 8);
    ctx.beginPath(); ctx.arc(2, 0, 6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },
};
