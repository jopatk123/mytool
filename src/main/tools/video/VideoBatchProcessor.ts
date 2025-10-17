import type {
    VideoBatchRequest,
    VideoBatchResult,
    VideoConvertRequest,
    VideoFrameExtractRequest,
    VideoTrimRequest,
} from '@shared/types/video';
import { createLogger } from '../../../shared/utils/logger';
import { VideoFrameExtractor } from './VideoFrameExtractor';
import { VideoTranscoder } from './VideoTranscoder';
import { VideoTrimmer } from './VideoTrimmer';

const logger = createLogger('VideoBatchProcessor');

/**
 * 视频批量处理器
 * 用于批量处理多个视频文件
 */
export class VideoBatchProcessor {
  private readonly transcoder: VideoTranscoder;
  private readonly trimmer: VideoTrimmer;
  private readonly frameExtractor: VideoFrameExtractor;

  constructor() {
    this.transcoder = new VideoTranscoder();
    this.trimmer = new VideoTrimmer();
    this.frameExtractor = new VideoFrameExtractor();
  }

  /**
   * 批量处理视频
   */
  async process(request: VideoBatchRequest): Promise<VideoBatchResult> {
    logger.info('Starting batch video processing', {
      fileCount: request.files.length,
      operation: request.operation,
    });

    const results: VideoBatchResult['results'] = [];
    let successful = 0;
    let failed = 0;

    for (const file of request.files) {
      try {
        logger.info(`Processing file: ${file}`);

        let output: string | undefined;

        switch (request.operation) {
          case 'convert': {
            const convertRequest: VideoConvertRequest = {
              ...(request.params as VideoConvertRequest),
              inputPath: file,
            };
            output = await this.transcoder.convert(convertRequest);
            break;
          }
          case 'trim': {
            const trimRequest: VideoTrimRequest = {
              ...(request.params as VideoTrimRequest),
              inputPath: file,
            };
            output = await this.trimmer.trim(trimRequest);
            break;
          }
          case 'extractFrames': {
            const extractRequest: VideoFrameExtractRequest = {
              ...(request.params as VideoFrameExtractRequest),
              inputPath: file,
            };
            const result = await this.frameExtractor.extractFrames(extractRequest);
            output = result.outputDir;
            break;
          }
        }

        results.push({
          file,
          success: true,
          output,
        });

        successful++;
      } catch (error) {
        logger.error(`Failed to process file: ${file}`, { error });

        results.push({
          file,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });

        failed++;
      }
    }

    logger.info('Batch video processing completed', { successful, failed });

    return {
      successful,
      failed,
      results,
    };
  }
}
