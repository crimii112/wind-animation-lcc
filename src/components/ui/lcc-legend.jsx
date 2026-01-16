import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

import { Point } from 'ol/geom';
import { toContext } from 'ol/render';
import { Fill, RegularShape, Stroke, Style } from 'ol/style';

const LccLegend = ({
  title,
  rgbs,
  unit,
  pollLegendOn = true,
  wsLegendOn = true,
}) => {
  const [open, setOpen] = useState(true);

  if (!open) {
    return <LegendOpenBtn onClick={() => setOpen(true)}>범례</LegendOpenBtn>;
  }

  return (
    <LegendWrapper>
      <LegendContainer>
        <div className={pollLegendOn ? '' : 'hidden'}>
          <LegendTitle>
            {title}({unit})
          </LegendTitle>
          {rgbs.toReversed().map(item => (
            <div className="flex flex-row items-end gap-1 h-5" key={item.min}>
              <div
                className="w-6 h-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm leading-none translate-y-[5px]">
                {title === 'O3' ? item.min.toFixed(3) : item.min}
              </span>
            </div>
          ))}
        </div>
        <div className={wsLegendOn ? '' : 'hidden'}>
          <LegendTitle>WS(m/s)</LegendTitle>
          {arrowLegendDatas.map(item => (
            <LegendItem key={item.ws}>
              <ArrowImg ws={item.ws} />
              <RangeLabel>{Number(item.ws).toFixed(1)}</RangeLabel>
            </LegendItem>
          ))}
        </div>

        <button className="fold-btn" onClick={() => setOpen(false)}>
          접어두기
        </button>
      </LegendContainer>
    </LegendWrapper>
  );
};

export default LccLegend;

const arrowLegendDatas = [
  { ws: 1.0 },
  { ws: 3.0 },
  { ws: 5.0 },
  { ws: 7.0 },
  { ws: 9.0 },
];

const ArrowImg = ({ ws }) => {
  const arrowImgRef = useRef(null);

  useEffect(() => {
    const canvas = arrowImgRef.current;
    if (!canvas) return;

    const size = 20;
    const pr = window.devicePixelRatio || 1;
    canvas.width = size * pr;
    canvas.height = size * pr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    canvas.style.marginRight = `10px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const shaft = new RegularShape({
      points: 2,
      radius: 5,
      stroke: new Stroke({
        width: 2,
        color: 'black',
      }),
      rotateWithView: true,
    });

    const head = new RegularShape({
      points: 3,
      radius: 5,
      fill: new Fill({
        color: 'black',
      }),
      rotateWithView: true,
    });

    const angle = ((270 - 180) * Math.PI) / 180; // 오른쪽 수평
    const scale = ws / 10;
    shaft.setScale([1, scale]);
    shaft.setRotation(angle);
    head.setDisplacement([0, head.getRadius() / 2 + shaft.getRadius() * scale]);
    head.setRotation(angle);

    const vc = toContext(ctx, {
      size: [canvas.width, canvas.height],
      pixelRatio: pr,
    });
    vc.setStyle(new Style({ image: shaft }));
    vc.drawGeometry(new Point([canvas.width / 2, canvas.height / 2]));
    vc.setStyle(new Style({ image: head }));
    vc.drawGeometry(new Point([canvas.width / 2, canvas.height / 2]));
  }, []);

  return <canvas ref={arrowImgRef} />;
};

const LegendWrapper = styled.div`
  position: absolute;
  bottom: 12px;
  right: 12px;
  z-index: 1000;
`;
const LegendContainer = styled.div`
  background: rgba(255, 255, 255, 0.85);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);

  display: flex;
  flex-direction: column;
  gap: 12px;

  pointer-events: auto;

  .fold-btn {
    position: absolute;
    bottom: 6px;
    right: 6px;

    background: none;
    border: none;

    font-size: 11px;
    color: #666;
    cursor: pointer;

    border-radius: 4px;
    transition: background-color 0.2s, color 0.2s;

    &:hover {
      background-color: rgba(0, 0, 0, 0.05);
      color: #000;
    }
  }
`;
const LegendTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 6px;
`;
const LegendItem = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 4px;
`;
const RangeLabel = styled.span`
  font-size: 14px;
  font-variant-numeric: tabular-nums;
`;

const LegendOpenBtn = styled.button`
  position: absolute;
  bottom: 12px;
  right: 12px;
  z-index: 1000;

  padding: 6px 10px;
  font-size: 14px;
  border-radius: 6px;
  border: 1px solid #ccc;
  background: rgba(255, 255, 255, 0.85);
  cursor: pointer;

  writing-mode: horizontal-tb;
  text-orientation: mixed;
  white-space: nowrap;
  min-width: 40px;
  text-align: center;

  &:hover {
    background: rgba(255, 255, 255, 1);
  }
`;
