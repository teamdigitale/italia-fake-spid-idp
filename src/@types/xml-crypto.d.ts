declare module "xml-crypto" {
  export class SignedXml {
    addReference(xpath: string, transforms: string[], digest: string): void;
    computeSignature(xml: string, options: undefined | {}): void;
    getSignedXml(): string;
    public signingKey: string | Buffer;
  }
}
