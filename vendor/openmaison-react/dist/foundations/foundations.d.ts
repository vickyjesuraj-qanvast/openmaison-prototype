export interface TokenInfo {
    /** CSS custom property, e.g. --om-color-primary-default */
    varName: string;
    /** name without the --om- prefix */
    name: string;
}
/** The exact Figma variable/style name for a CSS custom property. */
export declare const figmaName: (varName: string) => string | undefined;
export declare const tokens: (prefix: string) => TokenInfo[];
/** Live value of a custom property under the current theme. */
export declare const readToken: (varName: string) => string;
/** Group primitive/semantic color tokens by their family segment. */
export declare const groupBy: (list: TokenInfo[], segment: number) => Map<string, TokenInfo[]>;
