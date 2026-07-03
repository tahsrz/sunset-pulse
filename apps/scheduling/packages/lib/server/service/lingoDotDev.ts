import { LINGO_DOT_DEV_API_KEY } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { createClient } from "@lingo.dev/sdk";

export class LingoDotDevService {
  private static engine = LINGO_DOT_DEV_API_KEY
    ? createClient({
        apiKey: LINGO_DOT_DEV_API_KEY,
      })
    : null;

  /**
   * Localizes text from one language to another
   * @param text The text to localize
   * @param sourceLocale The source language locale
   * @param targetLocale The target language locale
   * @returns The localized text
   */
  static async localizeText(
    text: string,
    sourceLocale: string,
    targetLocale: string
  ): Promise<string | null> {
    if (!text?.trim()) {
      return null;
    }

    if (!LingoDotDevService.engine) {
      logger.warn("LingoDotDevService.localizeText() skipped: LINGO_DOT_DEV_API_KEY is not set");
      return null;
    }

    try {
      const result = await LingoDotDevService.engine.localize({
        sourceLocale,
        targetLocale,
        data: { text },
      });

      return typeof result.data.text === "string" ? result.data.text : null;
    } catch (error) {
      logger.error(`LingoDotDevEngine.localizeText() failed for targetLocale: ${targetLocale} - ${error}`);
      return null;
    }
  }

  /**
   * Localize a text string to multiple target locales
   * @param text The text to localize
   * @param sourceLocale The source language locale
   * @param targetLocales Array of the target language locales
   * @returns The localized texts
   */
  static async batchLocalizeText(
    text: string,
    sourceLocale: string,
    targetLocales: string[]
  ): Promise<string[]> {
    if (!LingoDotDevService.engine) {
      logger.warn("LingoDotDevService.batchLocalizeText() skipped: LINGO_DOT_DEV_API_KEY is not set");
      return [];
    }

    try {
      return await Promise.all(
        targetLocales.map(async (targetLocale) => {
          const result = await LingoDotDevService.engine!.localize({
            sourceLocale,
            targetLocale,
            data: { text },
          });
          return typeof result.data.text === "string" ? result.data.text : text;
        })
      );
    } catch (error) {
      logger.error(`LingoDotDevEngine.batchLocalizeText() failed: ${error}`);
      return [];
    }
  }

  /**
   * Localizes an array of texts from one language to another
   * @param texts Array of texts to localize
   * @param sourceLocale The source language locale
   * @param targetLocale The target language locale
   * @returns The localized texts array
   */
  static async localizeTexts(texts: string[], sourceLocale: string, targetLocale: string): Promise<string[]> {
    if (!texts.length) {
      return texts;
    }

    if (!LingoDotDevService.engine) {
      logger.warn("LingoDotDevService.localizeTexts() skipped: LINGO_DOT_DEV_API_KEY is not set");
      return texts;
    }

    try {
      const data = Object.fromEntries(texts.map((text, index) => [`text_${index}`, text.trim()]));
      const result = await LingoDotDevService.engine.localize({ sourceLocale, targetLocale, data });

      return texts.map((text, index) => {
        const localized = result.data[`text_${index}`];
        return typeof localized === "string" ? localized : text;
      });
    } catch (error) {
      logger.error(`LingoDotDevEngine.localizeTexts() failed: ${error}`);
      return texts;
    }
  }
}
