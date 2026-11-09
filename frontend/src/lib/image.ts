import imageCompression from "browser-image-compression";

const MAX_DIMENSION_PX = 1600;
const TARGET_MAX_SIZE_MB = 1.4;

/**
 * Kompres foto di sisi client sebelum diunggah ke server.
 * Maksimal panjang sisi 1600 px dan target ukuran di bawah 1.5 MB.
 */
export async function compressImage(file: File): Promise<File> {
  if (typeof window === "undefined") {
    return file;
  }

  // Jika ukuran sudah kecil (< 800 KB), tetap pastikan dimensi <= 1600 px
  try {
    const compressedBlob = await imageCompression(file, {
      maxSizeMB: TARGET_MAX_SIZE_MB,
      maxWidthOrHeight: MAX_DIMENSION_PX,
      useWebWorker: true,
      initialQuality: 0.82,
    });

    if (compressedBlob instanceof File && compressedBlob.name === file.name) {
      return compressedBlob;
    }

    return new File([compressedBlob], file.name, {
      type: compressedBlob.type || file.type || "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    // Fallback ke file asli apabila kompresi di browser gagal
    return file;
  }
}
