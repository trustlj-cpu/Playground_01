// Test environment: in-memory AsyncStorage and file system, no native audio / fonts.
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

jest.mock('expo-file-system', () => {
  const files = new Map();
  class Directory {
    constructor(...parts) {
      this.uri = parts.map((p) => (typeof p === 'string' ? p : p.uri)).join('/');
    }
    get exists() {
      return true;
    }
    create() {}
  }
  class File {
    constructor(...parts) {
      this.uri = parts.map((p) => (typeof p === 'string' ? p : p.uri)).join('/');
    }
    get exists() {
      return files.has(this.uri);
    }
    async text() {
      return files.get(this.uri);
    }
    write(t) {
      files.set(this.uri, t);
    }
    delete() {
      files.delete(this.uri);
    }
  }
  return { File, Directory, Paths: { document: new Directory('doc'), cache: new Directory('cache') }, __files: files };
});

jest.mock('expo-audio', () => ({
  createAudioPlayer: () => ({ play() {}, seekTo: async () => {}, remove() {}, volume: 1 }),
  setAudioModeAsync: async () => {},
}));

jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
