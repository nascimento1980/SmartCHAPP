import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

const isNative = () => Capacitor.isNativePlatform()

const geolocate = async () => {
  if (isNative()) {
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 })
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude }
  }
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalização não suportada'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  })
}

const takePhoto = async () => {
  if (isNative()) {
    const photo = await Camera.getPhoto({ source: CameraSource.Camera, quality: 70, resultType: CameraResultType.DataUrl })
    return photo.dataUrl
  }
  // Web fallback: open file picker and return a data URL
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files && input.files[0]
      if (!file) return reject(new Error('Nenhuma imagem selecionada'))
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    }
    input.click()
  })
}

const saveBase64File = async (path, dataUrl) => {
  if (!isNative()) return null
  const base64 = (dataUrl || '').split(',')[1]
  await Filesystem.writeFile({ path, data: base64, directory: 'DATA' })
  return path
}

const shareLink = async (title, url, text) => {
  try {
    await Share.share({ title, url, text })
  } catch (_) {}
}

export default { isNative, geolocate, takePhoto, saveBase64File, shareLink }
