/** Shrink photos in the browser before they go anywhere — the data layer uploads them to Storage. */
export function readResizedPhotos(files: FileList | File[], max = 1280, quality = 0.75): Promise<string[]> {
  const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
  return Promise.all(list.map((file) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the photo'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not open the photo'));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement('canvas');
        cv.width = Math.round(img.width * scale); cv.height = Math.round(img.height * scale);
        const ctx = cv.getContext('2d');
        if (!ctx) { reject(new Error('Canvas unavailable')); return; }
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        resolve(cv.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  })));
}
