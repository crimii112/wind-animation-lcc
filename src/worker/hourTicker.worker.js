function msUntilNextHour() {
  const now = new Date();
  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  next.setHours(now.getHours() + 1);
  return next.getTime() - now.getTime();
}

let timerId = null;

function scheduleNext() {
  clearTimeout(timerId);
  timerId = setTimeout(() => {
    postMessage({ type: 'TOP_OF_HOUR' });
    scheduleNext();
  }, msUntilNextHour());
}

onmessage = e => {
  const type = e.data?.type;
  if (type === 'START' || type === 'RESCHEDULE') {
    scheduleNext();
  } else if (type === 'STOP') {
    clearTimeout(timerId);
    timerId = null;
  }
};
