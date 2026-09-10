/* word-extractor ships no types. Only the surface we use is declared. */
declare module "word-extractor" {
  class Document {
    getBody(): string;
    getFootnotes(): string;
    getHeaders(): string;
  }
  export default class WordExtractor {
    extract(input: Buffer | string): Promise<Document>;
  }
}
