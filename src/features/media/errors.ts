import { Platform } from 'react-native';
import type { KeepsakeSelection } from './types';

export type KeepsakeStep =
  | 'pick'
  | 'decode'
  | 'orient'
  | 'resize'
  | 'strip-metadata'
  | 'thumbnail'
  | 'poster'
  | 'compress'
  | 'upload'
  | 'db-insert';

export type KeepsakeFailureCode =
  | 'KEEPSAKE_PICK_FAILED'
  | 'KEEPSAKE_DECODE_FAILED'
  | 'KEEPSAKE_ORIENT_FAILED'
  | 'KEEPSAKE_RESIZE_FAILED'
  | 'KEEPSAKE_STRIP_FAILED'
  | 'KEEPSAKE_THUMBNAIL_FAILED'
  | 'KEEPSAKE_POSTER_FAILED'
  | 'KEEPSAKE_COMPRESS_FAILED'
  | 'KEEPSAKE_UPLOAD_FAILED'
  | 'KEEPSAKE_DB_INSERT_FAILED';

export type KeepsakeFailureContext = {
  mimeType?: string | null;
  extension?: string | null;
  sizeBytes?: number | null;
  width?: number | null;
  height?: number | null;
  platform?: string;
};

const CODE_BY_STEP: Record<KeepsakeStep, KeepsakeFailureCode> = {
  pick: 'KEEPSAKE_PICK_FAILED',
  decode: 'KEEPSAKE_DECODE_FAILED',
  orient: 'KEEPSAKE_ORIENT_FAILED',
  resize: 'KEEPSAKE_RESIZE_FAILED',
  'strip-metadata': 'KEEPSAKE_STRIP_FAILED',
  thumbnail: 'KEEPSAKE_THUMBNAIL_FAILED',
  poster: 'KEEPSAKE_POSTER_FAILED',
  compress: 'KEEPSAKE_COMPRESS_FAILED',
  upload: 'KEEPSAKE_UPLOAD_FAILED',
  'db-insert': 'KEEPSAKE_DB_INSERT_FAILED',
};

export class KeepsakeMediaError extends Error {
  readonly code: KeepsakeFailureCode;
  readonly step: KeepsakeStep;
  readonly context: KeepsakeFailureContext;
  selection?: KeepsakeSelection;

  constructor(
    step: KeepsakeStep,
    message: string,
    context: KeepsakeFailureContext = {},
  ) {
    super(message);
    this.name = 'KeepsakeMediaError';
    this.code = CODE_BY_STEP[step];
    this.step = step;
    this.context = {
      ...context,
      platform: context.platform ?? getKeepsakePlatform(),
    };
  }
}

export function keepsakeError(
  step: KeepsakeStep,
  message: string,
  context: KeepsakeFailureContext = {},
  cause?: unknown,
): KeepsakeMediaError {
  if (cause instanceof KeepsakeMediaError) return cause;
  const error = new KeepsakeMediaError(step, message, context);
  logKeepsakeFailure(error);
  return error;
}

export function logKeepsakeFailure(error: KeepsakeMediaError): void {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[keepsake-media]', {
      code: error.code,
      step: error.step,
      ...error.context,
    });
  }
}

export function keepsakeErrorMessage(error: unknown): string {
  if (error instanceof KeepsakeMediaError) {
    return `${error.message} (${error.code})`;
  }
  return error instanceof Error
    ? error.message
    : 'Try a different photo or video.';
}

export function getKeepsakePlatform(): 'web' | 'ios' | 'android' {
  return Platform.OS === 'web' || Platform.OS === 'ios'
    ? Platform.OS
    : 'android';
}
