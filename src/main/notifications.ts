import { Notification } from 'electron'
import type { Notifications } from '@shared/types'
import { tMain } from './i18n'

function notifier(titre: string, corps: string): void {
  if (!Notification.isSupported()) return
  new Notification({ title: titre, body: corps }).show()
}

export function notifierSucces(parametres: Notifications, nomJob: string): void {
  if (!parametres.surSucces) return
  notifier(tMain('main.notificationSuccessTitle'), tMain('main.notificationSuccessBody', { name: nomJob }))
}

export function notifierEchec(parametres: Notifications, nomJob: string, message: string): void {
  if (!parametres.surEchec) return
  notifier(tMain('main.notificationFailureTitle'), tMain('main.notificationFailureBody', { name: nomJob, message }))
}

export function notifierAvertissement(parametres: Notifications, nomJob: string, message: string): void {
  if (!parametres.surAvertissement) return
  notifier(tMain('main.notificationWarningTitle'), tMain('main.notificationWarningBody', { name: nomJob, message }))
}
