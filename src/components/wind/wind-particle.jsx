export default class WindParticle {
  constructor(item) {
    this.lon = item.lon;
    this.lat = item.lat;
    this.wd = item.wd;
    this.ws = item.ws;
    this.angle = ((this.wd + 180) * Math.PI) / 180;

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
    this.progress += 0.007 * this.speedFactor; // 이동 속도 조절
    if (this.progress > 1) this.reset();

    if (this.progress < 0.25) this.opacity = this.progress / 0.25;
    else if (this.progress > 0.75) this.opacity = (1 - this.progress) / 0.25;
    else this.opacity = 1;
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

    grad.addColorStop(0, `rgba(20, 128, 254, ${softOpacity * 0.9})`);
    grad.addColorStop(0.5, `rgba(20, 128, 254, ${softOpacity * 0.4})`);
    grad.addColorStop(1, `rgba(20, 128, 254, 0)`);

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
