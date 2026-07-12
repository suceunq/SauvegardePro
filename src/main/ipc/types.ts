import type { BrowserWindow } from 'electron'
import type { JobsRepo } from '../db/jobsRepo'
import type { RunsRepo } from '../db/runsRepo'
import type { SettingsRepo } from '../db/settingsRepo'
import type { NetworkLocationsRepo } from '../db/networkLocationsRepo'
import type { BackupService } from '../app/backupService'
import type { GestionnaireMiseAJour } from '../updater'

export interface DependancesIpc {
  jobsRepo: JobsRepo
  runsRepo: RunsRepo
  settingsRepo: SettingsRepo
  networkLocationsRepo: NetworkLocationsRepo
  backupService: BackupService
  gestionnaireMiseAJour: GestionnaireMiseAJour
  fenetrePrincipale: () => BrowserWindow | null
}
