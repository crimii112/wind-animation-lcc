import { useRef, useState } from 'react';
import styled from 'styled-components';

/* ------------------ 유틸 함수 ------------------ */
function segmentsToLinearGradient(segments) {
  const min = segments[0][0];
  const max = segments[segments.length - 1][0];

  const stops = segments.map(([value, [r, g, b]]) => {
    const pct = ((value - min) / (max - min)) * 100;
    return `rgb(${r}, ${g}, ${b}) ${pct.toFixed(1)}%`;
  });

  return `linear-gradient(to right, ${stops.join(', ')})`;
}

function valueToColor(segments, value) {
  for (let i = 0; i < segments.length - 1; i++) {
    const [v0, c0] = segments[i];
    const [v1, c1] = segments[i + 1];

    if (value >= v0 && value <= v1) {
      const t = (value - v0) / (v1 - v0);
      const r = Math.round(c0[0] + t * (c1[0] - c0[0]));
      const g = Math.round(c0[1] + t * (c1[1] - c0[1]));
      const b = Math.round(c0[2] + t * (c1[2] - c0[2]));
      return `rgb(${r}, ${g}, ${b})`;
    }
  }

  const last = segments[segments.length - 1][1];
  return `rgb(${last[0]}, ${last[1]}, ${last[2]})`;
}

/* ------------------ 컴포넌트 ------------------ */
const ColorScale = ({ segments, scaleMeta }) => {
  if (!segments || segments.length === 0) return null;

  const min = segments[0][0];
  const max = segments[segments.length - 1][0];
  const gradient = segmentsToLinearGradient(segments);

  const barRef = useRef(null);
  const [hoverValue, setHoverValue] = useState(null);
  const [hoverX, setHoverX] = useState(0);
  const [hoverColor, setHoverColor] = useState(null);

  let displayValue = '';
  if (hoverValue !== null) displayValue = scaleMeta.format(hoverValue);

  const handleMouseMove = e => {
    const rect = barRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const t = Math.min(Math.max(x / rect.width, 0), 1);

    const value = min + t * (max - min);
    const color = valueToColor(segments, value);

    setHoverValue(value);
    setHoverColor(color);
    setHoverX(x);
  };

  const handleLeave = () => {
    setHoverValue(null);
    setHoverColor(null);
  };

  return (
    <ColorScaleWrap>
      <div
        ref={barRef}
        className="bar"
        style={{ background: gradient }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleLeave}
      />

      {hoverValue != null && (
        <div
          className="tooltip"
          style={{ left: hoverX, background: hoverColor }}
        >
          {displayValue} {scaleMeta.unit}
        </div>
      )}

      <div className="labels">
        <span>
          {scaleMeta.labelFormat(min)}
          {scaleMeta.unit}
        </span>
        <span>
          {scaleMeta.labelFormat(max)}
          {scaleMeta.unit}
        </span>
      </div>
    </ColorScaleWrap>
  );
};

export default ColorScale;

/* ------------------ styled ------------------ */
const ColorScaleWrap = styled.div`
  position: relative;
  margin-top: 6px;
  width: 100%;
  box-sizing: border-box;

  .bar {
    width: 100%;
    height: 15px;
    border-radius: 6px;
    border: 1px solid #ccc;
    cursor: crosshair;
  }

  .labels {
    margin-top: 2px;
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #777;
  }

  .tooltip {
    position: absolute;
    top: -26px;
    transform: translateX(-50%);
    padding: 2px 6px;
    font-size: 11px;
    font-weight: 600;
    color: #fff;
    border-radius: 4px;
    white-space: nowrap;
    pointer-events: none;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
  }
`;
