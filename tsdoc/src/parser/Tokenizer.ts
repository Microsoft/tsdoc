import { TextRange } from './TextRange';

/**
 * Distinguishes different types of Token objects.
 */
export enum TokenKind {
  /**
   * A token representing the end of the input.  The Token.range will be an empty range
   * at the end of the provided input.
   */
  EndOfInput,

  /**
   * A token representing a virtual newline.
   * The Token.range will be an empty range, because the actual newline character may
   * be noncontiguous due to the doc comment delimiter trimming.
   */
  Newline,

  /**
   * A token representing one or more spaces and tabs (but not newlines or end of input).
   */
  Spacing,

  /**
   * A token representing one or more ASCII letters and numbers.
   */
  AsciiWord,

  /**
   * A single ASCII character that behaves like punctuation, e.g. doesn't need whitespace
   * around it when adjacent to a letter.  The Token.range will always be a string of length 1.
   */
  OtherPunctuation,

  /**
   * A token representing a sequence of non-ASCII printable characters that are not punctuation.
   */
  Other,

  /**
   * The backslash character `\`.
   * The Token.range will always be a string of length 1.
   */
  Backslash,

  /**
   * The less-than character `<`.
   * The Token.range will always be a string of length 1.
   */
  LessThan,

  /**
   * The greater-than character `>`.
   * The Token.range will always be a string of length 1.
   */
  GreaterThan,

  /**
   * The equals character `=`.
   * The Token.range will always be a string of length 1.
   */
  Equals,

  /**
   * The single-quote character `'`.
   * The Token.range will always be a string of length 1.
   */
  SingleQuote,

  /**
   * The double-quote character `"`.
   * The Token.range will always be a string of length 1.
   */
  DoubleQuote,

  /**
   * The slash character `/`.
   * The Token.range will always be a string of length 1.
   */
  Slash
}

/**
 * Represents a contiguous range of characters extracted from one of the doc comment lines
 * being processed by the Tokenizer.  There is a token representing a newline, but otherwise
 * a single token cannot span multiple lines.
 */
export class Token {
  /**
   * The kind of token
   */
  public readonly kind: TokenKind;
  /**
   * The contiguous input range corresponding to the token.  This range will never
   * contain a newline character.
   */
  public readonly range: TextRange;

  /**
   * The doc comment "line" that this Token was extracted from.
   */
  public readonly line: TextRange;

  public constructor(kind: TokenKind, range: TextRange, line: TextRange) {
    this.kind = kind;
    this.range = range;
    this.line = line;
  }

  public toString(): string {
    return this.range.toString();
  }
}

export class Tokenizer {
  private static readonly _commonMarkPunctuationCharacters: string
    = '!"#$%&\'()*+,\-.\/:;<=>?@[\\]^_`{|}~';
  private static readonly _wordCharacters: string
    = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  private static _charCodeMap: { [charCode: number]: TokenKind | undefined };
  private static _punctuationTokens: { [tokenKind: number]: boolean };

  /**
   * Given a list of input lines, this returns an array of extracted tokens.
   */
  public static readTokens(lines: TextRange[]): Token[] {
    Tokenizer._ensureInitialized();

    const tokens: Token[] = [];

    let lastLine: TextRange | undefined = undefined;

    for (const line of lines) {
      Tokenizer._pushTokensForLine(tokens, line);
      lastLine = line;
    }

    if (lastLine) {
      tokens.push(new Token(TokenKind.EndOfInput,
        lastLine.getNewRange(lastLine.end, lastLine.end),
        lastLine));
    } else {
      tokens.push(new Token(TokenKind.EndOfInput,
        TextRange.empty,
        TextRange.empty));
    }

    return tokens;
  }

  /**
   * Returns true if the token is a CommonMark punctuation character.
   * These are basically all the ASCII punctuation characters.
   */
  public static isPunctuation(tokenKind: TokenKind): boolean {
    Tokenizer._ensureInitialized();
    return Tokenizer._punctuationTokens[tokenKind] || false;
  }

  private static _pushTokensForLine(tokens: Token[], line: TextRange): void {
    const buffer: string = line.buffer;
    const end: number = line.end;

    let bufferIndex: number = line.pos;
    let tokenKind: TokenKind | undefined = undefined;
    let tokenPos: number = bufferIndex;

    while (bufferIndex < end) {
      // Read a character and determine its kind
      const charCode: number = buffer.charCodeAt(bufferIndex);
      let characterKind: TokenKind | undefined = Tokenizer._charCodeMap[charCode];
      if (characterKind === undefined) {
        characterKind = TokenKind.Other;
      }

      // Can we append to an existing token?  Yes if:
      // 1. There is an existing token, AND
      // 2. It is the same kind of token, AND
      // 3. It's not punctuation (which is always one character)
      if (tokenKind !== undefined
        && characterKind === tokenKind
        && tokenKind !== TokenKind.OtherPunctuation) {
        // yes, append
      } else {
        // Is there a previous completed token to push?
        if (tokenKind !== undefined) {
          tokens.push(new Token(tokenKind, line.getNewRange(tokenPos, bufferIndex), line));
        }

        tokenPos = bufferIndex;
        tokenKind = characterKind;
      }

      ++bufferIndex;
    }

    // Is there a previous completed token to push?
    if (tokenKind !== undefined) {
      tokens.push(new Token(tokenKind, line.getNewRange(tokenPos, bufferIndex), line));
    }

    tokens.push(new Token(TokenKind.Newline, line.getNewRange(line.end, line.end), line));
  }

  private static _ensureInitialized(): void {
    if (Tokenizer._charCodeMap) {
      return;
    }

    Tokenizer._charCodeMap = {};
    Tokenizer._punctuationTokens = {};

    // All Markdown punctuation characters
    const punctuation: string = Tokenizer._commonMarkPunctuationCharacters;
    for (let i: number = 0; i < punctuation.length; ++i) {
      const charCode: number = punctuation.charCodeAt(i);
      Tokenizer._charCodeMap[charCode] = TokenKind.OtherPunctuation;
    }

    // Special symbols
    const specialMap: { [character: string]: TokenKind } = {
      '\\' : TokenKind.Backslash,
      '<' : TokenKind.LessThan,
      '>' : TokenKind.GreaterThan,
      '=' : TokenKind.Equals,
      '\'' : TokenKind.SingleQuote,
      '"' : TokenKind.DoubleQuote,
      '/' : TokenKind.Slash
    };
    for (const key of Object.getOwnPropertyNames(specialMap)) {
      Tokenizer._charCodeMap[key.charCodeAt(0)] = specialMap[key];
      Tokenizer._punctuationTokens[specialMap[key]] = true;
    }

    Tokenizer._punctuationTokens[TokenKind.OtherPunctuation] = true;

    const word: string = Tokenizer._wordCharacters;
    for (let i: number = 0; i < word.length; ++i) {
      const charCode: number = word.charCodeAt(i);
      Tokenizer._charCodeMap[charCode] = TokenKind.AsciiWord;
    }
    Tokenizer._charCodeMap[' '.charCodeAt(0)] = TokenKind.Spacing;
    Tokenizer._charCodeMap['\t'.charCodeAt(0)] = TokenKind.Spacing;
  }
}