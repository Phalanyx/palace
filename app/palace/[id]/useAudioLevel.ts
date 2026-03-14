import { useEffect, useRef, useState } from 'react';

export function useAudioLevel(analyser: AnalyserNode | null): number {
  const [level, setLevel] = useState(0);
  const rafRef = useRef<number>(0);
  const smoothedRef = useRef(0);

  useEffect(() => {
    if (!analyser) {
      smoothedRef.current = 0;
      setLevel(0);
      return;
    }

    const dataArray = new Uint8Array(analyser.fftSize);

    function tick() {
      analyser!.getByteTimeDomainData(dataArray);

      // Compute RMS
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const sample = (dataArray[i] - 128) / 128;
        sum += sample * sample;
      }
      const rms = Math.sqrt(sum / dataArray.length);

      // Normalize (typical mic RMS rarely exceeds 0.5)
      const normalized = Math.min(rms / 0.5, 1);

      // Exponential smoothing
      const prev = smoothedRef.current;
      const smoothed = normalized > prev
        ? prev * 0.5 + normalized * 0.5    // fast attack
        : prev * 0.85 + normalized * 0.15;  // slow decay
      smoothedRef.current = smoothed;

      setLevel(smoothed);
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser]);

  return level;
}
