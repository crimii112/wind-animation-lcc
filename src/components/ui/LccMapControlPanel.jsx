import { useContext, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { ChevronLeft, ChevronRight, Pause, Play, Clock } from 'lucide-react';

import { LccContext } from '@/components/lcc/LccContext';
import ColorScale from './ColorScale';
import { FEATURES } from '@/config/featureFlags';

const BASE_SPEED = 1000; // 1초

const LayerToggle = ({ label, checked, onChange, disabled, children }) => {
  return (
    <ControlGroup>
      <label className="main-label">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={e => onChange(e.target.checked)}
        />
        <span>{label}</span>
      </label>

      {checked && children && <div className="sub-container">{children}</div>}
    </ControlGroup>
  );
};

const SectionBox = ({ title, children }) => {
  return (
    <SectionWrapper>
      {title && <div className="section-title">{title}</div>}
      <div className="section-body">{children}</div>
    </SectionWrapper>
  );
};

/**
 * 지도 컨트롤 패널 컴포넌트
 * - 날짜/시간 표시
 * - 재생 컨트롤 바(재생/일시정지, 이전/다음 TSTEP, 속도 선택, 초기화)
 * - 지도 설정(격자 km, layer, tstep, bgPoll, arrowGap)
 * - 레이어 visible, 스타일(투명도, 색상) 설정
 */
const LccMapControlPanel = ({ datetime, segments, scaleMeta, meta }) => {
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
  const [speedMultiplier, setSpeedMultiplier] = useState(0.5);
  const [nextUpdateTxt, setNextUpdateTxt] = useState('00:00');

  const timerRef = useRef(null);

  const MIN_TSTEP = 0;
  const MAX_TSTEP = (meta?.tstepCount ?? 239) - 1;
  const tstepCount = meta?.tstepCount ?? 239;
  const timeOptions = meta?.timeOptions ?? [];
  const bgPollOptions = meta?.bgPollOptions ?? [
    { value: 'CAI', title: 'CAI' },
    { value: 'PM10', title: 'PM10' },
    { value: 'PM2.5', title: 'PM2.5' },
    { value: 'O3', title: 'O3' },
    { value: 'SO2', title: 'SO2' },
    { value: 'NO2', title: 'NO2' },
    { value: 'CO', title: 'CO' },
    { value: 'WS', title: '풍속' },
    { value: 'TEMP', title: '온도' },
  ];

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

  const handleTstepChange = value => {
    setIsPlaying(false);
    updateSettings('tstep', value === '' ? null : Number(value));
  };

  const msUntilNextHour = () => {
    const now = new Date();
    const next = new Date(now);
    next.setMinutes(0, 0, 0);
    next.setHours(now.getHours() + 1);
    return next.getTime() - now.getTime();
  };

  const formatMMSS = totalSec => {
    const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const ss = String(totalSec % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  useEffect(() => {
    const tick = () => {
      const sec = Math.max(0, Math.ceil(msUntilNextHour() / 1000));
      setNextUpdateTxt(formatMMSS(sec));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!open)
    return (
      <PanelOpenBtn onClick={() => setOpen(true)}>
        모델링 결과 설정
      </PanelOpenBtn>
    );

  return (
    <Panel>
      {/* 상단 날짜 및 시간 표시 */}
      {datetime && (
        <DatetimeHeader>
          <div className="date-text">{datetime.displayDatetime}</div>
          <div className="sub-text">
            모델링시작시간: {datetime.fileStartDatetime}
          </div>
          <div className="sub-text">
            다음 업데이트까지 <span className="countdown">{nextUpdateTxt}</span>
          </div>
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
          className="nowtime-btn"
          onClick={() => {
            setIsPlaying(false);
            updateSettings('tstep', null);
          }}
        >
          <Clock size={14} />
          현재 시간
        </button>
        <button
          className="icon-btn"
          onClick={handleNextTstep}
          disabled={settings.tstep === MAX_TSTEP}
        >
          <ChevronRight size={16} />
        </button>
        <div className="extra-controls">
          <button
            className={`play-main-btn ${isPlaying ? 'playing' : ''}`}
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? (
              <>
                <Pause size={14} fill="currentColor" />
              </>
            ) : (
              <>
                <Play size={14} fill="currentColor" />
              </>
            )}
          </button>
          <SpeedSelect
            value={speedMultiplier}
            onChange={e => setSpeedMultiplier(Number(e.target.value))}
          >
            <option value={0.2}>0.2x</option>
            <option value={0.3}>0.3x</option>
            <option value={0.5}>0.5x</option>
          </SpeedSelect>
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
      {FEATURES.showLayerSelect && (
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
      )}
      {FEATURES.showTstepSelect && (
        <ControlRow>
          <span>TSTEP</span>
          <select
            value={settings.tstep ?? ''}
            onChange={e => {
              const v = e.target.value;
              updateSettings('tstep', v === '' ? null : Number(v));
            }}
          >
            {Array.from({ length: tstepCount }, (_, i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </ControlRow>
      )}
      <ControlRow>
        <span>시간</span>
        <select
          value={settings.tstep ?? ''}
          onChange={e => handleTstepChange(e.target.value)}
        >
          <option value="">현재 시간</option>
          {timeOptions.map(o => (
            <option key={o.tstep} value={o.tstep}>
              {o.label}
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
          {bgPollOptions.map(o => (
            <option key={o.value} value={o.value}>
              {o.title}
            </option>
          ))}
        </select>
      </ControlRow>
      <Divider />
      {/* 레이어 visible, 스타일(투명도, 색상) 설정 */}
      <LayerToggle
        label="모델링 농도장"
        checked={layerVisible.concPolygon}
        onChange={v => toggleLayer('concPolygon', v)}
      >
        {FEATURES.showPolygonModeSelect && (
          <SubRow>
            <span className="label-text">폴리곤 방식</span>
            <select
              value={settings.polygonMode}
              onChange={e => updateSettings('polygonMode', e.target.value)}
            >
              <option value="multi">멀티 폴리곤</option>
              <option value="single">단일 폴리곤(오버레이)</option>
              <option value="fixedSingle">단일 폴리곤(고정)</option>
            </select>
          </SubRow>
        )}
        <SubRow>
          <span className="label-text">오버레이 방식</span>
          <select
            value={settings.overlayMode}
            onChange={e => updateSettings('overlayMode', e.target.value)}
          >
            <option value="click">마우스 클릭</option>
            <option value="hover">마우스 무브</option>
            <option value="none">없음</option>
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
      </LayerToggle>

      {FEATURES.showModelingWindSection && (
        <SectionBox title="모델링 바람장">
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
          <LayerToggle
            label="바람장 화살표"
            checked={layerVisible.windArrows}
            onChange={v => toggleLayer('windArrows', v)}
          >
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
          </LayerToggle>

          <LayerToggle
            label="바람장 애니메이션"
            checked={layerVisible.windAnimation}
            onChange={v => toggleLayer('windAnimation', v)}
          >
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
            <SubRow>
              <span className="label-text">선 두께</span>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={style.windLineWidth ?? 1}
                onChange={e =>
                  updateStyle('windLineWidth', Number(e.target.value))
                }
              />
              <span className="value-text">
                {(style.windLineWidth ?? 1).toFixed(1)}x
              </span>
            </SubRow>
          </LayerToggle>
        </SectionBox>
      )}

      <SectionBox title="Earth">
        <LayerToggle
          label="바람장 earth"
          checked={layerVisible.earthWind}
          onChange={v => toggleLayer('earthWind', v)}
        >
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
          <SubRow>
            <span className="label-text">선 두께</span>
            <input
              type="range"
              min="0.5"
              max="4"
              step="0.1"
              value={style.earthWindLineWidth}
              onChange={e =>
                updateStyle('earthWindLineWidth', Number(e.target.value))
              }
            />
            <span className="value-text">
              {style.earthWindLineWidth.toFixed(1)}x
            </span>
          </SubRow>
        </LayerToggle>

        <LayerToggle
          label="농도장 earth"
          checked={layerVisible.earthScalar}
          onChange={v => toggleLayer('earthScalar', v)}
        >
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
        </LayerToggle>
      </SectionBox>

      {FEATURES.showWebglWindSection && (
        <LayerToggle
          label="바람장 WebGL"
          checked={layerVisible.webglWind}
          onChange={v => toggleLayer('webglWind', v)}
        >
          {/* <SubRow>
          <span className="label-text">선 두께</span>
          <input
            type="range"
            min="1"
            max="5"
            step="0.1"
            value={style.webglWindLineWidth}
            onChange={e =>
              updateStyle('webglWindLineWidth', Number(e.target.value))
            }
          />
          <span className="value-text">
            {style.webglWindLineWidth.toFixed(1)}x
          </span>
        </SubRow> */}
        </LayerToggle>
      )}

      {FEATURES.showEtcSection && (
        <SectionBox title="기타">
          <LayerToggle
            label="국가 경계"
            checked={layerVisible.shp}
            onChange={v => toggleLayer('shp', v)}
          >
            <SubRow>
              <span className="label-text">투명도</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={style.shpOpacity}
                onChange={e =>
                  updateStyle('shpOpacity', Number(e.target.value))
                }
              />
              <span className="value-text">
                {Math.round(style.shpOpacity * 100)}%
              </span>
            </SubRow>
            <SubRow>
              <span className="label-text">색상</span>
              <ColorPicker>
                <div style={{ backgroundColor: style.shpColor }} />
                <input
                  type="color"
                  value={style.shpColor}
                  onChange={e => updateStyle('shpColor', e.target.value)}
                />
              </ColorPicker>
            </SubRow>
          </LayerToggle>

          <LayerToggle
            label="격자"
            checked={layerVisible.grid}
            onChange={v => toggleLayer('grid', v)}
          />
        </SectionBox>
      )}

      <FoldBtn onClick={() => setOpen(false)}>접어두기</FoldBtn>
    </Panel>
  );
};

export default LccMapControlPanel;

const Panel = styled.div`
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 9999;

  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #e2e2e2;
  backdrop-filter: blur(4px);
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);

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
  z-index: 9999;

  width: 100px;
  height: 36px;

  font-size: 12px;
  font-weight: 500;
  line-height: 1.2;

  border: none;
  border-radius: 8px;
  background: #ffffff;

  cursor: pointer;
  transition: all 0.2s ease;

  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);

  &:hover {
    background: #f3f3f3;
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

  .sub-text {
    margin-top: 4px;
    font-size: 13px;
    color: #666;
    font-weight: 500;
  }

  .countdown {
    font-weight: 800;
    color: #212529;
    letter-spacing: 0.2px;
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
    width: 150px;
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
  border-radius: 6px;
  transition: background 0.2s ease;

  .main-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
  }

  // &:has(input:checked) {
  //   background: #f3f8ff;
  // }

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

  .nowtime-btn {
    flex: 1;
    height: 32px;
    padding: 0 12px;
    gap: 6px;

    background: #f1f3f5;
    color: #343a40;
    border: 1px solid #ced4da;

    font-size: 13px;
    font-weight: 700;

    white-space: nowrap;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .nowtime-btn:hover:not(:disabled) {
    background: #e9ecef;
    border-color: #adb5bd;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
    transform: translateY(-0.5px);
  }

  .nowtime-btn:active:not(:disabled) {
    transform: translateY(0);
  }

  .nowtime-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    box-shadow: none;
  }

  .nowtime-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgba(173, 181, 189, 0.35);
  }

  .play-main-btn {
    height: 32px;
    padding: 0 12px;
    gap: 8px;

    background: #3a86ff;
    color: #fff;
    border: 1px solid transparent;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

    white-space: nowrap;

    &:hover {
      background: #2575fc;
      border-color: transparent;
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

const SectionWrapper = styled.div`
  border-radius: 12px;
  padding: 14px;
  margin-top: 10px;

  background: #fafafa;
  border: 1px solid #d0d5dd;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.06);

  .section-title {
    font-weight: 700;
    font-size: 14px;
    margin-bottom: 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid #f0f0f0;
    color: #222;
  }

  .section-body {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
`;

const Divider = styled.div`
  margin: 14px 0 6px 0;
  height: 1px;
  background: linear-gradient(to right, transparent, #d0d5dd, transparent);
`;
