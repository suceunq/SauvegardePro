import { Notification } from 'electron'
import type { Notifications } from '@shared/types'

function notifier(titre: string, corps: string): void {
  if (!Notification.isSupported()) return
  new Notification({ title: titre, body: corps }).show()
}

export function notifierSucces(parametres: Notifications, nomJob: string): void {
  if (!parametres.surSucces) return
  notifier('Sauvegarde terminee', `La sauvegarde "${nomJob}" s'est terminee avec succes.`)
}

export function notifierEchec(parametres: Notifications, nomJob: string, message: string): void {
  if (!parametres.surEchec) return
  notifier('Echec de la sauvegarde', `La sauvegarde "${nomJob}" a echoue : ${message}`)
}

export function notifierAvertissement(parametres: Notifications, nomJob: string, message: string): void {
  if (!parametres.surAvertissement) return
  notifier('Avertissement', `Sauvegarde "${nomJob}" : ${message}`)
}
