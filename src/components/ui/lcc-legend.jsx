import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

import { Point } from 'ol/geom';
import { toContext } from 'ol/render';
import { Fill, RegularShape, Stroke, Style } from 'ol/style';

/**
 * 지도 범례 컴포넌트
 * - 물질 범례
 * - 풍속 범례
 */
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
    <LegendContainer>
      {pollLegendOn && (
        <LegendSection>
          <LegendTitle>
            {title}
            {unit ? `(${unit})` : ''}
          </LegendTitle>
          <ColorList>
            {rgbs.toReversed().map(item => (
              <ColorRow key={item.min}>
                <ColorBox style={{ backgroundColor: item.color }} />
                <ValueText>
                  {title === 'O3' || title === 'NO2' || title === 'SO2'
                    ? item.min.toFixed(3)
                    : title === 'CO' || title === '풍속'
                      ? item.min.toFixed(1)
                      : item.min}
                </ValueText>
              </ColorRow>
            ))}
          </ColorList>
        </LegendSection>
      )}
      {wsLegendOn && (
        <LegendSection>
          <LegendTitle>WS(m/s)</LegendTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {arrowLegendDatas.map(item => (
              <LegendItem key={item.ws}>
                <ArrowImg ws={item.ws} />
                <ValueText>{Number(item.ws).toFixed(1)}</ValueText>
              </LegendItem>
            ))}
          </div>
        </LegendSection>
      )}

      <FoldBtn onClick={() => setOpen(false)}>접어두기</FoldBtn>
    </LegendContainer>
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
    canvas.style.display = 'block';

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
    const cx = shaft.getRadius() + 2;
    const cy = canvas.height / 2 - 4;
    vc.setStyle(new Style({ image: shaft }));
    vc.drawGeometry(new Point([cx, cy]));
    vc.setStyle(new Style({ image: head }));
    vc.drawGeometry(new Point([cx, cy]));
  }, []);

  return <canvas ref={arrowImgRef} />;
};

const LegendContainer = styled.div`
  position: absolute;
  bottom: 12px;
  right: 12px;
  z-index: 1000;

  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);

  display: flex;
  flex-direction: column;
  gap: 15px;

  font-size: 14px;
  color: #333;
  min-width: 100px;

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
    transition:
      background-color 0.2s,
      color 0.2s;

    &:hover {
      background-color: rgba(0, 0, 0, 0.05);
      color: #000;
    }
  }
`;

const LegendOpenBtn = styled.button`
  position: absolute;
  bottom: 12px;
  right: 12px;
  z-index: 1000;

  padding: 8px 10px;
  font-size: 13px;
  border-radius: 6px;
  border: 1px solid #ccc;
  background: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 1);
    border-color: #bbb;
  }
`;

const LegendSection = styled.div`
  display: flex;
  flex-direction: column;
`;

const LegendTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid #eee;
`;

const ColorList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0px;
`;

const ColorRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 18px;
`;

const ColorBox = styled.div`
  width: 24px;
  height: 100%;
  border-radius: 0px;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
`;

const ValueText = styled.span`
  font-size: 12px;
  color: #333;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  transform: translateY(4px);
`;

const FoldBtn = styled.button`
  align-self: flex-end;
  background: none;
  border: none;
  font-size: 11px;
  color: #999;
  cursor: pointer;
  margin-top: 5px;

  &:hover {
    color: #333;
    text-decoration: underline;
  }
`;
