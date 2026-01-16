import styled from 'styled-components';

const UtmMapControlPanel = ({
  dateTime,
  setDateTime,
  layerVisible,
  setLayerVisible,
}) => {
  const formatLocalDate = date => {
    const yyyy = date.getFullYear();
    const MM = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${MM}-${dd}`;
  };

  return (
    <ToggleBox>
      <TimeBox>
        <button
          onClick={() =>
            setDateTime(d => new Date(d.getTime() - 60 * 60 * 1000))
          }
        >
          ◀
        </button>

        <input
          type="date"
          value={formatLocalDate(dateTime)}
          onChange={e => {
            const [y, m, d] = e.target.value.split('-');
            setDateTime(prev => {
              const n = new Date(prev);
              n.setFullYear(y, m - 1, d);
              return n;
            });
          }}
        />

        <select
          value={dateTime.getHours()}
          onChange={e =>
            setDateTime(prev => {
              const n = new Date(prev);
              n.setHours(Number(e.target.value));
              return n;
            })
          }
        >
          {Array.from({ length: 24 }, (_, i) => (
            <option key={i} value={i}>
              {String(i).padStart(2, '0')}
            </option>
          ))}
        </select>

        <button
          onClick={() =>
            setDateTime(d => new Date(d.getTime() + 60 * 60 * 1000))
          }
        >
          ▶
        </button>
      </TimeBox>
      <label>
        <input
          type="checkbox"
          checked={layerVisible.concImage}
          onChange={e =>
            setLayerVisible(v => ({ ...v, concImage: e.target.checked }))
          }
        />
        <span>등농도 이미지</span>
      </label>

      <label>
        <input
          type="checkbox"
          checked={layerVisible.windImage}
          onChange={e =>
            setLayerVisible(v => ({ ...v, windImage: e.target.checked }))
          }
        />
        <span>바람장 이미지</span>
      </label>

      <label>
        <input
          type="checkbox"
          checked={layerVisible.windAnimation}
          onChange={e =>
            setLayerVisible(v => ({
              ...v,
              windAnimation: e.target.checked,
            }))
          }
        />
        <span>바람 애니메이션</span>
      </label>
    </ToggleBox>
  );
};

export default UtmMapControlPanel;

const ToggleBox = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  background: rgba(255, 255, 255, 0.8);
  padding: 10px 12px;
  border-radius: 6px;
  z-index: 1000;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);

  label {
    font-size: 13px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
  }
`;
const TimeBox = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;

  button {
    padding: 2px 6px;
    cursor: pointer;
  }

  input,
  select {
    font-size: 12px;
    background: white;
    padding: 2px 4px;
    font-size: 13px;
    border: 1px solid lightgray;
  }
  select {
    padding: 3px 4px;
  }
`;
