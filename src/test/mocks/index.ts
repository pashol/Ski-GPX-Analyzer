export { geolocationMock, GeolocationMock, type MockPosition } from './geolocation';
export { foregroundServiceMock, ForegroundServiceMock, type ForegroundServiceOptions } from './foreground-service';
export { filesystemMock, FilesystemMock, Directory, Encoding } from './filesystem';
export { batteryMock, BatteryMock, type BatteryManagerMock } from './battery';
export { mockCapacitor } from './capacitor';

import { geolocationMock } from './geolocation';
import { foregroundServiceMock } from './foreground-service';
import { filesystemMock } from './filesystem';
import { batteryMock } from './battery';

export function resetAllMocks() {
  geolocationMock.reset();
  foregroundServiceMock.reset();
  filesystemMock.reset();
  batteryMock.reset();
}
