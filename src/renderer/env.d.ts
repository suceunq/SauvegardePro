/// <reference types="vite/client" />
import type { SauvegardeProAPI } from '../shared/ipc'

declare global {
  interface Window {
    sauvegardePro: SauvegardeProAPI
  }
}

export {}
