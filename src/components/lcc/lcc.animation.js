import { useEffect, useRef } from 'react';

import WindParticle from '@/components/wind/wind-particle';
import { EarthWindOLAnimator } from '@/components/earth/earth-wind-ol-engine';

export function useWindAnimation({ map, layer, windData, windColor, enabled }) {
  const particlesRef = useRef([]);

  useEffect(() => {
    particlesRef.current = windData.map(
      d => new WindParticle(d, style.windColor),
    );
  }, [windData, windColor]);

  useEffect(() => {
    if (!map?.ol_uid) return;

    const onPostRender = e => {
      if (!enabled || particlesRef.current.length === 0) return;

      const ctx = e.context;
      ctx.save();
      particlesRef.current.forEach(p => {
        p.update();
        p.draw(ctx, map);
      });

      ctx.restore();
    };

    layer.setVisible(enabled);
    layer.on('postrender', onPostRender);

    return () => {
      layer.un('postrender', onPostRender);
    };
  }, [map, enabled]);
}

export function useEarthAnimation({ map, layer, earthData, enabled }) {
  const animatorRef = useRef(null);

  useEffect(() => {
    if (!map?.ol_uid || !enabled || earthData.length === 0) return;

    // const layer = layerEarthWindCanvasRef.current;
    // layer.setVisible(layerVisible.earth);

    // // 토글 OFF면 정지/정리
    // if (!layerVisible.earth) {
    //   earthWindAnimatorRef.current?.stop?.();
    //   earthWindAnimatorRef.current = null;
    //   map.render();
    //   return;
    // }

    // earth_wind.json에서 u/v 선택
    const u = earthData.find(r => r.header?.parameterNumber === 2);
    const v = earthData.find(r => r.header?.parameterNumber === 3);
    if (!u || !v) return;

    const grid = buildGrid(u, v);
    const animator = new EarthWindOLAnimator({
      map,
      grid,
    });

    const onPostRender = e => animator.drawFrame(e.context);

    // const onMoveStart = () => {
    //   animator.stop();
    //   animator.clearTrails();
    //   layer.setVisible(false); // ← 잠시 사라지게
    //   map.render();
    // };

    // const onMoveEnd = () => {
    //   layer.setVisible(true);
    //   animator.start(); // 내부에서 rebuildField 호출
    //   map.render();
    // };
    layer.setVisible(true);
    layer.on('postrender', onPostRender);
    // map.on('movestart', onMoveStart);
    // map.on('moveend', onMoveEnd);

    // earthWindAnimatorRef.current = animator;
    animator.start();
    animatorRef.current = animator;

    return () => {
      layer.un('postrender', onPostRender);

      //   map.un('movestart', onMoveStart);
      //   map.un('moveend', onMoveEnd);
      animator.stop();
      animatorRef.current = null;
    };
  }, [map, enabled, earthData]);
}
