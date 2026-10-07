import { Platform } from "react-native";

/** A file chosen on the device (document or image). */
export type LocalFile = {
  name: string;
  uri: string;
  mimeType: string;
  size: number;
  // Web only: the browser File to upload.
  file?: File;
};

/**
 * The value FormData needs for a file: a File on the web; on iOS/Android, React Native
 * accepts a { uri, name, type } object that it reads from the device when uploading.
 */
export function toFormDataFile(file: LocalFile): Blob {
  if (Platform.OS === "web" && file.file) {
    return file.file;
  }
  const nativeFile = { uri: file.uri, name: file.name, type: file.mimeType };
  // React Native's FormData accepts this object, which the DOM typings do not describe.
  return nativeFile as unknown as Blob;
}
