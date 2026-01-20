export default class WindParticle {
  constructor(item, color = '#1480FE') {
    this.lon = item.lon;
    this.lat = item.lat;
    this.wd = item.wd;
    this.ws = item.ws;
    this.angle = ((this.wd + 180) * Math.PI) / 180;

    this.rgb = this.parseHex(color);

    // 풍속 기반 속도, 길이, 두께 설정
    this.speedFactor = this.ws < 5 ? 0.5 : this.ws < 10 ? 0.75 : 1.0;
    this.length = this.ws < 3 ? 10 : this.ws < 6 ? 16 : this.ws < 10 ? 22 : 30;
    this.thickness = this.ws < 3 ? 1 : this.ws < 6 ? 2 : 3;

    this.reset(true);
  }

  reset(isInitial = false) {
    this.progress = isInitial ? Math.random() : 0; // isInitial이 true면 0~1 사이 무작위 지점에서 시작
    this.opacity = 0;
  }

  update() {
    this.progress += 0.008 * this.speedFactor; // 이동 속도 조절
    if (this.progress > 1) this.reset();

    if (this.progress < 0.25) this.opacity = this.progress / 0.25;
    else if (this.progress > 0.75) this.opacity = (1 - this.progress) / 0.25;
    else this.opacity = 1;
  }

  parseHex(hex) {
    try {
      const strHex = String(hex).trim().replace('#', '');

      const r = parseInt(strHex.substring(0, 2), 16);
      const g = parseInt(strHex.substring(2, 4), 16);
      const b = parseInt(strHex.substring(4, 6), 16);

      if (isNaN(r) || isNaN(g) || isNaN(b)) {
        console.warn('Invalid color format:', hex);
        return { r: 20, g: 128, b: 254 };
      }

      return { r, g, b };
    } catch (e) {
      console.error('Color parsing error:', e);
      return { r: 20, g: 128, b: 254 };
    }
  }

  draw(ctx, map) {
    const pixel = map.getPixelFromCoordinate([this.lon, this.lat]); // 위경도 -> 픽셀 위치
    if (!pixel) return;

    ctx.save();
    ctx.translate(pixel[0], pixel[1]);
    ctx.rotate(this.angle);

    const movement = this.length * (1 - this.progress * 1.5); // 이동 범위(1.5) 조절

    // 그라데이션
    const grad = ctx.createLinearGradient(
      0,
      movement, // 시작점
      0,
      movement + this.length // 끝점
    );
    const softOpacity = this.opacity * this.opacity;

    const { r, g, b } = this.rgb;
    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${softOpacity * 0.9})`);
    grad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${softOpacity * 0.4})`);
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

    ctx.beginPath();
    ctx.strokeStyle = grad;

    ctx.lineWidth = this.thickness + 1.2;
    ctx.lineCap = 'round';

    ctx.moveTo(0, movement);
    ctx.lineTo(0, movement + this.length);
    ctx.stroke();
    ctx.restore();
  }
}
