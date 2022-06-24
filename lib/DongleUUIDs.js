import { Platform } from 'react-native';

export const DONGLE_UUIDS =
  Platform.OS === 'android'
    ? // ANDROID UUIDs
      {
        uuidDeviceInformation: '180a',
        uuidSystemId: '2a23',
        uuidModelNumber: '2a24',
        uuidDongleSerialNumber: '2a25',
        uuidFirmwareRevision: '2a26',
        uuidHardwareRevision: '2a27',
        uuidSoftwareRevision: '2a28',
        uuidManufacturerName: '2a29',
        uuidUartService: '49535343-fe7d-4ae5-8fa9-9fafd205e455',
        uuidRx: '49535343-1e4d-4bd9-ba61-23c647249616',
        uuidTx: '49535343-8841-43f4-a8d4-ecbe34729bb3',
        uuidUartControl: '49535343-4c8a-39b3-2f49-511cff073b7e',
        uuidControllerService: '6765ed1f-4de1-49e1-4771-a14380c90000',
        uuidProduct: '6765ed1f-4de1-49e1-4771-a14380c90003',
        uuidSerial: '6765ed1f-4de1-49e1-4771-a14380c90004',
        uuidFault: '6765ed1f-4de1-49e1-4771-a14380c90005',
        uuidStatus: [
          '6765ed1f-4de1-49e1-4771-a14380c90006',
          '6765ed1f-4de1-49e1-4771-a14380c90007',
          '6765ed1f-4de1-49e1-4771-a14380c90008',
          '6765ed1f-4de1-49e1-4771-a14380c90009',
          '6765ed1f-4de1-49e1-4771-a14380c9000a',
          '6765ed1f-4de1-49e1-4771-a14380c9000b',
          '6765ed1f-4de1-49e1-4771-a14380c9000c',
          '6765ed1f-4de1-49e1-4771-a14380c9000d',
          '6765ed1f-4de1-49e1-4771-a14380c9000e',
          '6765ed1f-4de1-49e1-4771-a14380c9000f',
        ],
        uuidSuperWatcher: '6765ed1f-4de1-49e1-4771-a14380c900ff',
      }
    : // IOS UUIDs
      {
        uuidDeviceInformation: '180A',
        uuidSystemId: '2A23',
        uuidModelNumber: '2A24',
        uuidDongleSerialNumber: '2A25',
        uuidFirmwareRevision: '2A26',
        uuidHardwareRevision: '2A27',
        uuidSoftwareRevision: '2A28',
        uuidManufacturerName: '2A29',
        uuidUartService: '49535343-FE7D-4AE5-8FA9-9FAFD205E455',
        uuidRx: '49535343-1E4D-4BD9-BA61-23C647249616',
        uuidTx: '49535343-8841-43F4-A8D4-ECBE34729BB3',
        uuidUartControl: '49535343-4C8A-39B3-2F49-511CFF073B7E',
        uuidControllerService: '6765ED1F-4DE1-49E1-4771-A14380C90000',
        uuidProduct: '6765ED1F-4DE1-49E1-4771-A14380C90003',
        uuidSerial: '6765ED1F-4DE1-49E1-4771-A14380C90004',
        uuidFault: '6765ED1F-4DE1-49E1-4771-A14380C90005',
        uuidStatus: [
          '6765ED1F-4DE1-49E1-4771-A14380C90006',
          '6765ED1F-4DE1-49E1-4771-A14380C90007',
          '6765ED1F-4DE1-49E1-4771-A14380C90008',
          '6765ED1F-4DE1-49E1-4771-A14380C90009',
          '6765ED1F-4DE1-49E1-4771-A14380C9000A',
          '6765ED1F-4DE1-49E1-4771-A14380C9000B',
          '6765ED1F-4DE1-49E1-4771-A14380C9000C',
          '6765ED1F-4DE1-49E1-4771-A14380C9000D',
          '6765ED1F-4DE1-49E1-4771-A14380C9000E',
          '6765ED1F-4DE1-49E1-4771-A14380C9000F',
        ],
        uuidSuperWatcher: '6765ED1F-4DE1-49E1-4771-A14380C900FF'
      };
