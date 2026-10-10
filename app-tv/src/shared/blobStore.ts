// Web storage for cached API JSON (localStorage via AsyncStorage). Native builds use blobStore.native.ts (files).
import AsyncStorage from '@react-native-async-storage/async-storage';

const P = 'dd.tv.blob:';
export const blobGet = (k: string) => AsyncStorage.getItem(P + k);
export const blobSet = (k: string, v: string) => AsyncStorage.setItem(P + k, v);
export const blobDel = (k: string) => AsyncStorage.removeItem(P + k);
