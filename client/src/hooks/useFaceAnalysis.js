import { useEffect, useMemo, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));

const computeMetrics = (result) => {
  if (!result) {
    return {
      eyeContactScore: 45,
      confidenceScore: 50,
      expressionStability: 55,
      averageSmileIntensity: 20,
    };
  }

  const { landmarks, expressions } = result;
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();
  const nose = landmarks.getNose();

  const eyeCenterX =
    [...leftEye, ...rightEye].reduce((acc, point) => acc + point.x, 0) / (leftEye.length + rightEye.length);
  const noseCenterX = nose.reduce((acc, point) => acc + point.x, 0) / nose.length;

  const eyeOffset = Math.abs(eyeCenterX - noseCenterX);
  const eyeContactScore = clamp(100 - eyeOffset * 1.2);

  const smile = expressions?.happy ? expressions.happy * 100 : 10;
  const neutral = expressions?.neutral ? expressions.neutral * 100 : 40;
  const expressionStability = clamp(neutral + (100 - Math.abs(50 - smile)) * 0.4);
  const confidenceScore = clamp(eyeContactScore * 0.65 + expressionStability * 0.35);

  return {
    eyeContactScore,
    confidenceScore,
    expressionStability,
    averageSmileIntensity: clamp(smile),
  };
};

export const useFaceAnalysis = (videoRef) => {
  const [modelState, setModelState] = useState('idle');
  const [faceStatus, setFaceStatus] = useState('Face Recognition Active'); // UI specific status string
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [metrics, setMetrics] = useState({
    eyeContactScore: 45,
    confidenceScore: 50,
    expressionStability: 55,
    averageSmileIntensity: 20,
  });
  const [error, setError] = useState('');

  const streamRef = useRef(null);
  const frameLoopRef = useRef(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        console.log('[FaceRecognition] Loading models from official CDN...');
        const modelPath = 'https://justadudewhohacks.github.io/face-api.js/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
          faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
          faceapi.nets.faceExpressionNet.loadFromUri(modelPath),
        ]);
        console.log('[FaceRecognition] Models loaded successfully.');
        setModelState('ready');
      } catch (modelError) {
        console.error('[FaceRecognition] Model loading failed:', modelError);
        setModelState('fallback');
        setError('Face model files not found in /public/models. Facial analysis runs in fallback mode.');
        console.error(modelError);
      }
    };

    loadModels();
  }, []);

  useEffect(() => {
    if (modelState !== 'ready' || !streamRef.current || !videoRef.current) {
      return;
    }

    const detect = async () => {
      if (!videoRef.current || !streamRef.current) {
        return;
      }

      try {
        const detections = await faceapi
          .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceExpressions();

        if (detections.length === 0) {
          if (faceStatus !== 'No Face Detected') console.log('[FaceRecognition] No face detected.');
          setFaceStatus('No Face Detected');
          setIsFaceDetected(false);
        } else if (detections.length > 1) {
          if (faceStatus !== 'Multiple Faces Detected') console.log('[FaceRecognition] Multiple faces detected.');
          setFaceStatus('Multiple Faces Detected');
          setIsFaceDetected(false);
        } else {
          if (faceStatus !== 'Face Detected') console.log('[FaceRecognition] Face detected. Tracking metrics.');
          setFaceStatus('Face Detected');
          setIsFaceDetected(true);
          setMetrics(computeMetrics(detections[0]));
        }
      } catch (detectError) {
        console.error(detectError);
        setFaceStatus('Face Not Found');
        setIsFaceDetected(false);
      }

      frameLoopRef.current = window.setTimeout(detect, 200);
    };

    detect();

    return () => {
      if (frameLoopRef.current) {
        clearTimeout(frameLoopRef.current);
        frameLoopRef.current = null;
      }
    };
  }, [modelState, videoRef]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setFaceStatus('Live Camera');
      return true;
    } catch (_error) {
      setError('Camera permission denied or unavailable.');
      setFaceStatus('Camera Error');
      return false;
    }
  };

  const stopCamera = () => {
    if (frameLoopRef.current) {
      clearTimeout(frameLoopRef.current);
      frameLoopRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setFaceStatus('Camera Stopped');
    setIsFaceDetected(false);
  };

  const status = useMemo(() => {
    if (modelState === 'ready') {
      return 'Facial AI active';
    }
    if (modelState === 'loading') {
      return 'Loading facial AI models';
    }
    if (modelState === 'fallback') {
      return 'Fallback facial scoring';
    }
    return 'Idle';
  }, [modelState]);

  return {
    status,
    faceStatus,
    isFaceDetected,
    metrics,
    error,
    startCamera,
    stopCamera,
  };
};
