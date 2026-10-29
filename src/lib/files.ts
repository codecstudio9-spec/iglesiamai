/**
 * File storage for announcement images and payment receipts (Supabase Storage).
 *
 * A file id is "<bucket>/<path>":
 *   anuncios     → public bucket, images load straight from the CDN
 *   comprobantes → private bucket, only signed-in staff get a short-lived link
 */
import { supabase } from "./supabase"

export type Bucket = "anuncios" | "comprobantes"

const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "application/pdf": "pdf" }

function split(id: string) {
  const slash = id.indexOf("/")
  return { bucket: id.slice(0, slash) as Bucket, path: id.slice(slash + 1) }
}

export async function putFile(blob: Blob, bucket: Bucket) {
  const path = `${crypto.randomUUID?.() ?? Date.now()}.${extensions[blob.type] ?? "bin"}`
  const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType: blob.type, upsert: false })
  if (error) throw error
  return `${bucket}/${path}`
}

const urlCache = new Map<string, string>()

export async function getFileUrl(id: string) {
  const cached = urlCache.get(id)
  if (cached) return cached
  const { bucket, path } = split(id)
  if (bucket === "anuncios") return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60)
  if (!data) return null
  urlCache.set(id, data.signedUrl)
  return data.signedUrl
}

export async function getFileType(id: string) {
  return id.endsWith(".pdf") ? "application/pdf" : "image/"
}

export async function deleteFile(id: string) {
  urlCache.delete(id)
  const { bucket, path } = split(id)
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) throw error
}

/** Shrinks large photos before storing them (keeps PDFs and small files as-is). */
export async function compressImage(file: File, maxSide = 1600, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  if (scale === 1 && file.size < 900_000) return file
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", quality),
  )
}

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024
