import { useContext, useState } from 'react';
import styled from 'styled-components';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { LccContext } from '@/components/lcc/LccContext';

const MIN_TSTEP = 0;
const MAX_TSTEP = 238;

const LccMapControlPanel = ({ datetime }) => {
  const {
    settings,
    updateSettings,
    style,
    updateStyle,
    layerVisible,
    toggleLayer,
  } = useContext(LccContext);
  const [open, setOpen] = useState(true);

  const handlePrevTstep = () => {
    updateSettings('tstep', Math.max(MIN_TSTEP, settings.tstep - 1));
  };

  const handleNextTstep = () => {
    updateSettings('tstep', Math.min(MAX_TSTEP, settings.tstep + 1));
  };

  if (!open)
    return <PanelOpenBtn onClick={() => setOpen(true)}>지도 설정</PanelOpenBtn>;

  return (
    <Panel>
      {datetime && (
        <DatetimeHeader>
          <button
            className="icon-btn"
            onClick={handlePrevTstep}
            disabled={settings.tstep === MIN_TSTEP}
          >
            <ChevronLeft size={15} />
          </button>
          {datetime}
          <button
            className="icon-btn"
            onClick={handleNextTstep}
            disabled={settings.tstep === MAX_TSTEP}
          >
            <ChevronRight size={15} />
          </button>
        </DatetimeHeader>
      )}
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
          <option value="O3">O3</option>
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
      <ControlGroup>
        <label className="main-label">
          <input
            type="checkbox"
            checked={layerVisible.coords}
            onChange={e => toggleLayer('coords', e.target.checked)}
          />
          <span>모델링 농도</span>
        </label>

        {layerVisible.coords && (
          <div className="sub-container">
            <SubRow>
              <span className="label-text">투명도</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={style.coordsOpacity}
                onChange={e =>
                  updateStyle('coordsOpacity', Number(e.target.value))
                }
              />
              <span className="value-text">
                {Math.round(style.coordsOpacity * 100)}%
              </span>
            </SubRow>
          </div>
        )}
      </ControlGroup>
      <ControlGroup>
        <label className="main-label">
          <input
            type="checkbox"
            checked={layerVisible.arrows}
            onChange={e => toggleLayer('arrows', e.target.checked)}
          />
          <span>바람 화살표</span>
        </label>
        {layerVisible.arrows && (
          <div className="sub-container">
            <SubRow>
              <span className="label-text">투명도</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={style.arrowsOpacity}
                onChange={e =>
                  updateStyle('arrowsOpacity', Number(e.target.value))
                }
              />
              <span className="value-text">
                {Math.round(style.arrowsOpacity * 100)}%
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
          <span>바람 애니메이션</span>
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
      <FoldBtn onClick={() => setOpen(false)}>접어두기</FoldBtn>
    </Panel>
  );
};

export default LccMapControlPanel;

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
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 10px;
  margin-bottom: 4px;
  border-bottom: 1px solid #eee;
  font-weight: 600;
  font-size: 15px;

  .icon-btn {
    display: flex;
    align-items: center;
    padding: 4px;
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: 4px;
    transition: background 0.2s;

    &:hover:not(:disabled) {
      background: #f0f0f0;
    }
    &:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
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
  color: #777;

  .label-text {
    min-width: 35px;
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
