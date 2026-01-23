declare module 'fit-file-parser' {
  interface FitParserOptions {
    force?: boolean;
    speedUnit?: 'km/h' | 'm/s' | 'mph';
    lengthUnit?: 'm' | 'km' | 'mi';
    temperatureUnit?: 'celsius' | 'fahrenheit' | 'kelvin';
    elapsedRecordField?: boolean;
    mode?: 'list' | 'cascade' | 'both';
  }

  type FitParserCallback = (
    error: Error | null,
    data: Record<string, unknown>
  ) => void;

  class FitParser {
    constructor(options?: FitParserOptions);
    parse(content: ArrayBuffer, callback: FitParserCallback): void;
  }

  export default FitParser;
}
