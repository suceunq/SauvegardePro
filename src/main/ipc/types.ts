import type { BrowserWindow } from 'electron'
import type { JobsRepo } from '../db/jobsRepo'
import type { RunsRepo } from '../db/runsRepo'
import type { SettingsRepo } from '../db/settingsRepo'
import type { NetworkLocationsRepo } from '../db/networkLocationsRepo'
import type { BackupService } from '../app/backupService'

export interface DependancesIpc {
  jobsRepo: JobsRepo
  runsRepo: RunsRepo
  settingsRepo: SettingsRepo
  networkLocationsRepo: NetworkLocationsRepo
  backupService: BackupService
  fenetrePrincipale: () => BrowserWindow | null
}
