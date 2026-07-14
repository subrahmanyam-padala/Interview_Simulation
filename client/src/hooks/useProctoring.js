import { useCallback, useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';

// ─── Tuning constants ────────────────────────────────────────────────────────
const DETECTION_INTERVAL_MS = 800;          // how often we run faceapi
const NO_FACE_GRACE_MS = 2500;              // time before "no face" fires
const MULTI_FACE_GRACE_MS = 1500;           // time before "multiple faces" fires
const LOOK_AWAY_THRESHOLD = 0.35;           // nose-vs-eye horizontal ratio
const LOOK_AWAY_GRACE_MS = 2000;            // time before "looking away" fires
const EYE_OPEN_THRESHOLD = 0.18;            // eye aspect ratio below = closed
const LONG_CLOSURE_MS = 3000;              // time eyes must be closed
const WARNING_COOLDOWN_MS = 8000;           // min gap between same violation type

// ─── Helpers ─────────────────────────────────────────────────────────────────
const dist = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

const eyeAspectRatio = (points) => {
  // vertical distances / horizontal distance
  const v1 = dist(points[1], points[5]);
  const v2 = dist(points[2], points[4]);
  const h = dist(points[0], points[3]);
  return h === 0 ? 1 : (v1 + v2) / (2 * h);
};

// ─── Main hook ───────────────────────────────────────────────────────────────
export const useProctoring = ({ videoRef, interviewId, onViolation, enabled = true }) => {
  const [violations, setViolations] = useState([]);
  const [activeWarning, setActiveWarning] = useState(null); // currently displayed banner
  const [modelsReady, setModelsReady] = useState(false);

  // Internal tracking refs (don't need re-renders)
  const frameLoopRef = useRef(null);
  const lastViolationTime = useRef({}); // { type: timestamp }
  const noFaceStartRef = useRef(null);
  const multiFaceStartRef = useRef(null);
  const lookAwayStartRef = useRef(null);
  const eyeClosedStartRef = useRef(null);
  const warningTimerRef = useRef(null);
  const logFnRef = useRef(null);

  // Keep logFnRef in sync so the frame loop closure doesn't go stale
  useEffect(() => {
    logFnRef.current = onViolation;
  }, [onViolation]);

  // ── Load face-api models (reuse if already loaded) ───────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        // nets may already be loaded by useFaceAnalysis – guard with .params check
        const loaded = (net) => net.params !== undefined;
        if (!loaded(faceapi.nets.tinyFaceDetector)) {
          await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        }
        if (!loaded(faceapi.nets.faceLandmark68Net)) {
          await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        }
        if (!loaded(faceapi.nets.faceExpressionNet)) {
          await faceapi.nets.faceExpressionNet.loadFromUri('/models');
        }
        if (!cancelled) setModelsReady(true);
      } catch (e) {
        console.warn('[useProctoring] Model load failed:', e);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // ── Core violation emitter ────────────────────────────────────────────────
  const emitViolation = useCallback((type, message) => {
    const now = Date.now();
    const last = lastViolationTime.current[type] || 0;
    if (now - last < WARNING_COOLDOWN_MS) return; // cooldown

    lastViolationTime.current[type] = now;
    const violation = { type, message, timestamp: new Date().toISOString() };

    // Update local list
    setViolations((prev) => [violation, ...prev]);

    // Show banner for 4 s
    setActiveWarning(violation);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    warningTimerRef.current = setTimeout(() => setActiveWarning(null), 4000);

    // Fire caller callback (used to persist to server)
    if (logFnRef.current) logFnRef.current(violation);
  }, []);

  // ── Face-detection frame loop ─────────────────────────────────────────────
  useEffect(() => {
    if (!modelsReady || !enabled) return;

    const detect = async () => {
      const video = videoRef?.current;
      if (!video || video.readyState < 2) {
        frameLoopRef.current = setTimeout(detect, DETECTION_INTERVAL_MS);
        return;
      }

      try {
        const results = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks();

        const now = Date.now();

        if (results.length === 0) {
          // ── No face ──────────────────────────────────────────────────
          if (!noFaceStartRef.current) noFaceStartRef.current = now;
          multiFaceStartRef.current = null;
          lookAwayStartRef.current = null;
          eyeClosedStartRef.current = null;

          if (now - noFaceStartRef.current >= NO_FACE_GRACE_MS) {
            emitViolation('no_face', '⚠ No Face Detected – please stay visible in the camera.');
          }
        } else if (results.length > 1) {
          // ── Multiple faces ───────────────────────────────────────────
          noFaceStartRef.current = null;
          if (!multiFaceStartRef.current) multiFaceStartRef.current = now;
          lookAwayStartRef.current = null;
          eyeClosedStartRef.current = null;

          if (now - multiFaceStartRef.current >= MULTI_FACE_GRACE_MS) {
            emitViolation('multiple_faces', `⚠ Multiple Faces Detected (${results.length}) – only you should be visible.`);
          }
        } else {
          // ── Single face ──────────────────────────────────────────────
          noFaceStartRef.current = null;
          multiFaceStartRef.current = null;

          const lm = results[0].landmarks;
          const leftEye = lm.getLeftEye();   // 6 points
          const rightEye = lm.getRightEye(); // 6 points
          const nose = lm.getNose();

          // Looking away: compare eye-center-X vs nose-center-X
          const eyePoints = [...leftEye, ...rightEye];
          const eyeCX = eyePoints.reduce((s, p) => s + p.x, 0) / eyePoints.length;
          const noseCX = nose.reduce((s, p) => s + p.x, 0) / nose.length;
          const faceW = results[0].detection.box.width;
          const ratio = faceW > 0 ? Math.abs(eyeCX - noseCX) / faceW : 0;

          if (ratio > LOOK_AWAY_THRESHOLD) {
            if (!lookAwayStartRef.current) lookAwayStartRef.current = now;
            if (now - lookAwayStartRef.current >= LOOK_AWAY_GRACE_MS) {
              emitViolation('looking_away', '⚠ Looking Away – please focus on the screen.');
            }
          } else {
            lookAwayStartRef.current = null;
          }

          // Long eye closure: eye aspect ratio
          const leftEAR = eyeAspectRatio(leftEye);
          const rightEAR = eyeAspectRatio(rightEye);
          const avgEAR = (leftEAR + rightEAR) / 2;

          if (avgEAR < EYE_OPEN_THRESHOLD) {
            if (!eyeClosedStartRef.current) eyeClosedStartRef.current = now;
            if (now - eyeClosedStartRef.current >= LONG_CLOSURE_MS) {
              emitViolation('long_eye_closure', '⚠ Long Eye Closure – eyes must remain open during the interview.');
            }
          } else {
            eyeClosedStartRef.current = null;
          }
        }
      } catch (_) {
        // silently skip detection errors
      }

      frameLoopRef.current = setTimeout(detect, DETECTION_INTERVAL_MS);
    };

    detect();

    return () => {
      if (frameLoopRef.current) clearTimeout(frameLoopRef.current);
    };
  }, [modelsReady, enabled, videoRef, emitViolation]);

  // ── Browser / tab focus events ────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    const onVisibilityChange = () => {
      if (document.hidden) {
        emitViolation('tab_switch', '⚠ Switched Tabs – please remain on the interview page.');
      }
    };

    const onWindowBlur = () => {
      emitViolation('window_blur', '⚠ Window Lost Focus – please keep the interview window active.');
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onWindowBlur);
    };
  }, [enabled, emitViolation]);

  // ── Copy / paste detection ────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    const onCopy = () => emitViolation('copy_paste', '⚠ Copy Detected – copying content is not allowed.');
    const onPaste = () => emitViolation('copy_paste', '⚠ Paste Detected – pasting content is not allowed.');
    const onCut = () => emitViolation('copy_paste', '⚠ Cut Detected – cutting content is not allowed.');

    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);
    document.addEventListener('cut', onCut);

    return () => {
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('cut', onCut);
    };
  }, [enabled, emitViolation]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (frameLoopRef.current) clearTimeout(frameLoopRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, []);

  return {
    violations,         // full list for report
    activeWarning,      // currently displayed warning { type, message, timestamp }
    modelsReady,
  };
};
