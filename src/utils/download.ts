/**
 * Utility to download images safely from Supabase storage, Blob URLs, or external CDNs.
 */
export async function downloadImage(url: string, filename?: string): Promise<void> {
  if (!url) return;

  const sanitizedFilename = (filename || 'akra-photo')
    .replace(/[/\\?%*:|"<>]/g, '-')
    .trim();
  
  const finalFilename = /\.(jpe?g|png|webp|gif)$/i.test(sanitizedFilename)
    ? sanitizedFilename
    : `${sanitizedFilename}.jpg`;

  try {
    // 1. If it's already a blob or data URL, download directly
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      const a = document.createElement('a');
      a.href = url;
      a.download = finalFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // 2. Try fetching as blob to trigger true file download dialog
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`Fetch failed with status ${res.status}`);
    const blob = await res.blob();
    const objectUrl = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = finalFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(objectUrl);
  } catch (err) {
    // 3. Fallback: Draw onto an off-screen HTML Image + Canvas if CORS permits, or open download link
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = url;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Image load failed'));
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const objectUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = objectUrl;
            a.download = finalFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(objectUrl);
          } else {
            fallbackDirectLink(url, finalFilename);
          }
        }, 'image/jpeg', 0.95);
        return;
      }
    } catch {
      // Fallback
    }

    fallbackDirectLink(url, finalFilename);
  }
}

function fallbackDirectLink(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
