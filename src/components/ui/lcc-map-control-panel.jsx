import { useContext, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';

import { LccContext } from '@/components/lcc/LccContext';

const MIN_TSTEP = 0;
const MAX_TSTEP = 238;
const BASE_SPEED = 1000; // 1초

/**
 * 지도 컨트롤 패널 컴포넌트
 * - 날짜/시간 표시
 * - 재생 컨트롤 바(재생/일시정지, 이전/다음 TSTEP, 속도 선택, 초기화)
 * - 지도 설정(격자 km, layer, tstep, bgPoll, arrowGap)
 * - 레이어 visible, 스타일(투명도, 색상) 설정
 */
const LccMapControlPanel = ({ datetime, segments, scaleMeta }) => {
  const {
    settings,
    updateSettings,
    style,
    updateStyle,
    layerVisible,
    toggleLayer,
  } = useContext(LccContext);
  const [open, setOpen] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const timerRef = useRef(null);

  /* 자동 재생 로직 */
  useEffect(() => {
    if (isPlaying) {
      const interval = BASE_SPEED / speedMultiplier;

      timerRef.current = setInterval(() => {
        const nextTstep =
          settings.tstep >= MAX_TSTEP ? MIN_TSTEP : settings.tstep + 1;
        updateSettings('tstep', nextTstep);
      }, interval);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isPlaying, settings.tstep, speedMultiplier]);

  const handlePrevTstep = () => {
    setIsPlaying(false);
    updateSettings('tstep', Math.max(MIN_TSTEP, settings.tstep - 1));
  };

  const handleNextTstep = () => {
    setIsPlaying(false);
    updateSettings('tstep', Math.min(MAX_TSTEP, settings.tstep + 1));
  };

  if (!open)
    return <PanelOpenBtn onClick={() => setOpen(true)}>지도 설정</PanelOpenBtn>;

  return (
    <Panel>
      {/* 상단 날짜 및 시간 표시 */}
      {datetime && (
        <DatetimeHeader>
          <span className="date-text">{datetime}</span>
        </DatetimeHeader>
      )}

      {/* 재생 컨트롤 바 */}
      <PlayControlRow>
        <button
          className="icon-btn"
          onClick={handlePrevTstep}
          disabled={settings.tstep === MIN_TSTEP}
        >
          <ChevronLeft size={16} />
        </button>
        <button
          className={`play-main-btn ${isPlaying ? 'playing' : ''}`}
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? (
            <>
              <Pause size={14} fill="currentColor" /> 일시정지
            </>
          ) : (
            <>
              <Play size={14} fill="currentColor" /> 재생 시작
            </>
          )}
        </button>
        <button
          className="icon-btn"
          onClick={handleNextTstep}
          disabled={settings.tstep === MAX_TSTEP}
        >
          <ChevronRight size={16} />
        </button>
        <div className="extra-controls">
          <SpeedSelect
            value={speedMultiplier}
            onChange={e => setSpeedMultiplier(Number(e.target.value))}
          >
            <option value={0.5}>0.5x</option>
            <option value={0.8}>0.8x</option>
            <option value={1}>1.0x</option>
            <option value={1.2}>1.2x</option>
            <option value={1.5}>1.5x</option>
          </SpeedSelect>
          <button
            className="icon-btn"
            onClick={() => {
              setIsPlaying(false);
              updateSettings('tstep', MIN_TSTEP);
            }}
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </PlayControlRow>

      {/* 지도 설정(격자km, layer, tstep, bgPoll, arrowGap) */}
      <ControlRow>
        <span>격자 km</span>
        <select
          value={settings.gridKm}
          onChange={e => updateSettings('gridKm', Number(e.target.value))}
        >
          <option value={9}>9</option>
          <option value={27}>27</option>
        </select>
      </ControlRow>
      <ControlRow>
        <span>LAYER</span>
        <select
          value={settings.layer}
          onChange={e => updateSettings('layer', Number(e.target.value))}
        >
          {Array.from({ length: 1 }, (_, i) => (
            <option key={i} value={i}>
              {i + 1}
            </option>
          ))}
        </select>
      </ControlRow>
      <ControlRow>
        <span>TSTEP</span>
        <select
          value={settings.tstep}
          onChange={e => updateSettings('tstep', Number(e.target.value))}
        >
          {Array.from({ length: 239 }, (_, i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
      </ControlRow>
      <ControlRow>
        <span>배경 물질</span>
        <select
          value={settings.bgPoll}
          onChange={e => updateSettings('bgPoll', e.target.value)}
        >
          <option value="WIND">풍속</option>
          <option value="TEMP">온도</option>
          <option value="CAI">CAI</option>
          <option value="O3">O3</option>
          <option value="SO2">SO2</option>
          <option value="NO2">NO2</option>
          <option value="CO">CO</option>
          <option value="PM10">PM10</option>
          <option value="PM2.5">PM2.5</option>
        </select>
      </ControlRow>
      <ControlRow>
        <span>바람 간격</span>
        <select
          value={settings.arrowGap}
          onChange={e => {
            updateSettings('arrowGap', Number(e.target.value));
          }}
        >
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
        </select>
      </ControlRow>

      {/* 레이어 visible, 스타일(투명도, 색상) 설정 */}
      <ControlGroup>
        <label className="main-label">
          <input
            type="checkbox"
            checked={layerVisible.concPolygon}
            onChange={e => toggleLayer('concPolygon', e.target.checked)}
          />
          <span>모델링 농도장</span>
        </label>

        {layerVisible.concPolygon && (
          <div className="sub-container">
            <SubRow>
              <span className="label-text">폴리곤 방식</span>
              <select
                value={settings.polygonMode}
                onChange={e => updateSettings('polygonMode', e.target.value)}
              >
                <option value="multi">멀티 폴리곤</option>
                <option value="single">단일 폴리곤(오버레이)</option>
              </select>
            </SubRow>
            <SubRow>
              <span className="label-text">투명도</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={style.concPolygonOpacity}
                onChange={e =>
                  updateStyle('concPolygonOpacity', Number(e.target.value))
                }
              />
              <span className="value-text">
                {Math.round(style.concPolygonOpacity * 100)}%
              </span>
            </SubRow>
          </div>
        )}
      </ControlGroup>
      <ControlGroup>
        <label className="main-label">
          <input
            type="checkbox"
            checked={layerVisible.windArrows}
            onChange={e => toggleLayer('windArrows', e.target.checked)}
          />
          <span>바람장 화살표</span>
        </label>
        {layerVisible.windArrows && (
          <div className="sub-container">
            <SubRow>
              <span className="label-text">투명도</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={style.windArrowsOpacity}
                onChange={e =>
                  updateStyle('windArrowsOpacity', Number(e.target.value))
                }
              />
              <span className="value-text">
                {Math.round(style.windArrowsOpacity * 100)}%
              </span>
            </SubRow>
            <SubRow>
              <span className="label-text">색상</span>
              <ColorPicker>
                <div style={{ backgroundColor: style.arrowColor }} />
                <input
                  type="color"
                  value={style.arrowColor}
                  onChange={e => updateStyle('arrowColor', e.target.value)}
                />
              </ColorPicker>
            </SubRow>
          </div>
        )}
      </ControlGroup>
      <ControlGroup>
        <label className="main-label">
          <input
            type="checkbox"
            checked={layerVisible.windAnimation}
            onChange={e => toggleLayer('windAnimation', e.target.checked)}
          />
          <span>바람장 애니메이션</span>
        </label>
        {layerVisible.windAnimation && (
          <div className="sub-container">
            <SubRow>
              <span className="label-text">색상</span>
              <ColorPicker>
                <div style={{ backgroundColor: style.windColor }} />
                <input
                  type="color"
                  value={style.windColor}
                  onChange={e => updateStyle('windColor', e.target.value)}
                />
              </ColorPicker>
            </SubRow>
          </div>
        )}
      </ControlGroup>
      <ControlGroup>
        <label className="main-label">
          <input
            type="checkbox"
            checked={layerVisible.earthWind}
            onChange={e => toggleLayer('earthWind', e.target.checked)}
          />
          <span>바람장 earth</span>
        </label>
        {layerVisible.earthWind && (
          <div className="sub-container">
            <SubRow>
              <span className="label-text">색상</span>
              <ColorPicker>
                <div style={{ backgroundColor: style.earthWindColor }} />
                <input
                  type="color"
                  value={style.earthWindColor}
                  onChange={e => updateStyle('earthWindColor', e.target.value)}
                />
              </ColorPicker>
            </SubRow>
          </div>
        )}
      </ControlGroup>
      <ControlGroup>
        <label className="main-label">
          <input
            type="checkbox"
            checked={layerVisible.earthScalar}
            onChange={e => toggleLayer('earthScalar', e.target.checked)}
          />
          <span>농도장 earth</span>
        </label>
        {layerVisible.earthScalar && (
          <div className="sub-container">
            <ColorScale segments={segments} scaleMeta={scaleMeta} />
            <SubRow>
              <span className="label-text">투명도</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={style.earthScalarOpacity}
                onChange={e =>
                  updateStyle('earthScalarOpacity', Number(e.target.value))
                }
              />
              <span className="value-text">
                {Math.round(style.earthScalarOpacity * 100)}%
              </span>
            </SubRow>
          </div>
        )}
      </ControlGroup>
      <ControlGroup>
        <label className="main-label">
          <input
            type="checkbox"
            checked={layerVisible.webglWind}
            onChange={e => toggleLayer('webglWind', e.target.checked)}
          />
          <span>바람장 WebGL</span>
        </label>
      </ControlGroup>
      <ControlGroup>
        <label className="main-label">
          <input
            type="checkbox"
            checked={layerVisible.sidoshp}
            onChange={e => toggleLayer('sidoshp', e.target.checked)}
          />
          <span>시도 경계</span>
        </label>
        {layerVisible.sidoshp && (
          <div className="sub-container">
            <SubRow>
              <span className="label-text">투명도</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={style.sidoshpOpacity}
                onChange={e =>
                  updateStyle('sidoshpOpacity', Number(e.target.value))
                }
              />
              <span className="value-text">
                {Math.round(style.sidoshpOpacity * 100)}%
              </span>
            </SubRow>
            <SubRow>
              <span className="label-text">색상</span>
              <ColorPicker>
                <div style={{ backgroundColor: style.sidoshpColor }} />
                <input
                  type="color"
                  value={style.sidoshpColor}
                  onChange={e => updateStyle('sidoshpColor', e.target.value)}
                />
              </ColorPicker>
            </SubRow>
          </div>
        )}
      </ControlGroup>
      <ControlGroup>
        <label className="main-label">
          <input
            type="checkbox"
            checked={layerVisible.grid}
            onChange={e => toggleLayer('grid', e.target.checked)}
          />
          <span>격자</span>
        </label>
      </ControlGroup>
      <FoldBtn onClick={() => setOpen(false)}>접어두기</FoldBtn>
    </Panel>
  );
};

export default LccMapControlPanel;

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

  // 범위 밖 fallback
  const last = segments[segments.length - 1][1];
  return `rgb(${last[0]}, ${last[1]}, ${last[2]})`;
}

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

const Panel = styled.div`
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 1000;

  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);

  display: flex;
  flex-direction: column;
  gap: 10px;

  font-size: 14px;
  color: #333;

  max-height: calc(100vh - 24px);
  overflow-y: auto;
  scrollbar-gutter: stable;
  overscroll-behavior: contain;
`;

const PanelOpenBtn = styled.button`
  position: absolute;
  top: 12px;
  left: 12px;
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
    background: #f8f9fa;
    border-color: #bbb;
  }
`;

const DatetimeHeader = styled.div`
  padding-bottom: 8px;
  margin-bottom: 4px;
  border-bottom: 1px solid #eee;
  text-align: center;

  .date-text {
    font-weight: 600;
    font-size: 16px;
    color: #333;
  }
`;

const ControlRow = styled.label`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;

  span {
    white-space: nowrap;
  }

  select {
    width: 100px;
    padding: 5px 25px 5px 10px;
    font-size: 13px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: #fff
      url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23666' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")
      no-repeat right 8px center;
    appearance: none;
    cursor: pointer;

    &:focus {
      outline: none;
      border-color: #4a90e2;
      box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.1);
    }
  }
`;

const ControlGroup = styled.div`
  padding: 8px 0;
  border-top: 1px solid #f5f5f5;

  .main-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
  }

  .sub-container {
    padding-left: 24px;
    margin-top: 6px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
`;

const SubRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #555;

  .label-text {
    min-width: 50px;
    color: #444;
    font-weight: 500;
  }

  select {
    min-width: 110px;
    padding: 4px 22px 4px 8px;
    font-size: 12px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: #fff
      url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23666' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")
      no-repeat right 6px center;
    appearance: none;
  }

  input[type='range'] {
    flex: 1;
    height: 4px;
    accent-color: #4a90e2;
    cursor: pointer;
  }

  .value-text {
    min-width: 30px;
    text-align: right;
    color: #999;
  }
`;

const ColorPicker = styled.label`
  position: relative;
  width: 30px;
  height: 18px;
  border-radius: 4px;
  cursor: pointer;
  overflow: hidden;
  border: 1px solid #ccc;

  div {
    width: 100%;
    height: 100%;
    display: block;
  }

  input[type='color'] {
    position: absolute;
    width: 150%;
    height: 150%;
    top: -25%;
    left: -25%;
    cursor: pointer;
    opacity: 0;
  }
`;

const FoldBtn = styled.button`
  margin-top: 5px;
  align-self: flex-end;
  background: none;
  border: none;
  font-size: 11px;
  color: #999;
  cursor: pointer;
  &:hover {
    color: #333;
    text-decoration: underline;
  }
`;

const PlayControlRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  background: #f8f9fa;
  padding: 6px;
  border-radius: 8px;
  border: 1px solid #e9ecef;

  button {
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid transparent;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
  }

  .icon-btn {
    width: 32px;
    height: 32px;
    background: white;
    border-color: #dee2e6;
    color: #495057;
    &:hover:not(:disabled) {
      background: #f1f3f5;
      border-color: #ced4da;
      color: #212529;
    }
    &:disabled {
      opacity: 0.3;
    }
  }

  .play-main-btn {
    flex: 1;
    height: 32px;
    padding: 0 12px;
    gap: 8px;
    background: #3a86ff;
    color: white;
    white-space: nowrap;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

    &:hover {
      background: #2575fc;
      box-shadow: 0 4px 8px rgba(58, 134, 255, 0.3);
      transform: translateY(-0.5px);
    }

    &:active {
      transform: translateY(0);
    }

    &.playing {
      background: #fff;
      color: #dc3545;
      border: 1px solid #ffc9c9;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      transform: none;

      &:hover {
        background: #fff5f5;
        border-color: #ffa8a8;
        transform: none;
      }
    }
  }

  .extra-controls {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: 2px;
  }
`;

const SpeedSelect = styled.select`
  height: 32px;
  padding: 0 6px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  background: white;
  font-size: 11px;
  font-weight: 700;
  color: #495057;
  cursor: pointer;
  outline: none;
  &:hover {
    border-color: #adb5bd;
  }
`;

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
