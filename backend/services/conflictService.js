function toDate(d){ return d instanceof Date ? d : new Date(d); }
function overlaps(aStart,aEnd,bStart,bEnd){ return aStart < bEnd && bStart < aEnd; }
function applyBufferInterval(startISO,endISO,bufferMinutes){
  const s=toDate(startISO), e=toDate(endISO), buf=bufferMinutes*60*1000;
  return { start:new Date(s.getTime()-buf), end:new Date(e.getTime()+buf) };
}

function detectConflicts(proposedEvent, existingEvents=[], bufferMinutes=15){
  const pInterval = applyBufferInterval(proposedEvent.start, proposedEvent.end, bufferMinutes);
  const index = new Map();
  for(const ev of existingEvents){
    for(const p of ev.participants||[]){
      if(!index.has(p)) index.set(p, []);
      index.get(p).push(ev);
    }
  }
  const result = [];
  for(const participant of proposedEvent.participants||[]){
    const evs = index.get(participant) || [];
    const conflicts = evs.filter(ev => {
      const eInt = applyBufferInterval(ev.start, ev.end, bufferMinutes);
      return overlaps(pInterval.start, pInterval.end, eInt.start, eInt.end);
    });
    if(conflicts.length) result.push({ participant, conflictingEvents: conflicts });
  }
  return result;
}

function suggestTimes(proposedEvent, existingEvents=[], opts={}){
  const bufferMinutes = opts.bufferMinutes ?? 15;
  const workingHours = opts.workingHours ?? { start: "09:00", end: "17:00" };
  const maxSuggestions = opts.maxSuggestions ?? 3;
  const durationMs = toDate(proposedEvent.end) - toDate(proposedEvent.start);
  if(durationMs <= 0) return [];
  const stepMinutes = Math.max(5, Math.min(15, bufferMinutes));
  const suggestions = [];

  const origStart = toDate(proposedEvent.start);
  const getDayWindow = (date) => {
    const [sh, sm] = workingHours.start.split(':').map(Number);
    const [eh, em] = workingHours.end.split(':').map(Number);
    const dayStart = new Date(date); dayStart.setHours(sh, sm, 0, 0);
    const dayEnd = new Date(date); dayEnd.setHours(eh, em, 0, 0);
    return { dayStart, dayEnd };
  };

  const hasConflict = (candidateStart) => {
    const candidateEnd = new Date(candidateStart.getTime() + durationMs);
    const interval = applyBufferInterval(candidateStart.toISOString(), candidateEnd.toISOString(), bufferMinutes);
    for(const participant of proposedEvent.participants||[]){
      for(const ev of existingEvents){
        if(!(ev.participants||[]).includes(participant)) continue;
        const evInterval = applyBufferInterval(ev.start, ev.end, bufferMinutes);
        if(overlaps(interval.start, interval.end, evInterval.start, evInterval.end)) return true;
      }
    }
    return false;
  };

  const maxOffsets = Math.ceil((24*60)/stepMinutes);
  const offsets = [];
  for(let i=0;i<=maxOffsets;i++){ if(i===0) offsets.push(0); else { offsets.push(i); offsets.push(-i); } }

  for(let day=0; day<3 && suggestions.length<maxSuggestions; day++){
    for(const off of offsets){
      if(suggestions.length>=maxSuggestions) break;
      const candidateStart = new Date(origStart.getTime() + off*stepMinutes*60000 + day*24*60*60000);
      const candidateEnd = new Date(candidateStart.getTime() + durationMs);
      const { dayStart, dayEnd } = getDayWindow(candidateStart);
      if(!(candidateStart>=dayStart && candidateEnd<=dayEnd)) continue;
      if(candidateStart < new Date()) continue;
      if(day===0 && off===0) continue;
      if(!hasConflict(candidateStart)) suggestions.push({ start: candidateStart.toISOString(), end: candidateEnd.toISOString() });
    }
  }

  let expandDay = 3;
  while(suggestions.length<maxSuggestions && expandDay<7){
    const startOfDay = new Date(origStart); startOfDay.setDate(startOfDay.getDate()+expandDay);
    const { dayStart, dayEnd } = getDayWindow(startOfDay);
    let cur = new Date(dayStart);
    while(cur.getTime() + durationMs <= dayEnd.getTime() && suggestions.length<maxSuggestions){
      if(!hasConflict(cur)) suggestions.push({ start: cur.toISOString(), end: new Date(cur.getTime()+durationMs).toISOString() });
      cur = new Date(cur.getTime() + stepMinutes*60000);
    }
    expandDay++;
  }

  return suggestions.slice(0,maxSuggestions);
}

module.exports = { detectConflicts, suggestTimes };
