export async function captureFrontCameraPhoto(): Promise<string> {
  // Attempt real front camera capture via WebRTC
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      const video = document.createElement('video');
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;

      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          video.play();
          // Give brief 250ms delay for auto-exposure
          setTimeout(resolve, 250);
        };
      });

      const canvas = document.createElement('canvas');
      // Produce compact 320x240 image for fast upload and strict adherence to 50KB email payload limits
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Add security overlay watermark
        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = '#ef4444';
        ctx.fillText(`[SEC_CAM] ${new Date().toISOString()}`, 10, canvas.height - 10);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.55);

        // Stop all camera tracks
        stream.getTracks().forEach((track) => track.stop());
        return dataUrl;
      }

      stream.getTracks().forEach((track) => track.stop());
    } catch (err) {
      console.warn('Camera access not granted or unavailable, generating security placeholder frame:', err);
    }
  }

  // Fallback: Generate a high-contrast cyber surveillance silhouette frame
  return generateSurveillanceSilhouette();
}

export async function captureBackCameraPhoto(): Promise<string> {
  // Attempt real back camera capture via WebRTC
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
      const video = document.createElement('video');
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          video.play();
          setTimeout(resolve, 250);
        };
      });
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = '#ef4444';
        ctx.fillText(`[REAR_CAM] ${new Date().toISOString()}`, 10, canvas.height - 10);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.55);
        stream.getTracks().forEach((track) => track.stop());
        return dataUrl;
      }
      stream.getTracks().forEach((track) => track.stop());
    } catch (err) {
      console.warn('Back camera access not granted or unavailable, generating fallback:', err);
    }
  }
  return generateSurveillanceSilhouette();
}

function generateSurveillanceSilhouette(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Dark noise background
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Security scanlines
  ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
  for (let y = 0; y < canvas.height; y += 4) {
    ctx.fillRect(0, y, canvas.width, 2);
  }

  // Target reticle
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(85, 35, 150, 165);

  // Silhouette head and shoulders
  ctx.fillStyle = '#1e293b';
  // Head
  ctx.beginPath();
  ctx.arc(160, 95, 32, 0, Math.PI * 2);
  ctx.fill();
  // Body/Shoulders
  ctx.beginPath();
  ctx.ellipse(160, 175, 60, 45, 0, Math.PI, 0);
  ctx.fill();

  // Text HUD
  ctx.fillStyle = '#10b981';
  ctx.font = '10px monospace';
  ctx.fillText('INTRUDER_DETECTED', 15, 20);
  ctx.fillStyle = '#ef4444';
  ctx.fillText('SECURITY_ACTIVE', 15, 35);
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`TIME: ${new Date().toISOString().slice(11, 19)}`, 15, canvas.height - 12);

  return canvas.toDataURL('image/jpeg', 0.55);
}
