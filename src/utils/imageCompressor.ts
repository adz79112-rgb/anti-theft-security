/**
 * Helper to compress base64 images for lightweight transmission in email reports and alerts.
 */
export async function compressBase64Image(dataUrl: string, maxBytes: number = 28000): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image')) {
    return dataUrl;
  }

  // If already tiny, return as-is
  if (dataUrl.length <= maxBytes) {
    return dataUrl;
  }

  return new Promise<string>((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Scale down dimensions for fast lightweight transmission
        const maxDimension = 320;
        let width = img.width || 320;
        let height = img.height || 240;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl.slice(0, 1000));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Try descending qualities until size is < maxBytes
        const qualities = [0.65, 0.45, 0.3, 0.2];
        let result = canvas.toDataURL('image/jpeg', 0.5);

        for (const q of qualities) {
          result = canvas.toDataURL('image/jpeg', q);
          if (result.length < maxBytes) {
            break;
          }
        }

        resolve(result);
      };

      img.onerror = () => {
        resolve('');
      };

      img.src = dataUrl;
    } catch {
      resolve('');
    }
  });
}
