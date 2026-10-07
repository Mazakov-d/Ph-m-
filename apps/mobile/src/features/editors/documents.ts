import {
  EDITOR_DOCUMENT_MAX_BYTES,
  EDITOR_DOCUMENT_TYPES,
  EDITOR_DOCUMENTS_MAX_COUNT,
} from "@fama/shared";
import type { DocumentPickerAsset } from "expo-document-picker";
import { Platform } from "react-native";

export type PickedDocument = {
  name: string;
  uri: string;
  mimeType: string;
  size: number;
  // Web only: the browser File to upload.
  file?: File;
};

export function toPickedDocument(asset: DocumentPickerAsset): PickedDocument {
  return {
    name: asset.name,
    uri: asset.uri,
    mimeType: asset.mimeType ?? "application/octet-stream",
    size: asset.size ?? 0,
    file: asset.file,
  };
}

const ACCEPTED_TYPES: readonly string[] = EDITOR_DOCUMENT_TYPES;

/** First problem with the selection (French), or null. The API checks again. */
export function documentsProblem(documents: PickedDocument[]): string | null {
  if (documents.length === 0) {
    return "Ajoutez au moins un document d'identité.";
  }
  if (documents.length > EDITOR_DOCUMENTS_MAX_COUNT) {
    return `${EDITOR_DOCUMENTS_MAX_COUNT} documents maximum.`;
  }
  const wrongType = documents.find((document) => !ACCEPTED_TYPES.includes(document.mimeType));
  if (wrongType) {
    return `${wrongType.name} : seuls les fichiers PDF, JPEG et PNG sont acceptés.`;
  }
  const tooBig = documents.find((document) => document.size > EDITOR_DOCUMENT_MAX_BYTES);
  if (tooBig) {
    return `${tooBig.name} dépasse ${EDITOR_DOCUMENT_MAX_BYTES / (1024 * 1024)} Mo.`;
  }
  return null;
}

/**
 * The value FormData needs for a file: a File on the web; on iOS/Android, React Native
 * accepts a { uri, name, type } object that it reads from the device when uploading.
 */
export function toFormDataFile(document: PickedDocument): Blob {
  if (Platform.OS === "web" && document.file) {
    return document.file;
  }
  const nativeFile = { uri: document.uri, name: document.name, type: document.mimeType };
  // React Native's FormData accepts this object, which the DOM typings do not describe.
  return nativeFile as unknown as Blob;
}
