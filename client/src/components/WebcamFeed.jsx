import { useEffect, useRef } from 'react';

function WebcamFeed({ onFrameReady }) {
  const videoRef = useRef(null);

  useEffect(() => {
    let stream;

    const boot = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          if (onFrameReady) {
            onFrameReady(videoRef);
          }
        }
      } catch (error) {
        console.error('Webcam error', error);
      }
    };

    boot();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [onFrameReady]);

  return (
    <div className="glass-card p-3">
      <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full rounded-xl bg-slate-900 object-cover" />
    </div>
  );
}

export default WebcamFeed;
